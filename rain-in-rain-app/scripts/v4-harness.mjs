import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
export async function localServer(){
 if(process.env.BASE_URL)return{url:process.env.BASE_URL.replace(/\/$/,''),close:async()=>{}};
 const port=process.env.TEST_PORT||'5184',url='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(process.env.V4_PRODUCTION==='1'?['preview']:[]),'--host','127.0.0.1','--port',port,'--strictPort'],{stdio:['ignore','pipe','pipe']});
 let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
 const close=async()=>{if(server.exitCode===null){server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('exit',r)),delay(1500)]);}};
 try{for(let i=0;i<150;i++){if(server.exitCode!==null)throw new Error(output);try{const r=await fetch(url);if(r.ok)return{url,close};}catch{}await delay(100);}throw new Error('Vite 未能启动：'+output);}catch(e){await close();throw e;}
}
