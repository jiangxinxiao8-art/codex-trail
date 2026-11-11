import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const vite=fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url));
const child=spawn(process.execPath,[vite,'--host','localhost','--port','5173','--strictPort'],{cwd,stdio:['inherit','pipe','pipe']});
let opened=false;
function output(data){const text=data.toString();process.stdout.write(data);if(!opened&&text.includes('http://localhost:5173')){opened=true;if(process.platform==='win32'){const browser=spawn('cmd.exe',['/d','/c','start','""','http://localhost:5173'],{stdio:'ignore',windowsHide:true});browser.on('error',()=>console.log('请手动在浏览器打开 http://localhost:5173'));}else console.log('浏览器地址：http://localhost:5173');}}
child.stdout.on('data',output);child.stderr.on('data',data=>process.stderr.write(data));child.on('error',error=>{console.error('启动失败：',error.message);process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});process.on('SIGINT',()=>child.kill('SIGINT'));
