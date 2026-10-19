import { parseTransactionReference } from '../src/engine.js';

const CHAINS = {
  ethereum: { id: 1, endpoints: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com'], explorer: 'https://etherscan.io' },
  base: { id: 8453, endpoints: ['https://base-rpc.publicnode.com', 'https://mainnet.base.org'], explorer: 'https://basescan.org' },
  avalanche: { id: 43114, endpoints: ['https://avalanche-c-chain-rpc.publicnode.com', 'https://api.avax.network/ext/bc/C/rpc'], explorer: 'https://snowtrace.io' }
};
async function rpc(endpoint, method, params) {
  const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}), signal:AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error('RPC unavailable');
  const obj = await res.json();
  if (obj.error) throw new Error('RPC returned an error');
  return obj.result;
}
export async function replayTransaction(body) {
  const ref = parseTransactionReference(body.reference, body.chain);
  const config = CHAINS[ref.chain];
  if (!config) throw new Error('Choose Ethereum, Base or Avalanche.');
  for (const endpoint of config.endpoints) {
    try {
      const [id, tx, receipt] = await Promise.all([rpc(endpoint,'eth_chainId',[]), rpc(endpoint,'eth_getTransactionByHash',[ref.hash]), rpc(endpoint,'eth_getTransactionReceipt',[ref.hash])]);
      if (Number(BigInt(id)) !== config.id) continue;
      if (!tx) continue;
      if (tx.hash?.toLowerCase() !== ref.hash.toLowerCase()) throw new Error('RPC transaction hash mismatch');
      if (!tx.blockNumber || !receipt) return {error:'This transaction is pending. Try again after it is included in a block.',status:409};
      if (receipt.transactionHash?.toLowerCase() !== ref.hash.toLowerCase() || receipt.blockHash?.toLowerCase() !== tx.blockHash?.toLowerCase()) continue;
      const block = await rpc(endpoint,'eth_getBlockByHash',[tx.blockHash,false]);
      if (!block?.timestamp || block.hash?.toLowerCase() !== tx.blockHash?.toLowerCase()) continue;
      if ((tx.input?.length ?? 0) > 1000002) return {error:'This transaction exceeds the 500 KB calldata inspection limit.',status:413};
      return { calldata:tx.input ?? '0x', context:{ hash:ref.hash, chain:ref.chain, chainId:config.id, from:tx.from, to:tx.to, blockNumber:Number(BigInt(tx.blockNumber)), blockHash:tx.blockHash, blockTimestamp:Number(BigInt(block.timestamp))*1000, status:receipt.status==='0x1'?'success':'reverted', gasUsed:BigInt(receipt.gasUsed).toString(), explorer:config.explorer+'/tx/'+ref.hash, rpcHost:new URL(endpoint).hostname, fetchedAt:new Date().toISOString() } };
    } catch { /* Try the next fixed, public, read-only RPC. */ }
  }
  return {error:'Transaction could not be retrieved. Check its hash and network, or try again: public RPCs can be rate-limited. You can still inspect its raw calldata locally.',status:502};
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST.'});
  try {
    let body = req.body;
    if (typeof body === 'string') body=JSON.parse(body);
    if (JSON.stringify(body ?? {}).length > 3000) return res.status(413).json({error:'Request too large.'});
    const result=await replayTransaction(body??{});
    return res.status(result.status??200).json(result);
  } catch (e) { return res.status(400).json({error:e.message||'Invalid request.'}); }
}
