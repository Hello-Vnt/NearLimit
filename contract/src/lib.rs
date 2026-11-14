//! NearLimit: a spending firewall for AI agents on NEAR.
//!
//! An owner deposits NEAR into a vault and registers agents by public key.
//! Each agent holds a NEAR function-call access key on the owner's account that
//! can only call `request_transfer` on this contract. Every request is checked
//! against the owner's policy and is Approved (paid), Pending (queued for the
//! owner) or Blocked (logged with a reason).

use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json};
use near_sdk::store::LookupMap;
use near_sdk::{
    env, near, require, AccountId, Gas, NearToken, Promise, PromiseOrValue, PublicKey,
};

const MIN_VAULT_DEPOSIT: u128 = 500_000_000_000_000_000_000_000; // 0.5 NEAR
const DAY_MS: u64 = 86_400_000;
const MAX_AGENTS: usize = 20;
const MAX_PENDING: usize = 50;
const MAX_LIST: usize = 50;
const MAX_NAME: usize = 40;
const MAX_MEMO: usize = 280;
const MAX_PAGE: u64 = 100;
const CALLBACK_GAS: Gas = Gas::from_tgas(10);

pub const STATUS_APPROVED: &str = "approved";
pub const STATUS_PENDING: &str = "pending";
pub const STATUS_BLOCKED: &str = "blocked";

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Policy {
    /// Hard cap per request. Anything above is Blocked.
    pub per_tx_limit: U128,
    /// Cap per UTC day. Going over sends the request to the owner.
    pub daily_limit: U128,
    /// Requests above this amount need the owner's approval.
    pub approval_threshold: U128,
    /// When true, receivers outside `allowlist` need the owner's approval.
    pub allowlist_only: bool,
    pub allowlist: Vec<AccountId>,
    pub blocklist: Vec<AccountId>,
    pub expires_at_ms: Option<u64>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Agent {
    pub public_key: PublicKey,
    pub name: String,
    pub policy: Policy,
    pub active: bool,
    pub spent_today: U128,
    pub day_index: u64,
    pub created_at_ms: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct PendingRequest {
    pub id: u64,
    pub agent_key: PublicKey,
    pub agent_name: String,
    pub receiver_id: AccountId,
    pub amount: U128,
    pub memo: String,
    pub reason: String,
    pub created_at_ms: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Vault {
    pub balance: U128,
    pub paused: bool,
    pub agents: Vec<Agent>,
    pub pending: Vec<PendingRequest>,
    pub next_request_id: u64,
    pub activity_count: u64,
    pub total_sent: U128,
    pub total_blocked: U128,
    pub created_at_ms: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Activity {
    pub id: u64,
    pub timestamp_ms: u64,
    /// Same as the NEP-297 event name, e.g. `transfer_blocked`.
    pub kind: String,
    pub agent_key: Option<PublicKey>,
    pub agent_name: String,
    pub receiver_id: Option<AccountId>,
    pub amount: U128,
    pub memo: String,
    pub reason: String,
    pub request_id: Option<u64>,
    /// sha256 of the AI explanation the owner saw when approving.
    pub note_hash: Option<String>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct TransferResult {
    /// `approved`, `pending` or `blocked`.
    pub status: String,
    pub reason: String,
    pub request_id: Option<u64>,
    pub activity_id: u64,
}

#[near(contract_state)]
pub struct NearLimit {
    vaults: LookupMap<AccountId, Vault>,
    activity: LookupMap<(AccountId, u64), Activity>,
}

impl Default for NearLimit {
    fn default() -> Self {
        Self {
            vaults: LookupMap::new(b"v".to_vec()),
            activity: LookupMap::new(b"a".to_vec()),
        }
    }
}

fn now_ms() -> u64 {
    env::block_timestamp() / 1_000_000
}

fn validate_policy(p: &Policy) {
    require!(p.per_tx_limit.0 > 0, "per_tx_limit must be greater than 0");
    require!(
        p.daily_limit.0 >= p.per_tx_limit.0,
        "daily_limit must be at least per_tx_limit"
    );
    require!(p.allowlist.len() <= MAX_LIST, "allowlist too long");
    require!(p.blocklist.len() <= MAX_LIST, "blocklist too long");
}

fn blank(kind: &str) -> Activity {
    Activity {
        id: 0,
        timestamp_ms: 0,
        kind: kind.to_string(),
        agent_key: None,
        agent_name: String::new(),
        receiver_id: None,
        amount: U128(0),
        memo: String::new(),
        reason: String::new(),
        request_id: None,
        note_hash: None,
    }
}

impl NearLimit {
    fn vault_of(&self, owner: &AccountId) -> Vault {
        self.vaults
            .get(owner)
            .cloned()
            .unwrap_or_else(|| env::panic_str("No vault for this account. Call deposit() first."))
    }

    fn save(&mut self, owner: &AccountId, vault: Vault) {
        self.vaults.insert(owner.clone(), vault);
    }

    /// Appends to the owner's activity log and emits the matching NEP-297 event.
    fn record(&mut self, owner: &AccountId, vault: &mut Vault, mut a: Activity) -> u64 {
        a.id = vault.activity_count;
        a.timestamp_ms = now_ms();
        vault.activity_count += 1;

        let mut data = serde_json::to_value(&a).unwrap_or_else(|_| json!({}));
        data["owner_id"] = json!(owner);
        let event = json!({
            "standard": "nearlimit",
            "version": "1.0.0",
            "event": a.kind,
            "data": [data],
        });
        env::log_str(&format!("EVENT_JSON:{}", event));

        let id = a.id;
        self.activity.insert((owner.clone(), id), a);
        id
    }

    fn agent_index(vault: &Vault, key: &PublicKey) -> usize {
        vault
            .agents
            .iter()
            .position(|a| &a.public_key == key)
            .unwrap_or_else(|| env::panic_str("Agent key is not registered in this vault"))
    }

    fn pay(
        &self,
        owner: &AccountId,
        receiver: &AccountId,
        amount: u128,
        agent_key: Option<PublicKey>,
        activity_id: u64,
    ) -> Promise {
        Promise::new(receiver.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(CALLBACK_GAS)
                    .on_transfer(owner.clone(), agent_key, U128(amount), activity_id),
            )
    }
}

#[near]
impl NearLimit {
    // ---------------------------------------------------------------- owner

    /// Adds NEAR to the caller's vault. The first deposit creates the vault.
    #[payable]
    pub fn deposit(&mut self) {
        let owner = env::predecessor_account_id();
        let amount = env::attached_deposit().as_yoctonear();
        require!(amount > 0, "Attach some NEAR to deposit");

        let mut vault = match self.vaults.get(&owner) {
            Some(v) => v.clone(),
            None => {
                require!(
                    amount >= MIN_VAULT_DEPOSIT,
                    "The first deposit must be at least 0.5 NEAR"
                );
                Vault {
                    balance: U128(0),
                    paused: false,
                    agents: vec![],
                    pending: vec![],
                    next_request_id: 0,
                    activity_count: 0,
                    total_sent: U128(0),
                    total_blocked: U128(0),
                    created_at_ms: now_ms(),
                }
            }
        };
        vault.balance.0 += amount;
        let mut a = blank("deposit");
        a.amount = U128(amount);
        self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
    }

    pub fn withdraw(&mut self, amount: U128) -> Promise {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        require!(amount.0 > 0, "Amount must be greater than 0");
        require!(vault.balance.0 >= amount.0, "Not enough balance in the vault");
        vault.balance.0 -= amount.0;
        let mut a = blank("withdraw");
        a.amount = amount;
        self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
        Promise::new(owner).transfer(NearToken::from_yoctonear(amount.0))
    }

    pub fn add_agent(&mut self, public_key: PublicKey, name: String, policy: Policy) {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        require!(!name.is_empty() && name.len() <= MAX_NAME, "Name must be 1-40 characters");
        require!(vault.agents.len() < MAX_AGENTS, "Too many agents in this vault");
        require!(
            !vault.agents.iter().any(|a| a.public_key == public_key),
            "This key is already registered"
        );
        validate_policy(&policy);

        let now = now_ms();
        vault.agents.push(Agent {
            public_key: public_key.clone(),
            name: name.clone(),
            policy,
            active: true,
            spent_today: U128(0),
            day_index: now / DAY_MS,
            created_at_ms: now,
        });
        let mut a = blank("agent_added");
        a.agent_key = Some(public_key);
        a.agent_name = name;
        self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
    }

    pub fn update_policy(&mut self, public_key: PublicKey, policy: Policy) {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        validate_policy(&policy);
        let i = Self::agent_index(&vault, &public_key);
        vault.agents[i].policy = policy;
        let mut a = blank("policy_updated");
        a.agent_key = Some(public_key);
        a.agent_name = vault.agents[i].name.clone();
        self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
    }

    /// Freeze (`false`) or unfreeze (`true`) one agent.
    pub fn set_agent_active(&mut self, public_key: PublicKey, active: bool) {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        let i = Self::agent_index(&vault, &public_key);
        vault.agents[i].active = active;
        let mut a = blank(if active { "agent_unfrozen" } else { "agent_frozen" });
        a.agent_key = Some(public_key);
        a.agent_name = vault.agents[i].name.clone();
        self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
    }

    /// Removes the agent and rejects its queued requests. The owner should also
    /// delete the access key from their account (DeleteKey).
    pub fn remove_agent(&mut self, public_key: PublicKey) {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        let i = Self::agent_index(&vault, &public_key);
        let agent = vault.agents.remove(i);
        vault.pending.retain(|p| p.agent_key != public_key);
        let mut a = blank("agent_removed");
        a.agent_key = Some(public_key);
        a.agent_name = agent.name;
        self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
    }

    /// Vault-wide kill switch.
    pub fn set_paused(&mut self, paused: bool) {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        vault.paused = paused;
        self.record(
            &owner,
            &mut vault,
            blank(if paused { "vault_paused" } else { "vault_unpaused" }),
        );
        self.save(&owner, vault);
    }

    /// Owner approves a queued request. The balance is checked again here.
    pub fn approve(&mut self, request_id: u64, ai_note_hash: Option<String>) -> Promise {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        let i = vault
            .pending
            .iter()
            .position(|p| p.id == request_id)
            .unwrap_or_else(|| env::panic_str("Request not found"));
        let req = vault.pending[i].clone();
        require!(
            vault.balance.0 >= req.amount.0,
            "Not enough balance in the vault to approve this request"
        );
        if let Some(h) = &ai_note_hash {
            require!(h.len() <= 128, "ai_note_hash too long");
        }
        vault.pending.remove(i);
        vault.balance.0 -= req.amount.0;
        vault.total_sent.0 += req.amount.0;

        // Count it against the agent's day, if the agent still exists.
        let today = now_ms() / DAY_MS;
        if let Some(agent) = vault.agents.iter_mut().find(|a| a.public_key == req.agent_key) {
            if agent.day_index != today {
                agent.day_index = today;
                agent.spent_today = U128(0);
            }
            agent.spent_today.0 += req.amount.0;
        }

        let mut a = blank("request_approved");
        a.agent_key = Some(req.agent_key.clone());
        a.agent_name = req.agent_name.clone();
        a.receiver_id = Some(req.receiver_id.clone());
        a.amount = req.amount;
        a.memo = req.memo.clone();
        a.request_id = Some(req.id);
        a.note_hash = ai_note_hash;
        let activity_id = self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
        self.pay(&owner, &req.receiver_id, req.amount.0, Some(req.agent_key), activity_id)
    }

    pub fn reject(&mut self, request_id: u64, reason: String) {
        let owner = env::predecessor_account_id();
        let mut vault = self.vault_of(&owner);
        require!(reason.len() <= MAX_MEMO, "Reason too long");
        let i = vault
            .pending
            .iter()
            .position(|p| p.id == request_id)
            .unwrap_or_else(|| env::panic_str("Request not found"));
        let req = vault.pending.remove(i);
        vault.total_blocked.0 += req.amount.0;
        let mut a = blank("request_rejected");
        a.agent_key = Some(req.agent_key);
        a.agent_name = req.agent_name;
        a.receiver_id = Some(req.receiver_id);
        a.amount = req.amount;
        a.memo = req.memo;
        a.reason = reason;
        a.request_id = Some(req.id);
        self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
    }

    // ---------------------------------------------------------------- agent

    /// Called with the agent's function-call access key, which lives on the
    /// owner's account. So the owner is the predecessor and the agent is
    /// identified by the public key that signed the transaction.
    ///
    /// Blocked requests do not panic: they return a result and are logged, so
    /// the attempt stays on-chain.
    pub fn request_transfer(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
    ) -> PromiseOrValue<TransferResult> {
        let owner = env::predecessor_account_id();
        let key = env::signer_account_pk();
        let mut vault = self.vault_of(&owner);
        let i = Self::agent_index(&vault, &key);
        let memo = memo.unwrap_or_default();
        require!(memo.len() <= MAX_MEMO, "Memo too long (max 280 bytes)");
        require!(amount.0 > 0, "Amount must be greater than 0");

        let now = now_ms();
        let today = now / DAY_MS;
        if vault.agents[i].day_index != today {
            vault.agents[i].day_index = today;
            vault.agents[i].spent_today = U128(0);
        }
        let agent = vault.agents[i].clone();
        let p = &agent.policy;

        let mut a = blank("");
        a.agent_key = Some(key.clone());
        a.agent_name = agent.name.clone();
        a.receiver_id = Some(receiver_id.clone());
        a.amount = amount;
        a.memo = memo.clone();

        // 1-3. Hard stops.
        let blocked: Option<&str> = if vault.paused {
            Some("vault is paused")
        } else if !agent.active {
            Some("agent is frozen")
        } else if p.expires_at_ms.map_or(false, |t| now >= t) {
            Some("agent key has expired")
        } else if p.blocklist.contains(&receiver_id) {
            Some("receiver is on the blocklist")
        } else if amount.0 > p.per_tx_limit.0 {
            Some("over per-transaction limit")
        } else if amount.0 > vault.balance.0 {
            Some("not enough balance in the vault")
        } else {
            None
        };
        if let Some(reason) = blocked {
            vault.total_blocked.0 += amount.0;
            a.kind = "transfer_blocked".to_string();
            a.reason = reason.to_string();
            let activity_id = self.record(&owner, &mut vault, a);
            self.save(&owner, vault);
            return PromiseOrValue::Value(TransferResult {
                status: STATUS_BLOCKED.to_string(),
                reason: reason.to_string(),
                request_id: None,
                activity_id,
            });
        }

        // 4. Needs the owner.
        let needs_owner: Option<&str> = if agent.spent_today.0 + amount.0 > p.daily_limit.0 {
            Some("over daily limit")
        } else if p.allowlist_only && !p.allowlist.contains(&receiver_id) {
            Some("receiver is not on the allowlist")
        } else if amount.0 > p.approval_threshold.0 {
            Some("over approval threshold")
        } else {
            None
        };
        if let Some(reason) = needs_owner {
            if vault.pending.len() >= MAX_PENDING {
                let reason = "pending queue is full";
                vault.total_blocked.0 += amount.0;
                a.kind = "transfer_blocked".to_string();
                a.reason = reason.to_string();
                let activity_id = self.record(&owner, &mut vault, a);
                self.save(&owner, vault);
                return PromiseOrValue::Value(TransferResult {
                    status: STATUS_BLOCKED.to_string(),
                    reason: reason.to_string(),
                    request_id: None,
                    activity_id,
                });
            }
            let request_id = vault.next_request_id;
            vault.next_request_id += 1;
            vault.pending.push(PendingRequest {
                id: request_id,
                agent_key: key,
                agent_name: agent.name.clone(),
                receiver_id,
                amount,
                memo,
                reason: reason.to_string(),
                created_at_ms: now,
            });
            a.kind = "transfer_pending".to_string();
            a.reason = reason.to_string();
            a.request_id = Some(request_id);
            let activity_id = self.record(&owner, &mut vault, a);
            self.save(&owner, vault);
            return PromiseOrValue::Value(TransferResult {
                status: STATUS_PENDING.to_string(),
                reason: reason.to_string(),
                request_id: Some(request_id),
                activity_id,
            });
        }

        // 5. Within policy: pay now.
        vault.balance.0 -= amount.0;
        vault.total_sent.0 += amount.0;
        vault.agents[i].spent_today.0 += amount.0;
        a.kind = "transfer_approved".to_string();
        let activity_id = self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
        PromiseOrValue::Promise(self.pay(&owner, &receiver_id, amount.0, Some(key), activity_id))
    }

    /// Runs after the transfer. If it failed (for example the receiver account
    /// does not exist) the amount goes back into the vault.
    #[private]
    pub fn on_transfer(
        &mut self,
        owner: AccountId,
        agent_key: Option<PublicKey>,
        amount: U128,
        activity_id: u64,
    ) -> TransferResult {
        if near_sdk::is_promise_success() {
            return TransferResult {
                status: STATUS_APPROVED.to_string(),
                reason: String::new(),
                request_id: None,
                activity_id,
            };
        }
        let mut vault = self.vault_of(&owner);
        vault.balance.0 += amount.0;
        vault.total_sent.0 = vault.total_sent.0.saturating_sub(amount.0);
        let today = now_ms() / DAY_MS;
        let mut name = String::new();
        if let Some(key) = &agent_key {
            if let Some(agent) = vault.agents.iter_mut().find(|x| &x.public_key == key) {
                name = agent.name.clone();
                if agent.day_index == today {
                    agent.spent_today.0 = agent.spent_today.0.saturating_sub(amount.0);
                }
            }
        }
        let reason = "transfer failed, amount returned to the vault";
        let mut a = blank("transfer_failed");
        a.agent_key = agent_key;
        a.agent_name = name;
        a.amount = amount;
        a.reason = reason.to_string();
        a.receiver_id = self
            .activity
            .get(&(owner.clone(), activity_id))
            .and_then(|x| x.receiver_id.clone());
        let id = self.record(&owner, &mut vault, a);
        self.save(&owner, vault);
        TransferResult {
            status: STATUS_BLOCKED.to_string(),
            reason: reason.to_string(),
            request_id: None,
            activity_id: id,
        }
    }

    // ---------------------------------------------------------------- views

    pub fn get_vault(&self, owner: AccountId) -> Option<Vault> {
        self.vaults.get(&owner).cloned()
    }

    pub fn get_agents(&self, owner: AccountId) -> Vec<Agent> {
        self.vaults.get(&owner).map(|v| v.agents.clone()).unwrap_or_default()
    }

    pub fn get_pending(&self, owner: AccountId) -> Vec<PendingRequest> {
        self.vaults.get(&owner).map(|v| v.pending.clone()).unwrap_or_default()
    }

    /// Activity in ascending id order, starting at `from`. `limit` is capped at 100.
    pub fn get_activity(&self, owner: AccountId, from: u64, limit: u64) -> Vec<Activity> {
        let count = self.vaults.get(&owner).map(|v| v.activity_count).unwrap_or(0);
        let end = count.min(from.saturating_add(limit.min(MAX_PAGE)));
        (from..end)
            .filter_map(|id| self.activity.get(&(owner.clone(), id)).cloned())
            .collect()
    }
}

#[cfg(test)]
mod tests;
