import { defineConfig } from 'vite';
import { replayTransaction } from './api/replay.js';
export default defineConfig({
  server:{port:4173,strictPort:true},
  build:{chunkSizeWarningLimit:650},
  plugins:[{name:'local-replay-api',configureServer(server){server.middlewares.use('/api/replay',async(req,res)=>{
    if(req.method!=='POST'){res.writeHead(405,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Use POST.'}));}
    let text='';
    try{for await(const part of req){text+=part;if(text.length>3000)throw new Error('Request too large.');}const r=await replayTransaction(JSON.parse(text));res.writeHead(r.status??200,{'Content-Type':'application/json'});res.end(JSON.stringify(r));}
    catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
  });}}]
});
