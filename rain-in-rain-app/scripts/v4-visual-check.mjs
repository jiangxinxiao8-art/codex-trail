import {localServer} from './v4-harness.mjs';
import { chromium,expect } from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-results/v4',{recursive:true});
const server=await localServer();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)console.log('HTTP ERROR',r.status(),r.url());});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(server.url+'/?inspect=1');await expect(page.locator('#stage')).toHaveAttribute('data-ready','true',{timeout:30000});await page.waitForTimeout(1600);await page.screenshot({path:'test-results/v4/title.png'});
 await page.click('#mouse-start');await expect(page.locator('#intro')).toBeHidden({timeout:30000});await page.waitForTimeout(1300);await page.screenshot({path:'test-results/v4/street.png'});
 console.log(JSON.stringify(await page.evaluate(()=>window.__rainV4.inspect()),null,2));
 await page.click('#view-toggle');await page.waitForTimeout(2400);await page.screenshot({path:'test-results/v4/orbit.png'});
 await writeFile('test-results/v4/initial-errors.json',JSON.stringify(errors,null,2));expect(errors).toEqual([]);
}finally{await browser.close();await server.close();}
