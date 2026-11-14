export interface Policy {
  per_tx_limit: string
  daily_limit: string
  approval_threshold: string
  allowlist_only: boolean
  allowlist: string[]
  blocklist: string[]
  expires_at_ms: number | null
}
export interface Agent {
  public_key: string
  name: string
  policy: Policy
  active: boolean
  spent_today: string
  day_index: number
  created_at_ms: number
}
export interface PendingRequest {
  id: number
  agent_key: string
  agent_name: string
  receiver_id: string
  amount: string
  memo: string
  reason: string
  created_at_ms: number
}
export interface Vault {
  balance: string
  paused: boolean
  agents: Agent[]
  pending: PendingRequest[]
  next_request_id: number
  activity_count: number
  total_sent: string
  total_blocked: string
  created_at_ms: number
}
export interface Activity {
  id: number
  timestamp_ms: number
  kind: string
  agent_key: string | null
  agent_name: string
  receiver_id: string | null
  amount: string
  memo: string
  reason: string
  request_id: number | null
  note_hash: string | null
}
export interface TransferResult {
  status: 'approved' | 'pending' | 'blocked'
  reason: string
  request_id: number | null
  activity_id: number
}
