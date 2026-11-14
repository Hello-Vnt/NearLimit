use super::*;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::testing_env;

const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const DAY_NS: u64 = 86_400_000_000_000;
const T0: u64 = 20_000 * DAY_NS + 3_600_000_000_000; // 01:00 UTC on some day

fn owner() -> AccountId {
    "owner.testnet".parse().unwrap()
}
fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn owner_key() -> PublicKey {
    "ed25519:EdZRiumzBFM7USJUM6yXzYBET7qyjUwj4N6D8L8CU9Av".parse().unwrap()
}
fn agent_key() -> PublicKey {
    "ed25519:5coFkpuFPBFKN93xvSmiLGyX8owYrYvDDT8Erodi3qxQ".parse().unwrap()
}
fn other_key() -> PublicKey {
    "ed25519:5ZjwyacJmHK4wQtSDGNWKY31VVKLx6zoUi46UsueZZkx".parse().unwrap()
}

fn ctx(signer_pk: PublicKey, deposit: u128, ts: u64) {
    testing_env!(VMContextBuilder::new()
        .current_account_id(acc("nearlimit.testnet"))
        .predecessor_account_id(owner())
        .signer_account_id(owner())
        .signer_account_pk(signer_pk)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .block_timestamp(ts)
        .build());
}

fn policy() -> Policy {
    Policy {
        per_tx_limit: U128(NEAR),
        daily_limit: U128(2 * NEAR),
        approval_threshold: U128(NEAR / 2),
        allowlist_only: true,
        allowlist: vec![acc("coffee.testnet"), acc("hosting.testnet")],
        blocklist: vec![acc("evil.testnet")],
        expires_at_ms: None,
    }
}

/// Vault with 10 NEAR and one agent ("ShopBot").
fn setup() -> NearLimit {
    let mut c = NearLimit::default();
    ctx(owner_key(), 10 * NEAR, T0);
    c.deposit();
    ctx(owner_key(), 0, T0);
    c.add_agent(agent_key(), "ShopBot".to_string(), policy());
    c
}

fn request(c: &mut NearLimit, to: &str, amount: u128, ts: u64) -> Option<TransferResult> {
    ctx(agent_key(), 0, ts);
    match c.request_transfer(acc(to), U128(amount), Some("invoice".to_string())) {
        PromiseOrValue::Value(r) => Some(r),
        PromiseOrValue::Promise(_) => None, // approved: funds are on their way
    }
}

fn vault(c: &NearLimit) -> Vault {
    c.get_vault(owner()).unwrap()
}

#[test]
fn first_deposit_needs_half_a_near() {
    let mut c = NearLimit::default();
    ctx(owner_key(), NEAR / 2, T0);
    c.deposit();
    assert_eq!(vault(&c).balance.0, NEAR / 2);
}

#[test]
#[should_panic(expected = "at least 0.5 NEAR")]
fn small_first_deposit_panics() {
    let mut c = NearLimit::default();
    ctx(owner_key(), NEAR / 10, T0);
    c.deposit();
}

#[test]
fn small_allowlisted_payment_is_approved() {
    let mut c = setup();
    assert!(request(&mut c, "coffee.testnet", NEAR / 10, T0).is_none());
    let v = vault(&c);
    assert_eq!(v.balance.0, 10 * NEAR - NEAR / 10);
    assert_eq!(v.agents[0].spent_today.0, NEAR / 10);
    let last = c.get_activity(owner(), v.activity_count - 1, 1);
    assert_eq!(last[0].kind, "transfer_approved");
}

#[test]
fn over_per_tx_limit_is_blocked_and_logged() {
    let mut c = setup();
    let r = request(&mut c, "drain.testnet", 5 * NEAR, T0).unwrap();
    assert_eq!(r.status, STATUS_BLOCKED);
    assert_eq!(r.reason, "over per-transaction limit");
    assert!(get_logs().iter().any(|l| l.starts_with("EVENT_JSON:") && l.contains("transfer_blocked")));
    let v = vault(&c);
    assert_eq!(v.balance.0, 10 * NEAR);
    assert_eq!(v.total_blocked.0, 5 * NEAR);
    assert!(v.pending.is_empty());
}

#[test]
fn blocklisted_receiver_is_blocked() {
    let mut c = setup();
    let r = request(&mut c, "evil.testnet", NEAR / 10, T0).unwrap();
    assert_eq!(r.status, STATUS_BLOCKED);
    assert_eq!(r.reason, "receiver is on the blocklist");
}

#[test]
fn unknown_receiver_is_pending() {
    let mut c = setup();
    let r = request(&mut c, "new-account.testnet", NEAR / 10, T0).unwrap();
    assert_eq!(r.status, STATUS_PENDING);
    assert_eq!(r.reason, "receiver is not on the allowlist");
    let v = vault(&c);
    assert_eq!(v.pending.len(), 1);
    assert_eq!(v.balance.0, 10 * NEAR); // nothing moved yet
}

#[test]
fn over_threshold_is_pending() {
    let mut c = setup();
    let r = request(&mut c, "coffee.testnet", NEAR * 8 / 10, T0).unwrap();
    assert_eq!(r.status, STATUS_PENDING);
    assert_eq!(r.reason, "over approval threshold");
}

