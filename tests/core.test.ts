import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {rmSync,readFileSync,existsSync} from 'node:fs';
import {fixture,git} from './helpers.js';
import {analyze} from '../src/analyze.js';
import {jsImports,pythonImports} from '../src/scan.js';
import {validateGraph,safePath,repositoryUrl,defaultLimits} from '../src/model.js';
import {compileOwners} from '../src/owners.js';
import {html,writeBundle,summary} from '../src/render.js';
import {main} from '../src/cli.js';
const repository='https://github.com/example/project';
test('syntax extraction respects comments, aliases, type and dynamic import uncertainty',()=>{
 const r=jsImports(`// require('fake')\nimport type {X} from './types'; export * from './core'; const p=import('./lazy'); require(x); const s="import fake";`,'src/api.ts');
 assert.deepEqual(r.imports.map(x=>[x.name,x.kind]),[['./types','type-only'],['./core','static'],['./lazy','dynamic-literal']]);assert.equal(r.warnings.length,1);
});
test('offline Python grammar handles from/import alias and detects dynamic imports',async()=>{
 const r=await pythonImports('from .core import thing as other\nimport app.api as api, os\nimportlib.import_module(name)\n');
 assert.deepEqual(r.imports.map(x=>x.name),['.core','app.api','os']);assert.equal(r.warnings.length,1);
});
test('named type-only imports and re-exports retain type-only evidence',()=>{
 const result=jsImports("import {type X} from './types'; export {type X} from './types';",'api.ts');
 assert.deepEqual(result.imports.map(i=>i.kind),['type-only','type-only']);
});
test('paths and repository links reject traversal/options/credentialed schemes',()=>{
 for(const p of ['/x','../x','a/../x','C:/x','a\\x','a\0x'])assert.equal(safePath(p),false);
 assert.equal(safePath('src/hello space\n世界.ts'),true);
 for(const url of ['javascript:alert(1)','https://secret@github.com/o/r','https://example.com/o/r','https://github.com/o/r?x=1'])assert.throws(()=>repositoryUrl(url));
});
test('base owners precedence, last matching rule, unassignment, unsupported lines',()=>{
 const owners=compileOwners(new Map([['CODEOWNERS','* @wrong'],['.github/CODEOWNERS','* @everyone\n/src/ @source\n/src/private.ts @private\n/src/public.ts\n!no @unsupported']]));
 assert.deepEqual(owners.match('src/private.ts'),['@private']);assert.deepEqual(owners.match('src/public.ts'),[]);assert.deepEqual(owners.match('src/api.ts'),['@source']);assert.equal(owners.warnings.length,1);
});
test('CODEOWNERS directory patterns, nonrecursive wildcard tails and inline comments',()=>{
 const owner=compileOwners(new Map([['CODEOWNERS','* @all\ndocs/* @docs # inline comment\napps/ @apps\n**/logs @logs']]));
 assert.deepEqual(owner.match('docs/intro.md'),['@docs']);assert.deepEqual(owner.match('docs/deep/file.md'),['@all']);
 assert.deepEqual(owner.match('nested/apps/file.ts'),['@apps']);assert.deepEqual(owner.match('deep/logs/file.txt'),['@logs']);assert.equal(owner.warnings.length,0);
});
test('ownership uses current base-tip policy even when PR analysis uses an older merge-base',async()=>{
 const f=fixture({'core.ts':'export const x=1;','CODEOWNERS':'* @old'});
 try{const ancestor=git(f.repo,'rev-parse','HEAD');git(f.repo,'checkout','-b','feature');f.write({'core.ts':'export const x=2;','CODEOWNERS':'* @untrusted'});const head=f.commit('feature');
  git(f.repo,'checkout','main');f.write({'CODEOWNERS':'* @current'});const base=f.commit('owner update');
  const graph=await analyze({repo:f.repo,base,head,repository});assert.equal(graph.change.analysisBaseSha,ancestor);assert.deepEqual(graph.nodes.find(n=>n.path==='core.ts')!.owners,['@current']);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('real Git fixture: transitive impact, cycle, naming tests, owners, stable bundle',async()=>{
 const f=fixture({'src/core.ts':'export const value=1;','src/api.ts':"import {value} from './core'; export const api=value;",'src/ui.ts':"import './api';",'src/core.test.ts':"import './core';",'.github/CODEOWNERS':'* @team\n/src/core.ts @core'});
 try{
  const base=git(f.repo,'rev-parse','HEAD');f.write({'src/core.ts':'export const value=2;'});const head=f.commit('update');
  const before=git(f.repo,'status','--porcelain');const options={repo:f.repo,base,head,repository};
  const graph=await analyze(options);validateGraph(graph);
  assert.deepEqual(graph.nodes.map(n=>n.path),['src/api.ts','src/core.test.ts','src/core.ts','src/ui.ts']);
  assert.deepEqual(graph.nodes.find(n=>n.path==='src/core.ts')!.owners,['@core']);assert.equal(graph.completeness.complete,true);
  assert.ok(graph.nodes.find(n=>n.path==='src/core.test.ts')!.testReasons.length);assert.equal(JSON.stringify(await analyze(options)),JSON.stringify(graph));
  const out=path.join(f.dir,'bundle');await writeBundle(graph,out,f.repo,'2026-10-02T00:00:00Z');
  for(const name of ['index.html','graph.json','graph.svg','metadata.json'])assert.ok(existsSync(path.join(out,name)));
  assert.equal(JSON.parse(readFileSync(path.join(out,'metadata.json'),'utf8')).generatedAt,'2026-10-02T00:00:00Z');
  assert.equal(git(f.repo,'status','--porcelain'),before);
  await assert.rejects(writeBundle(graph,out,f.repo),/already exists/);await assert.rejects(writeBundle(graph,path.join(f.repo,'out'),f.repo),/outside/);
  const bad=structuredClone(graph);bad.edges[0].to='file:absent.ts';assert.throws(()=>validateGraph(bad),/edge/);
  const duplicate=structuredClone(graph);duplicate.nodes.push(duplicate.nodes[0]);assert.throws(()=>validateGraph(duplicate),/duplicate/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('deleted dependency remains a base-only candidate with base link and obsolete importer',async()=>{
 const f=fixture({'core.ts':'export const x=1;','api.ts':"import './core';"});
 try{const base=git(f.repo,'rev-parse','HEAD');rmSync(path.join(f.repo,'core.ts'));const head=f.commit('delete');
  const g=await analyze({repo:f.repo,base,head,repository});const removed=g.nodes.find(n=>n.path==='core.ts')!;
  assert.deepEqual(removed.revisions,['base']);assert.ok(g.nodes.some(n=>n.path==='api.ts'));assert.ok(g.edges.some(e=>e.revision==='base'));assert.ok(g.warnings.some(w=>w.code==='UNRESOLVED_IMPORT'));
  const doc=html(g);assert.ok(doc.includes('/blob/'+base+'/core.ts'));assert.ok(!doc.includes('/blob/'+head+'/core.ts'));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('PR mode uses merge base, direct mode is explicit and missing refs fail',async()=>{
 const f=fixture({'core.ts':'export const x=1;'});
 try{const ancestor=git(f.repo,'rev-parse','HEAD');git(f.repo,'checkout','-b','feature');f.write({'core.ts':'export const x=2;'});const head=f.commit('head');
  git(f.repo,'checkout','main');f.write({'unrelated.ts':'export const y=1;'});const base=f.commit('base advances');
  const g=await analyze({repo:f.repo,base,head,repository});assert.equal(g.change.analysisBaseSha,ancestor);assert.equal(g.changes.length,1);
  const direct=await analyze({repo:f.repo,base,head,repository,mode:'direct'});assert.equal(direct.change.analysisBaseSha,base);assert.equal(direct.changes.length,2);
  await assert.rejects(analyze({repo:f.repo,base:'missing',head,repository}),/Git input/);
  await assert.rejects(analyze({repo:f.repo,base:'--help',head,repository}),/reference/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('rename/cycles retain revision attribution and bounds visibly truncate',async()=>{
 const f=fixture({'core.ts':"import './api'; export const x=1;",'api.ts':"import './core';",'ui.ts':"import './api';"});
 try{const base=git(f.repo,'rev-parse','HEAD');git(f.repo,'mv','core.ts','renamed.ts');const head=f.commit('rename');
  const g=await analyze({repo:f.repo,base,head,repository});assert.ok(g.changes.some(c=>c.status==='R'));assert.ok(g.nodes.some(n=>n.path==='core.ts'&&n.revisions.join()==='base'));
  const bounded=await analyze({repo:f.repo,base,head,repository,limits:{maxNodes:1,maxDepth:1,maxEdges:1}});
  assert.equal(bounded.nodes.length,1);assert.equal(bounded.completeness.complete,false);assert.ok(bounded.completeness.omittedNodes>0);
  await assert.rejects(analyze({repo:f.repo,base,head,repository,limits:{maxFiles:defaultLimits.maxFiles+1}}),/trusted defaults/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('tsconfig aliases and Python package relationships work without executing configuration',async()=>{
 const f=fixture({'tsconfig.json':'{"compilerOptions":{"baseUrl":".","paths":{"@core/*":["src/*"]}}}', 'src/core.ts':'export const x=1;', 'src/api.ts':"import '@core/core';", 'pkg/__init__.py':'', 'pkg/core.py':'value=1', 'pkg/api.py':'from .core import value'});
 try{const base=git(f.repo,'rev-parse','HEAD');f.write({'src/core.ts':'export const x=2;','pkg/core.py':'value=2'});const head=f.commit('changes');
  const g=await analyze({repo:f.repo,base,head,repository});assert.ok(g.nodes.some(n=>n.path==='src/api.ts'));assert.ok(g.nodes.some(n=>n.path==='pkg/api.py'));assert.ok(g.edges.some(e=>e.kind==='python'));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('hostile valid filenames/owners escape HTML SVG summary and links',async()=>{
 const name=process.platform==='win32'?'src/hello 世界.ts':'src/</script><img src=x onerror=alert(1)>.ts';
 const f=fixture({[name]:'export const x=1'});
 try{const base=git(f.repo,'rev-parse','HEAD');f.write({[name]:'export const x=2'});const head=f.commit('hostile');
  const g=await analyze({repo:f.repo,base,head,repository});g.nodes[0].owners=['</script><img src=x onerror=alert(1)>'];
  assert.ok(!html(g).includes('<img src=x'));assert.ok(!summary(g).includes('<img src=x'));assert.ok(html(g).includes('sha256-'));assert.ok(!html(g).includes('unsafe-inline'));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('CLI misuse returns usage exit code without running Git',async()=>{assert.equal(await main(['analyze']),2);assert.equal(await main(['unknown']),2);});
