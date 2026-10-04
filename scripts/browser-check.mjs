import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
// Browser plugin/skill absent in this session; use development-only Playwright.
const browser=await chromium.launch({channel:process.env.PATCHRIPPLE_BROWSER_CHANNEL||'chrome',headless:true});
const errors=[],network=[];const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
try{
 const url=pathToFileURL(path.resolve(process.env.PATCHRIPPLE_DEMO_PATH||'docs/demo/index.html')).href;await page.goto(url);
 assert.match(await page.title(),/PatchRipple/);assert.equal(await page.locator('h1').textContent(),'See the ripple.');
 assert.equal(await page.locator('#count').textContent(),'4 files shown');
 assert.ok(await page.getByText('SYNTHETIC_DEMO',{exact:true}).isVisible());
 if(process.env.PATCHRIPPLE_VISUAL_DIR){await mkdir(process.env.PATCHRIPPLE_VISUAL_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.PATCHRIPPLE_VISUAL_DIR,'desktop.png'),fullPage:true});}
 await page.getByLabel('Find a file').fill('core.test');assert.equal(await page.locator('#count').textContent(),'1 file shown');
 const button=page.getByRole('button',{name:'src/core.test.ts',exact:true});await button.focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#detail h2').textContent(),'src/core.test.ts');assert.ok(await page.locator('#detail').evaluate(el=>el===document.activeElement));
 assert.match(await page.locator('#detail').textContent(),/Imports the changed core module/);
 await page.getByLabel('Find a file').fill('');await page.getByLabel('Role',{exact:true}).selectOption('changed');assert.equal(await page.locator('#count').textContent(),'1 file shown');
 assert.equal(await page.locator('svg [data-node]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').length),1);
 await page.getByLabel('Role',{exact:true}).selectOption('');await page.getByLabel('Owner',{exact:true}).selectOption('@maintainers');assert.equal(await page.locator('#count').textContent(),'3 files shown');
 await page.getByLabel('Owner',{exact:true}).selectOption('');
 const graphButton=page.getByRole('button',{name:'Inspect src/core.ts',exact:true});await graphButton.focus();await page.keyboard.press('Space');
 assert.equal(await page.locator('#detail h2').textContent(),'src/core.ts');assert.equal(await graphButton.getAttribute('aria-pressed'),'true');
 await page.getByLabel('Find a file').fill('no-such-candidate');assert.equal(await page.locator('#count').textContent(),'0 files shown');assert.ok(await page.locator('#empty').isVisible());
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();assert.equal(await page.locator('#count').textContent(),'4 files shown');
 await page.locator('#detail').focus();await page.keyboard.press('/');assert.ok(await page.getByLabel('Find a file').evaluate(el=>el===document.activeElement));
 await page.setViewportSize({width:320,height:800});await page.reload();
 assert.equal(await page.locator('#count').textContent(),'4 files shown');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(process.env.PATCHRIPPLE_VISUAL_DIR)await page.screenshot({path:path.join(process.env.PATCHRIPPLE_VISUAL_DIR,'mobile.png'),fullPage:true});
 if(process.env.PATCHRIPPLE_EDGE_FIXTURES){
  for(const name of ['empty','large','incomplete']){
   await page.goto(pathToFileURL(path.join(process.env.PATCHRIPPLE_EDGE_FIXTURES,name+'.html')).href);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(name==='empty'){assert.equal(await page.locator('#count').textContent(),'0 files shown');assert.ok(await page.locator('#empty').isVisible());}
   if(name==='large'){assert.equal(await page.locator('#count').textContent(),'85 files shown');assert.equal(await page.locator('svg [data-node]').count(),80);await page.locator('#files>li').last().getByRole('button').click();assert.match(await page.locator('#detail h2').textContent(),/84/);assert.match(await page.locator('.graph-note').textContent(),/First 80 of 85/);}
   if(name==='incomplete'){assert.ok(await page.getByText('Incomplete analysis',{exact:true}).isVisible());assert.equal(await page.locator('.audit').getAttribute('open'),'');assert.match(await page.locator('.audit-body').textContent(),/omitted nodes/);}
  }
 }
 if(!process.env.PATCHRIPPLE_DEMO_PATH){await page.goto(pathToFileURL(path.resolve('docs/index.html')).href);
 assert.match(await page.title(),/repo-local PR impact maps/);assert.ok(await page.getByRole('heading',{name:'Run locally',exact:true}).isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('link',{name:'Offline demo',exact:true}).click();assert.equal(await page.locator('#count').textContent(),'4 files shown');}
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log(JSON.stringify({identity:true,notBlank:true,keyboardSelection:true,graphKeyboardSelection:true,clearFilters:true,searchShortcut:true,search:true,roleFilter:true,ownerFilter:true,edgeFixtures:!!process.env.PATCHRIPPLE_EDGE_FIXTURES,staticDocs:!process.env.PATCHRIPPLE_DEMO_PATH,docsDemoNavigation:!process.env.PATCHRIPPLE_DEMO_PATH,noConsoleErrors:true,noNetworkAssets:true,noMobileOverflow:true,viewports:['1280x900','320x800'],url}));
}finally{await browser.close();}