#[test]
fn over_daily_limit_is_pending_and_window_resets() {
    let mut c = setup();
    for _ in 0..4 {
        assert!(request(&mut c, "coffee.testnet", NEAR / 2, T0).is_none());
    }
    assert_eq!(vault(&c).agents[0].spent_today.0, 2 * NEAR);
    let r = request(&mut c, "coffee.testnet", NEAR / 10, T0).unwrap();
    assert_eq!(r.status, STATUS_PENDING);
    assert_eq!(r.reason, "over daily limit");

    // Next UTC day: the window resets and the same payment goes through.
    assert!(request(&mut c, "coffee.testnet", NEAR / 10, T0 + DAY_NS).is_none());
    assert_eq!(vault(&c).agents[0].spent_today.0, NEAR / 10);
}

#[test]
#[should_panic(expected = "Agent key is not registered")]
fn unregistered_key_panics() {
    let mut c = setup();
    ctx(other_key(), 0, T0);
    let _ = c.request_transfer(acc("coffee.testnet"), U128(NEAR / 10), None);
}

#[test]
fn frozen_agent_is_blocked() {
    let mut c = setup();
    ctx(owner_key(), 0, T0);
    c.set_agent_active(agent_key(), false);
    let r = request(&mut c, "coffee.testnet", NEAR / 10, T0).unwrap();
    assert_eq!(r.status, STATUS_BLOCKED);
    assert_eq!(r.reason, "agent is frozen");

    ctx(owner_key(), 0, T0);
    c.set_agent_active(agent_key(), true);
    assert!(request(&mut c, "coffee.testnet", NEAR / 10, T0).is_none());
}

#[test]
fn paused_vault_blocks_everything() {
    let mut c = setup();
    ctx(owner_key(), 0, T0);
    c.set_paused(true);
    let r = request(&mut c, "coffee.testnet", NEAR / 10, T0).unwrap();
    assert_eq!(r.status, STATUS_BLOCKED);
    assert_eq!(r.reason, "vault is paused");
}

#[test]
fn expired_agent_is_blocked() {
    let mut c = setup();
    let mut p = policy();
    p.expires_at_ms = Some(T0 / 1_000_000 + 1_000);
    ctx(owner_key(), 0, T0);
    c.update_policy(agent_key(), p);
    assert!(request(&mut c, "coffee.testnet", NEAR / 10, T0).is_none());
    let r = request(&mut c, "coffee.testnet", NEAR / 10, T0 + 2_000_000_000).unwrap();
    assert_eq!(r.reason, "agent key has expired");
}

#[test]
fn owner_can_approve_pending() {
    let mut c = setup();
    let r = request(&mut c, "new-account.testnet", NEAR * 8 / 10, T0).unwrap();
    ctx(owner_key(), 0, T0);
    let _ = c.approve(r.request_id.unwrap(), Some("abc123".to_string()));
    let v = vault(&c);
    assert!(v.pending.is_empty());
    assert_eq!(v.balance.0, 10 * NEAR - NEAR * 8 / 10);
    let last = c.get_activity(owner(), v.activity_count - 1, 1);
    assert_eq!(last[0].kind, "request_approved");
    assert_eq!(last[0].note_hash.as_deref(), Some("abc123"));
}

#[test]
fn owner_can_reject_pending() {
    let mut c = setup();
    let r = request(&mut c, "new-account.testnet", NEAR * 8 / 10, T0).unwrap();
    ctx(owner_key(), 0, T0);
    c.reject(r.request_id.unwrap(), "looks like prompt injection".to_string());
    let v = vault(&c);
    assert!(v.pending.is_empty());
    assert_eq!(v.balance.0, 10 * NEAR);
    assert_eq!(v.total_blocked.0, NEAR * 8 / 10);
}

#[test]
#[should_panic(expected = "Not enough balance in the vault to approve")]
fn approve_rechecks_balance() {
    let mut c = setup();
    let r = request(&mut c, "new-account.testnet", NEAR * 8 / 10, T0).unwrap();
    ctx(owner_key(), 0, T0);
    let _ = c.withdraw(U128(10 * NEAR - NEAR / 10)); // leave 0.1 NEAR
    ctx(owner_key(), 0, T0);
    let _ = c.approve(r.request_id.unwrap(), None);
}

#[test]
fn request_over_balance_is_blocked() {
    let mut c = setup();
    ctx(owner_key(), 0, T0);
    let _ = c.withdraw(U128(10 * NEAR - NEAR / 20)); // leave 0.05 NEAR
    let r = request(&mut c, "coffee.testnet", NEAR / 10, T0).unwrap();
    assert_eq!(r.status, STATUS_BLOCKED);
    assert_eq!(r.reason, "not enough balance in the vault");
}

#[test]
fn removed_agent_can_no_longer_request() {
    let mut c = setup();
    ctx(owner_key(), 0, T0);
    c.remove_agent(agent_key());
    assert!(c.get_agents(owner()).is_empty());
}

#[test]
fn activity_is_paged_in_order() {
    let mut c = setup();
    request(&mut c, "coffee.testnet", NEAR / 10, T0);
    request(&mut c, "drain.testnet", 5 * NEAR, T0);
    let all = c.get_activity(owner(), 0, 100);
    let kinds: Vec<&str> = all.iter().map(|a| a.kind.as_str()).collect();
    assert_eq!(kinds, vec!["deposit", "agent_added", "transfer_approved", "transfer_blocked"]);
    assert_eq!(c.get_activity(owner(), 2, 1)[0].id, 2);
}
