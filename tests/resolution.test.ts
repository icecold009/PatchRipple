import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rmSync} from 'node:fs';
import {scan} from '../src/scan.js';
import {main} from '../src/cli.js';
import {analyze} from '../src/analyze.js';
import {fixture,git} from './helpers.js';
async function scanFiles(items:Record<string,string>,roots=['','src']){
 const files=new Map(Object.entries(items));return scan({files,paths:new Set(files.keys()),warnings:[]},'head',roots,Date.now()+60000);
}
test('explicit custom Python roots do not falsely classify unique packages as ambiguous',async()=>{
 const result=await scanFiles({'lib/pkg/__init__.py':'','lib/pkg/core.py':'value=1','lib/api.py':'from pkg import core'},['','lib']);
 assert.equal(result.warnings.length,0);assert.ok(result.edges.some(e=>e.from==='file:lib/api.py'&&e.to==='file:lib/pkg/core.py'));
});
test('actual multiple Python roots and module/package ambiguity are excluded visibly',async()=>{
 const result=await scanFiles({'pkg/__init__.py':'','pkg/core.py':'value=1','lib/pkg/__init__.py':'','lib/pkg/core.py':'value=2','api.py':'from pkg import core'},['','lib']);
 assert.ok(result.warnings.some(w=>w.code==='AMBIGUOUS_IMPORT'));assert.equal(result.edges.length,0);
 const dual=await scanFiles({'pkg.py':'value=1','pkg/__init__.py':'','api.py':'import pkg'},['']);
 assert.ok(dual.warnings.some(w=>w.code==='AMBIGUOUS_IMPORT'));assert.equal(dual.edges.length,0);
});
test('a Python module file does not import a sidecar package member implicitly',async()=>{
 const result=await scanFiles({'pkg.py':'value=1','pkg/member.py':'value=2','api.py':'from pkg import member'},['']);
 assert.deepEqual(result.edges.map(e=>e.to),['file:pkg.py']);
});
test('emitted JS/JSX and declaration imports map to their supported source extensions',async()=>{
 const result=await scanFiles({'api.ts':"import './component.js'; import './view.jsx'; import type {X} from './types.mjs';",'component.tsx':'export const component=1;','view.tsx':'export const view=1;','types.d.mts':'export interface X {}'});
 assert.equal(result.warnings.length,0);assert.deepEqual(result.edges.map(e=>e.to),['file:component.tsx','file:view.tsx','file:types.d.mts']);
});
test('tsconfig aliases use exact match and longest wildcard prefix, not rule insertion order',async()=>{
 const result=await scanFiles({'tsconfig.json':JSON.stringify({compilerOptions:{paths:{'*':['broad/*'],'@/*':['generic/*'],'@/specific/*':['specific/*'],'@/exact':['exact.ts']}}}),'api.ts':"import '@/specific/core'; import '@/exact';",'generic/specific/core.ts':'export const wrong=1;','specific/core.ts':'export const right=1;','generic/exact.ts':'export const wrong=1;','exact.ts':'export const right=1;'});
 assert.equal(result.warnings.length,0);assert.deepEqual(result.edges.map(e=>e.to),['file:specific/core.ts','file:exact.ts']);
});
test('CLI ceiling violations and empty required values are usage errors',async()=>{
 const args=['analyze','--repo','.','--base','HEAD','--head','HEAD','--repository','https://github.com/example/project','--out','unused'];
 for(const [flag,value]of [['--max-nodes','501'],['--max-depth','21'],['--max-files','5001'],['--timeout-ms','60001']])assert.equal(await main([...args,flag,value]),2);
 assert.equal(await main(['analyze','--repo','','--base','HEAD','--head','HEAD','--repository','https://github.com/example/project','--out','unused']),2);
});
test('directory package metadata never silently falls back to a potentially wrong index edge',async()=>{
 const result=await scanFiles({'api.ts':"import './library';",'library/package.json':'{"main":"other.js"}','library/index.ts':'export const wrong=1;','library/other.ts':'export const right=1;'});
 assert.equal(result.edges.length,0);assert.ok(result.warnings.some(w=>w.code==='PACKAGE_DIRECTORY_UNSUPPORTED'));
});
test('zero-change comparison yields a valid empty impact graph',async()=>{
 const f=fixture({'core.ts':'export const x=1;'});
 try{const sha=git(f.repo,'rev-parse','HEAD');const graph=await analyze({repo:f.repo,base:sha,head:sha,repository:'https://github.com/example/project'});
 assert.deepEqual(graph.changes,[]);assert.deepEqual(graph.nodes,[]);assert.deepEqual(graph.edges,[]);assert.equal(graph.completeness.complete,true);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('unrelated histories require explicit direct mode instead of silently changing PR semantics',async()=>{
 const f=fixture({'core.ts':'export const x=1;'});
 try{const base=git(f.repo,'rev-parse','HEAD');git(f.repo,'checkout','--orphan','independent');f.write({'core.ts':'export const x=2;'});const head=f.commit('independent root');
  await assert.rejects(analyze({repo:f.repo,base,head,repository:'https://github.com/example/project'}),/Git input/);
  const graph=await analyze({repo:f.repo,base,head,repository:'https://github.com/example/project',mode:'direct'});assert.equal(graph.change.analysisBaseSha,base);assert.equal(graph.changes.length,1);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
