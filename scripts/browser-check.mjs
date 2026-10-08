import {chromium,firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdir,readFile} from 'node:fs/promises';
// Browser plugin/skill absent in this session; use development-only Playwright.
const browserName=process.env.PATCHRIPPLE_BROWSER||'chromium';
const browserType={chromium,firefox,webkit}[browserName];if(!browserType)throw new Error('PATCHRIPPLE_BROWSER must be chromium, firefox, or webkit');
const browser=await browserType.launch({...(browserName==='chromium'&&process.env.PATCHRIPPLE_BROWSER_CHANNEL?{channel:process.env.PATCHRIPPLE_BROWSER_CHANNEL}:{}),headless:true});
const errors=[],network=[];const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
try{
 const url=pathToFileURL(path.resolve(process.env.PATCHRIPPLE_DEMO_PATH||'docs/demo/index.html')).href;await page.goto(url);
 assert.match(await page.title(),/PatchRipple/);assert.equal(await page.locator('h1').textContent(),'See the ripple.');
 assert.equal(await page.locator('main').count(),1);for(const label of ['Find a file','Role','Owner','Package group','Revision','Edge kind','Neighborhood depth'])assert.equal(await page.getByLabel(label,{exact:true}).count(),1,'labeled control: '+label);
 assert.equal(await page.locator('#map-svg[role="group"][aria-label]').count(),1);assert.equal(await page.locator('#count[role="status"]').count(),1);assert.equal(await page.locator('#graph-note').getAttribute('aria-live'),'polite');assert.equal(await page.locator('[id]').evaluateAll(nodes=>new Set(nodes.map(n=>n.id)).size),await page.locator('[id]').count());
 assert.equal(await page.locator('#count').textContent(),'4 files shown');
 assert.ok(await page.locator('.warnings').isVisible());assert.match(await page.locator('.warnings').textContent(),/SYNTHETIC_DEMO/);
 await page.locator('.warning-group').first().evaluate(group=>{group.open=false;});await page.getByRole('button',{name:/Analysis warnings/}).click();assert.ok(await page.locator('.warning').first().evaluate(el=>el.closest('details.warning-group')?.open));assert.ok(await page.locator('.warning').first().evaluate(el=>el===document.activeElement));
 if(process.env.PATCHRIPPLE_VISUAL_DIR){await mkdir(process.env.PATCHRIPPLE_VISUAL_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.PATCHRIPPLE_VISUAL_DIR,'desktop.png'),fullPage:true});}
 await page.getByLabel('Find a file').fill('core.test');assert.equal(await page.locator('#count').textContent(),'1 file shown');
 const button=page.getByRole('button',{name:'src/core.test.ts',exact:true});await button.focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#detail h2').textContent(),'src/core.test.ts');assert.ok(await page.locator('#detail').evaluate(el=>el===document.activeElement));
 assert.match(await page.locator('#detail').textContent(),/Imports the changed core module/);
 await page.getByLabel('Find a file').fill('');
 await page.locator('#files>li[data-path="src/ui.ts"] button').click();
 assert.ok(await page.locator('svg [data-node="file:src/core.ts"][data-context="true"]').count());assert.ok(await page.locator('svg [data-node="file:src/api.ts"][data-context="true"]').count());assert.ok(await page.locator('svg [data-node="file:src/ui.ts"][data-search-result="false"]').count());
 assert.match(await page.locator('#detail').textContent(),/Analysis base: src\/core.ts → src\/api.ts → src\/ui.ts/);
 assert.match(await page.locator('#detail').textContent(),/Head: src\/core.ts → src\/api.ts → src\/ui.ts/);
 // Diagram context stays inspectable even when its list row does not match.
 await page.getByLabel('Find a file').fill('ui.ts');
 const contextNode=page.locator('svg [data-node="file:src/core.ts"]');
 for(const activation of ['click','Enter','Space']){
  await page.locator('#files>li[data-path="src/ui.ts"] button').click();
  if(activation==='click')await contextNode.click();else{await contextNode.focus();await page.keyboard.press(activation);}
  assert.equal(await page.locator('#detail h2').textContent(),'src/core.ts');
  assert.equal(await contextNode.getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByLabel('Find a file').inputValue(),'ui.ts');
  assert.equal(await page.locator('#count').textContent(),'1 file shown');
 }
 await page.getByLabel('Neighborhood depth',{exact:true}).selectOption('0');
 assert.equal(await contextNode.getAttribute('aria-pressed'),'true');
 await page.getByLabel('Revision',{exact:true}).selectOption('head');
 assert.equal(await contextNode.getAttribute('aria-pressed'),'true');
 await page.getByLabel('Revision',{exact:true}).selectOption('both');
 await page.getByLabel('Neighborhood depth',{exact:true}).selectOption('2');
 await page.getByLabel('Find a file').fill('');
 await page.locator('#files>li[data-path="src/ui.ts"] button').click();
 assert.ok(await page.locator('#detail a[href*="/blob/"]').count()>=1);assert.ok(await page.locator('#detail a[href*="/compare/"]').count()===0);assert.ok(await page.locator('.detail-tip a[href*="/compare/"]').count()===1);
 await page.getByLabel('Revision',{exact:true}).selectOption('base');assert.ok(await page.locator('path.graph-edge').evaluateAll(edges=>edges.every(edge=>edge.classList.contains('base'))));
 await page.getByLabel('Revision',{exact:true}).selectOption('both');await page.getByLabel('Edge kind',{exact:true}).selectOption('type-only');assert.equal(await page.locator('path.graph-edge').count(),0);await page.getByLabel('Edge kind',{exact:true}).selectOption('all');
 await page.getByLabel('Find a file').fill('');await page.getByLabel('Role',{exact:true}).selectOption('changed');assert.equal(await page.locator('#count').textContent(),'1 file shown');
 assert.equal(await page.locator('svg [data-search-result="true"]').count(),1);assert.ok(await page.locator('svg [data-context="true"]').count()>0);assert.ok(await page.locator('svg [data-node]').count()<=18);
 await page.getByLabel('Role',{exact:true}).selectOption('');await page.getByLabel('Owner',{exact:true}).selectOption('@maintainers');assert.equal(await page.locator('#count').textContent(),'3 files shown');
 await page.getByLabel('Owner',{exact:true}).selectOption('');
 const graphButton=page.locator('svg [data-node="file:src/core.ts"]');await graphButton.focus();await page.keyboard.press('Space');
 assert.equal(await page.locator('#detail h2').textContent(),'src/core.ts');assert.equal(await graphButton.getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('#detail').textContent(),/Analysis base: 3 discovered dependents/);assert.match(await page.locator('#detail').textContent(),/Head: 3 discovered dependents/);assert.deepEqual(await page.locator('#detail .source-links a').evaluateAll(links=>links.map(link=>link.textContent)),['Base source ↗','Head source ↗']);assert.match(await page.locator('#detail .change-status').textContent(),/Modified in both revisions/);
 await page.getByLabel('Find a file').fill('no-such-candidate');assert.equal(await page.locator('#count').textContent(),'0 files shown');assert.ok(await page.locator('#empty').isVisible());
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();assert.equal(await page.locator('#count').textContent(),'4 files shown');
 await page.locator('#detail').focus();await page.keyboard.press('/');assert.ok(await page.getByLabel('Find a file').evaluate(el=>el===document.activeElement));
 await page.setViewportSize({width:320,height:800});await page.reload();
 assert.equal(await page.locator('#count').textContent(),'4 files shown');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('#inspector').getAttribute('open'),null);assert.ok(await page.locator('#explorer').evaluate(el=>el.getBoundingClientRect().top<document.querySelector('.graph-panel').getBoundingClientRect().top));
 await page.locator('#files>li.file-row').first().locator('button').click();await page.waitForFunction(()=>document.getElementById('inspector').open&&document.activeElement===document.getElementById('detail'));assert.ok(await page.locator('#detail').evaluate(el=>el===document.activeElement));const mobileSelected=await page.locator('#detail h2').textContent();await page.getByRole('button',{name:'Back to files'}).click();assert.ok(await page.locator('#inspector').evaluate(el=>!el.open));assert.equal(await page.evaluate(()=>document.activeElement.closest('.file-row')?.dataset.path),mobileSelected);
 await page.getByLabel('Find a file').fill('ui.ts');
 await page.locator('svg [data-node="file:src/core.ts"]').click();
 await page.waitForFunction(()=>document.getElementById('inspector').open&&document.activeElement===document.getElementById('detail'));
 assert.equal(await page.locator('#detail h2').textContent(),'src/core.ts');
 await page.getByRole('button',{name:'Back to files'}).click();
 assert.ok(await page.getByLabel('Find a file').evaluate(el=>el===document.activeElement));
 assert.equal(await page.getByLabel('Find a file').inputValue(),'ui.ts');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 if(process.env.PATCHRIPPLE_VISUAL_DIR)await page.screenshot({path:path.join(process.env.PATCHRIPPLE_VISUAL_DIR,'mobile.png'),fullPage:true});
 if(process.env.PATCHRIPPLE_EDGE_FIXTURES){
  for(const name of ['empty','large','incomplete']){
   await page.goto(pathToFileURL(path.join(process.env.PATCHRIPPLE_EDGE_FIXTURES,name+'.html')).href);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(name==='empty'){assert.equal(await page.locator('#count').textContent(),'0 files shown');assert.ok(await page.locator('#empty').isVisible());}
   if(name==='large'){assert.equal(await page.locator('#count').textContent(),'85 files shown');assert.ok(await page.locator('svg [data-node]').count()<=18);await page.getByLabel('Package group',{exact:true}).selectOption('src');assert.equal(await page.locator('#count').textContent(),'84 files shown');await page.getByLabel('Package group',{exact:true}).selectOption('');await page.locator('#files>li.file-row[data-path="zz-deep-dependent.ts"] button').click();assert.equal(await page.locator('#detail h2').textContent(),'zz-deep-dependent.ts');assert.ok(await page.locator('svg [data-node="file:zz-deep-dependent.ts"]').count());assert.match(await page.locator('#detail').textContent(),/src\/changed.ts.*src\/related\/081.ts.*src\/related\/082.ts.*zz-deep-dependent.ts/s);assert.match(await page.locator('.graph-note').textContent(),/Focused on zz-deep-dependent.ts/);await page.getByLabel('Neighborhood depth',{exact:true}).selectOption('3');assert.ok(await page.locator('svg [data-node="file:src/changed.ts"]').count());}
   if(name==='incomplete'){assert.ok(await page.getByText('Incomplete analysis',{exact:true}).isVisible());assert.equal(await page.locator('.audit').getAttribute('open'),'');assert.match(await page.locator('.audit-body').textContent(),/omitted nodes/);assert.equal(await page.locator('.warning').getAttribute('data-category'),'resource-limit');}
   if(name==='large'){
    // A late match must remain selected in the capped graph at both widths.
    for(const width of [1280,320]){
     await page.setViewportSize({width,height:800});
     await page.getByLabel('Find a file').fill('src/related/');
     await page.locator('#files>li.file-row[data-path="src/related/082.ts"] button').click();
     assert.equal(await page.locator('#detail h2').textContent(),'src/related/082.ts');
     assert.equal(await page.locator('svg [data-node="file:src/related/082.ts"]').getAttribute('aria-pressed'),'true');
     assert.ok(await page.locator('svg [data-node]').count()<=18);
     assert.equal(await page.locator('#count').textContent(),'83 files shown');
     assert.match(await page.locator('#map-svg').getAttribute('aria-label'),/18 matching files/);
    }
   }
  }
 }
 if(!process.env.PATCHRIPPLE_DEMO_PATH){const readme=await readFile(path.resolve('README.md'),'utf8');assert.match(readme,/!\[[^\]]+\]\(docs\/demo\/preview\.gif\)/);const preview=await readFile(path.resolve('docs/demo/preview.gif'));assert.match(preview.subarray(0,6).toString('ascii'),/^GIF8[79]a$/);assert.ok(preview.length<1_000_000);
 await page.goto(pathToFileURL(path.resolve('docs/index.html')).href);
 assert.match(await page.title(),/repo-local PR impact maps/);assert.ok(await page.getByRole('heading',{name:'Run locally',exact:true}).isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('link',{name:'60-second guided demo',exact:true}).click();
 assert.match(await page.title(),/Guided demo/);assert.match(await page.locator('h1').textContent(),/One changed file/);
 assert.equal(await page.locator('.metric').count(),3);assert.equal(await page.locator('#impact-map .edge.test').count(),1);
 const importStep=page.getByRole('button',{name:/Follow imports/});await importStep.focus();await page.keyboard.press('Enter');assert.equal(await importStep.getAttribute('aria-current'),'step');assert.equal(await page.locator('#impact-map').getAttribute('data-step'),'2');assert.match(await page.locator('#walkthrough-explanation').textContent(),/src\/core\.ts ← src\/api\.ts ← src\/ui\.ts/);
 const testStep=page.getByRole('button',{name:/Inspect test evidence/});await testStep.focus();await page.keyboard.press('Enter');assert.equal(await testStep.getAttribute('aria-current'),'step');assert.equal(await page.locator('#impact-map').getAttribute('data-step'),'3');assert.match(await page.locator('#walkthrough-explanation').textContent(),/does not tell us whether the test covers/);assert.match(await page.locator('.boundary').textContent(),/not runtime effects/);
 await page.setViewportSize({width:320,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#impact-map').evaluate(el=>el.scrollWidth>el.clientWidth));
 await page.setViewportSize({width:1280,height:900});await page.getByRole('link',{name:/Open the interactive synthetic report/}).click();assert.match(await page.title(),/example\/project/);assert.equal(await page.locator('#count').textContent(),'4 files shown');}
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log(JSON.stringify({browser:browserName,identity:true,notBlank:true,semanticLandmarks:true,labeledControls:true,keyboardSelection:true,graphKeyboardSelection:true,clearFilters:true,searchShortcut:true,search:true,roleFilter:true,ownerFilter:true,edgeFixtures:!!process.env.PATCHRIPPLE_EDGE_FIXTURES,staticDocs:!process.env.PATCHRIPPLE_DEMO_PATH,docsDemoNavigation:!process.env.PATCHRIPPLE_DEMO_PATH,guidedDemoSteps:!process.env.PATCHRIPPLE_DEMO_PATH,offlineReportHandoff:!process.env.PATCHRIPPLE_DEMO_PATH,shareablePreview:!process.env.PATCHRIPPLE_DEMO_PATH,noConsoleErrors:true,noNetworkAssets:true,noMobileOverflow:true,viewports:['1280x900','320x800'],url}));
}finally{await browser.close();}
