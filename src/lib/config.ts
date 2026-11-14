// Defaults point at the live testnet deployment, so a fresh clone (or a host
// without env vars) works as-is. Set VITE_CONTRACT_ID to use another contract.
export const CONTRACT_ID: string = (import.meta.env.VITE_CONTRACT_ID || 'nearlimit.testnet').trim()
export const RPC_URL: string = import.meta.env.VITE_RPC_URL || 'https://test.rpc.fastnear.com'
export const NETWORK_ID = 'testnet'
export const EXPLORER = 'https://testnet.nearblocks.io'
export const DEMO = {
  coffee: import.meta.env.VITE_DEMO_COFFEE || 'coffee.testnet',
  hosting: import.meta.env.VITE_DEMO_HOSTING || 'host.testnet',
  drain: 'drain.testnet',
  unknown: 'totally-legit-vendor.testnet',
}
export const AGENT_GAS_ALLOWANCE_NEAR = '0.25'
export const explorerTx = (hash: string) => `${EXPLORER}/txns/${hash}`
export const explorerAccount = (id: string) => `${EXPLORER}/address/${id}`
/** Vault whose real testnet activity the home page shows. Empty hides the feed. */
export const DEMO_OWNER: string = (import.meta.env.VITE_DEMO_OWNER ?? 'clearglove8618.testnet').trim()
export const REPO_URL = 'https://github.com/Hello-Vnt/NearLimit'
export const X_URL = 'https://x.com/NearLimitApp'
