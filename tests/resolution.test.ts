import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {rmSync,mkdirSync} from 'node:fs';
import {scan} from '../src/scan.js';
import {main} from '../src/cli.js';
import {analyze} from '../src/analyze.js';
import {warningCategory} from '../src/model.js';
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
test('read-only doctor validates exact history and outside output paths without writing',async()=>{
 const f=fixture({'core.ts':'export const x=1;'});const base=git(f.repo,'rev-parse','HEAD'),out=path.join(f.dir,'doctor-output');
 try{
  const args=['doctor','--repo',f.repo,'--base',base,'--head',base,'--out',out];assert.equal(await main(args),0);
  mkdirSync(out);assert.equal(await main(args),1);
  assert.equal(await main(['doctor','--repo',f.repo,'--base','missing','--head',base,'--out',path.join(f.dir,'other-output')]),1);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('local package entry metadata resolves main before considering index files',async()=>{
 const result=await scanFiles({'api.ts':"import './library';",'library/package.json':'{"main":"other.js"}','library/index.ts':'export const wrong=1;','library/other.ts':'export const right=1;'});
 assert.deepEqual(result.edges.map(e=>e.to),['file:library/other.ts']);assert.equal(result.warnings.length,0);
});
test('expected external imports remain visible without making local analysis incomplete',async()=>{
 const f=fixture({'src/api.ts':"import React from 'react'; export const view=React;"});
 try{const base=git(f.repo,'rev-parse','HEAD');f.write({'src/api.ts':"import React from 'react'; import './missing'; export const view=React+1;"});const head=f.commit('external and unresolved imports');
  const graph=await analyze({repo:f.repo,base,head,repository:'https://github.com/example/project'});
  const external=graph.warnings.find(w=>w.code==='EXPECTED_EXTERNAL_IMPORT'),local=graph.warnings.find(w=>w.code==='UNRESOLVED_IMPORT');
  assert.equal(external?.category,'expected-external');assert.equal(local?.category,'unresolved-local');assert.equal(graph.completeness.complete,false);
  f.write({'src/api.ts':"import React from 'react'; export const view=React+2;"});const cleanHead=f.commit('only external import');const clean=await analyze({repo:f.repo,base,head:cleanHead,repository:'https://github.com/example/project'});
  assert.ok(clean.warnings.some(w=>w.code==='EXPECTED_EXTERNAL_IMPORT'));assert.equal(clean.completeness.complete,true);assert.equal(warningCategory(clean.warnings[0]),'expected-external');
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('workspace exports and nested inherited TypeScript aliases resolve without loading config code',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/*']}),
  'tsconfig.base.json':JSON.stringify({compilerOptions:{baseUrl:'.',paths:{'@shared/*':['shared/*']}}}),
  'packages/app/package.json':JSON.stringify({name:'@demo/app'}),
  'packages/app/tsconfig.json':JSON.stringify({extends:'../../tsconfig.base.json'}),
  'packages/app/src/api.ts':"import '@shared/core'; import '@demo/ui';",
  'shared/core.ts':'export const shared=1;',
  'packages/ui/package.json':JSON.stringify({name:'@demo/ui',exports:{'.':{types:'./src/index.d.ts',import:'./src/index.js'}}}),
  'packages/ui/src/index.ts':'export const component=1;',
  'packages/ui/src/index.d.ts':'export declare const component:number;'
 });
 assert.equal(result.warnings.length,0);assert.deepEqual(result.edges.map(e=>e.to),['file:shared/core.ts','file:packages/ui/src/index.ts']);
});
test('workspace import with a missing export target is incomplete instead of treated as external',async()=>{
 const result=await scanFiles({'package.json':'{"workspaces":["packages/*"]}','packages/ui/package.json':'{"name":"@demo/ui","exports":{".":"./src/index.js"}}','api.ts':"import '@demo/ui';",'src/changed.ts':'export const x=1;'});
 assert.ok(result.warnings.some(w=>w.code==='UNRESOLVED_WORKSPACE_IMPORT'&&warningCategory(w)==='unresolved-local'));
});
test('duplicate workspace names stay unresolved and negative workspace patterns are excluded',async()=>{
 const duplicate=await scanFiles({'package.json':'{"workspaces":["packages/*"]}','packages/one/package.json':'{"name":"@demo/ui"}','packages/two/package.json':'{"name":"@demo/ui"}','api.ts':"import '@demo/ui';"});
 assert.ok(duplicate.warnings.some(w=>w.code==='UNRESOLVED_WORKSPACE_IMPORT'));
 const excluded=await scanFiles({'package.json':'{"workspaces":["packages/*","!packages/ignored"]}','packages/ignored/package.json':'{"name":"@demo/ignored"}','api.ts':"import '@demo/ignored';"});
 assert.ok(excluded.warnings.some(w=>w.code==='EXPECTED_EXTERNAL_IMPORT'));assert.ok(!excluded.warnings.some(w=>w.code==='UNRESOLVED_WORKSPACE_IMPORT'));
});
test('common Python src package roots are discovered from package initializers',async()=>{
 const result=await scanFiles({'packages/service/src/service_pkg/__init__.py':'','packages/service/src/service_pkg/core.py':'value=1','packages/service/src/service_pkg/api.py':'from service_pkg.core import value'});
 assert.equal(result.warnings.length,0);assert.ok(result.edges.some(e=>e.from==='file:packages/service/src/service_pkg/api.py'&&e.to==='file:packages/service/src/service_pkg/core.py'));
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
