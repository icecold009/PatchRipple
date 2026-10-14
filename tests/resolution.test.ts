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
test('JavaScript runtime imports resolve implementations instead of declaration sidecars',async()=>{
 const result=await scanFiles({'index.ts':'export const value=1;','index.js':'export const value=1;','index.d.ts':'export declare const value:number;','consumer.js':"import {value} from './index.js';"});
 assert.deepEqual(result.edges.map(e=>[e.kind,e.to]),[['static','file:index.js']]);assert.equal(result.warnings.length,0);
});
test('TypeScript emitted JS imports prefer source while type-only imports use declarations',async()=>{
 const result=await scanFiles({'api.ts':"import './source.js'; import type {Value} from './types.js';",'source.ts':'export const value=1;','source.js':'export const value=1;','types.js':'export const value=1;','types.d.ts':'export interface Value {}'});
 assert.deepEqual(result.edges.map(e=>[e.kind,e.to]),[['static','file:source.ts'],['type-only','file:types.d.ts']]);assert.equal(result.warnings.length,0);
});
test('TypeScript declaration-test importers resolve declaration sidecars before runtime files',async()=>{
 const result=await scanFiles({'index.js':'export const value=1;','index.d.ts':'export declare const value:number;','consumer.test-d.ts':"import {expectType} from 'tsd'; import value from './index.js';"});
 assert.deepEqual(result.edges.map(e=>e.to),['file:index.d.ts']);
});
test('tsconfig aliases use exact match and longest wildcard prefix, not rule insertion order',async()=>{
 const result=await scanFiles({'tsconfig.json':JSON.stringify({compilerOptions:{paths:{'*':['broad/*'],'@/*':['generic/*'],'@/specific/*':['specific/*'],'@/exact':['exact.ts']}}}),'api.ts':"import '@/specific/core'; import '@/exact';",'generic/specific/core.ts':'export const wrong=1;','specific/core.ts':'export const right=1;','generic/exact.ts':'export const wrong=1;','exact.ts':'export const right=1;'});
 assert.equal(result.warnings.length,0);assert.deepEqual(result.edges.map(e=>e.to),['file:specific/core.ts','file:exact.ts']);
});
test('a child tsconfig paths map replaces inherited aliases',async()=>{
 const result=await scanFiles({
  'tsconfig.base.json':JSON.stringify({compilerOptions:{paths:{'@parent/*':['parent/*']}}}),
  'packages/app/tsconfig.json':JSON.stringify({extends:'../../tsconfig.base.json',compilerOptions:{paths:{'@child/*':['child/*']}}}),
  'packages/app/src/api.ts':"import '@parent/core'; import '@child/core';",
  'parent/core.ts':'export const stale=1;','packages/app/child/core.ts':'export const current=1;'
 });
 assert.deepEqual(result.edges.map(e=>e.to),['file:packages/app/child/core.ts']);
 assert.ok(!result.edges.some(e=>e.to==='file:parent/core.ts'));
});
test('CLI ceiling violations and empty required values are usage errors',async()=>{
 const args=['analyze','--repo','.','--base','HEAD','--head','HEAD','--repository','https://github.com/example/project','--out','unused'];
 for(const [flag,value]of [['--max-nodes','501'],['--max-depth','21'],['--max-files','5001'],['--timeout-ms','60001']])assert.equal(await main([...args,flag,value]),2);
 assert.equal(await main(['analyze','--repo','','--base','HEAD','--head','HEAD','--repository','https://github.com/example/project','--out','unused']),2);
});
test('fetch-pr rejects malformed targets before network access and protects existing refs',async()=>{
 const f=fixture({'core.ts':'export const x=1;'}),args=['fetch-pr','--repo',f.repo,'--repository','example/project','--base-branch','main','--pr','1'];
 try{
  assert.equal(await main([...args.slice(0,4),'https://github.com/example/project',...args.slice(5)]),2);
  assert.equal(await main([...args.slice(0,-1),'0']),2);
  git(f.repo,'config','url.ssh://git@github.com/.insteadOf','https://github.com/');
  assert.equal(await main([...args.slice(0,6),'../main',...args.slice(7)]),1);
  assert.equal(await main(args),1);
  for(const ref of ['refs/patchripple/manual/base','refs/patchripple/manual/head'])assert.throws(()=>git(f.repo,'show-ref','--verify','--quiet',ref));
  assert.equal(git(f.repo,'status','--porcelain'),'');
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('TypeScript project-reference build semantics are reported as unsupported',async()=>{
 const result=await scanFiles({'tsconfig.json':JSON.stringify({references:[{path:'./packages/core'}]}),'src/api.ts':'export const api=1;'});
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='tsconfig.json'&&w.detail.includes('project references are not modeled')));
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
test('relative directory imports resolving to repository root use its package entry',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({main:'./src/index.js'}),
  'src/index.js':'module.exports = {};',
  'examples/app/index.js':"const app = require('../../');",
  'test/unit/app.js':"const app = require('../../');",
  'test/app.js':"const app = require('../');"
 });
 const expected=['examples/app/index.js','test/app.js','test/unit/app.js'].map(from=>[`file:${from}`,'file:src/index.js']).sort();
 assert.deepEqual(result.edges.map(e=>[e.from,e.to]).sort(),expected);assert.equal(result.warnings.length,0);
 const fallback=await scanFiles({'index.js':'module.exports = {};','nested/app.js':"const app = require('../');"});
 assert.deepEqual(fallback.edges.map(e=>[e.from,e.to]),[['file:nested/app.js','file:index.js']]);assert.equal(fallback.warnings.length,0);
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
test('pnpm workspace YAML simple include and exclude patterns resolve local packages',async()=>{
 const result=await scanFiles({
  'pnpm-workspace.yaml':"packages:\n  - 'packages/**'\n  - '!packages/private' # exclude private tools\n",
  'packages/ui/package.json':JSON.stringify({name:'@demo/ui',exports:{'.':'./src/index.js'}}),
  'packages/ui/src/index.ts':'export const ui=1;',
  'packages/private/package.json':JSON.stringify({name:'@demo/private'}),
  'api.ts':"import '@demo/ui'; import '@demo/private';"
 });
 assert.ok(result.edges.some(e=>e.to==='file:packages/ui/src/index.ts'));
 assert.ok(result.warnings.some(w=>w.code==='EXPECTED_EXTERNAL_IMPORT'&&w.path==='api.ts'));
 assert.equal(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='pnpm-workspace.yaml'),false);
});
test('pnpm workspace YAML flow sequences resolve local packages',async()=>{
 const result=await scanFiles({
  'pnpm-workspace.yaml':"packages: ['packages/*', \"apps/*\"] # supported inline list\n",
  'packages/ui/package.json':JSON.stringify({name:'@demo/ui',exports:{'.':'./src/index.js'}}),
  'packages/ui/src/index.ts':'export const ui=1;',
  'apps/web/package.json':JSON.stringify({name:'@demo/web',exports:{'.':'./src/index.js'}}),
  'apps/web/src/index.ts':'export const web=1;',
  'api.ts':"import '@demo/ui'; import '@demo/web';"
 });
 assert.deepEqual(result.edges.map(e=>e.to),['file:packages/ui/src/index.ts','file:apps/web/src/index.ts']);
 assert.equal(result.warnings.length,0);
});
test('workspace brace alternatives resolve bounded package patterns',async()=>{
 const result=await scanFiles({'package.json':JSON.stringify({workspaces:['packages/{core,ui}/*']}),'packages/ui/widget/package.json':JSON.stringify({name:'@demo/widget',exports:{'.':'./src/index.js'}}),'packages/ui/widget/src/index.js':'export const widget=true;','api.ts':"import '@demo/widget';"});
 assert.deepEqual(result.edges.map(e=>e.to),['file:packages/ui/widget/src/index.js']);assert.equal(result.warnings.length,0);
});
test('multiple workspace brace groups expand as a bounded product',async()=>{
 const result=await scanFiles({'package.json':JSON.stringify({workspaces:['packages/{core,ui}/{client,server}']}),'packages/ui/server/package.json':JSON.stringify({name:'@demo/widget',exports:{'.':'./src/index.js'}}),'packages/ui/server/src/index.js':'export const widget=true;','api.ts':"import '@demo/widget';"});
 assert.deepEqual(result.edges.map(e=>e.to),['file:packages/ui/server/src/index.js']);assert.equal(result.warnings.length,0);
});
test('workspace brace expansion over the aggregate cap skips resolution',async()=>{
 const alternatives=Array.from({length:16},(_,index)=>String.fromCharCode(97+index)).join(',');
 const oversized=await scanFiles({'package.json':JSON.stringify({workspaces:[`packages/{${alternatives}}/{${alternatives}}/{${alternatives}}`]}),'packages/a/a/a/package.json':JSON.stringify({name:'@demo/oversized'}),'api.ts':"import '@demo/oversized';"});
 assert.ok(oversized.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='package.json'));assert.equal(oversized.edges.length,0);
 const exactlyAtCap=await scanFiles({'package.json':JSON.stringify({workspaces:[`packages/{${alternatives}}/{${alternatives}}`]}),'packages/a/a/package.json':JSON.stringify({name:'@demo/widget',exports:{'.':'./src/index.ts'}}),'packages/a/a/src/index.ts':'export const widget=true;','api.ts':"import '@demo/widget';"});
 assert.deepEqual(exactlyAtCap.edges.map(e=>e.to),['file:packages/a/a/src/index.ts']);assert.equal(exactlyAtCap.warnings.length,0);
 const result=await scanFiles({'package.json':JSON.stringify({workspaces:[`packages/{${alternatives}}/{${alternatives}}`,'other/*']}),'packages/a/a/package.json':JSON.stringify({name:'@demo/widget'}),'other/pkg/package.json':JSON.stringify({name:'@demo/other'}),'api.ts':"import '@demo/widget';"});
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='package.json'&&w.detail.includes('pattern expansion exceeds 256')));assert.equal(result.edges.length,0);
});
test('workspace character classes support ranges and negation',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/[a-c]/*','packages/[!a]/*']}),
  'packages/a/one/package.json':JSON.stringify({name:'@demo/one',exports:{'.':'./src/index.js'}}),
  'packages/a/one/src/index.ts':'export const one=1;',
  'packages/b/two/package.json':JSON.stringify({name:'@demo/two',exports:{'.':'./src/index.js'}}),
  'packages/b/two/src/index.ts':'export const two=1;',
  'packages/c/three/package.json':JSON.stringify({name:'@demo/three',exports:{'.':'./src/index.js'}}),
  'packages/c/three/src/index.ts':'export const three=1;',
  'api.ts':"import '@demo/one'; import '@demo/two'; import '@demo/three';"
 });
 assert.deepEqual(result.edges.map(e=>e.to),[
  'file:packages/a/one/src/index.ts','file:packages/b/two/src/index.ts','file:packages/c/three/src/index.ts'
 ]);
 assert.equal(result.warnings.length,0);
});
test('malformed workspace character classes never produce guessed matches',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/[a-z/*','apps/[z-a]/*']}),
  'packages/a/widget/package.json':JSON.stringify({name:'@demo/package-widget'}),
  'apps/z/widget/package.json':JSON.stringify({name:'@demo/app-widget'}),
  'api.ts':"import '@demo/package-widget'; import '@demo/app-widget';"
 });
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='package.json'));
 assert.equal(result.edges.length,0);
});
test('nested workspace braces resolve and oversized alternatives remain explicit',async()=>{
 const alternatives=Array.from({length:17},(_,index)=>String.fromCharCode(97+index)).join(',');
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/{core,{ui,docs}}/*',`other/{${alternatives}}/*`]}),
  'packages/core/lib/package.json':JSON.stringify({name:'@demo/core',exports:{'.':'./src/index.js'}}),
  'packages/core/lib/src/index.ts':'export const core=1;',
  'packages/ui/widget/package.json':JSON.stringify({name:'@demo/ui',exports:{'.':'./src/index.js'}}),
  'packages/ui/widget/src/index.ts':'export const ui=1;',
  'packages/docs/site/package.json':JSON.stringify({name:'@demo/docs',exports:{'.':'./src/index.js'}}),
  'packages/docs/site/src/index.ts':'export const docs=1;',
  'api.ts':"import '@demo/core'; import '@demo/ui'; import '@demo/docs';"
 });
 assert.deepEqual(result.edges.map(e=>e.to),[
  'file:packages/core/lib/src/index.ts','file:packages/ui/widget/src/index.ts','file:packages/docs/site/src/index.ts'
 ]);
 assert.equal(result.warnings.filter(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='package.json').length,1);
});
test('unsupported pnpm workspace YAML stays visibly incomplete instead of guessing',async()=>{
 const result=await scanFiles({
  'pnpm-workspace.yaml':'packages: [packages/*, [apps/*]]\n',
  'packages/ui/package.json':JSON.stringify({name:'@demo/ui'}),
  'api.ts':"import '@demo/ui';"
 });
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='pnpm-workspace.yaml'));
 assert.equal(result.edges.length,0);
});
test('workspace conditional exports follow import, require, and type-only forms',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/*']}),
  'packages/lib/package.json':JSON.stringify({name:'lib',exports:{'.':{import:'./src/esm.js',require:'./src/cjs.js',types:'./src/index.d.ts'}}}),
  'packages/lib/src/esm.ts':'export const flavor="esm";',
  'packages/lib/src/cjs.ts':'export const flavor="cjs";',
  'packages/lib/src/index.d.ts':'export declare const flavor:string;',
  'api.ts':"import 'lib'; require('lib'); import type {Flavor} from 'lib'; export type {Flavor};"
 });
 assert.deepEqual(result.edges.map(e=>[e.kind,e.to]),[
  ['static','file:packages/lib/src/esm.ts'],
  ['require','file:packages/lib/src/cjs.ts'],
  ['type-only','file:packages/lib/src/index.d.ts']
 ]);
 assert.equal(result.warnings.length,0);
});
test('TypeScript custom conditions select workspace source exports through inherited configs',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/*']}),
  'tsconfig.base.json':JSON.stringify({compilerOptions:{moduleResolution:'Bundler',customConditions:['source']}}),
  'packages/app/tsconfig.json':JSON.stringify({extends:'../../tsconfig.base.json',compilerOptions:{customConditions:['development']}}),
  'packages/app/api.ts':"import '@demo/lib'; require('@demo/lib'); import type {Flavor} from '@demo/lib'; export type {Flavor};",
  'packages/lib/package.json':JSON.stringify({name:'@demo/lib',exports:{'.':{source:{types:'./src/source.d.ts',import:'./src/source.ts',require:'./src/source.cjs'},development:{types:'./src/development.d.ts',import:'./src/development.ts',require:'./src/development.cjs'},import:'./src/import.ts'}}}),
  'packages/lib/src/source.d.ts':'export interface Flavor {source:true}',
  'packages/lib/src/source.ts':'export const flavor="source";',
  'packages/lib/src/source.cjs':'module.exports = {};',
  'packages/lib/src/development.d.ts':'export interface Flavor {development:true}',
  'packages/lib/src/development.ts':'export const flavor="development";',
  'packages/lib/src/development.cjs':'module.exports = {};',
  'packages/lib/src/import.ts':'export const flavor="import";'
 });
 assert.deepEqual(result.edges.map(e=>[e.kind,e.to]),[
  ['static','file:packages/lib/src/development.ts'],
  ['require','file:packages/lib/src/development.cjs'],
  ['type-only','file:packages/lib/src/development.d.ts']
 ]);
 assert.equal(result.warnings.length,0);
 const withoutCustomCondition=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/*']}),
  'packages/lib/package.json':JSON.stringify({name:'@demo/lib',exports:{'.':{source:'./src/source.ts',import:'./src/import.ts'}}}),
  'packages/lib/src/source.ts':'export const flavor="source";',
  'packages/lib/src/import.ts':'export const flavor="import";',
  'api.ts':"import '@demo/lib';"
 });
 assert.deepEqual(withoutCustomCondition.edges.map(e=>e.to),['file:packages/lib/src/import.ts']);
});
test('unsupported TypeScript custom-condition configuration warns and uses standard exports only',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/*']}),
  'tsconfig.json':JSON.stringify({compilerOptions:{moduleResolution:'Classic',customConditions:['source']}}),
  'packages/lib/package.json':JSON.stringify({name:'@demo/lib',exports:{'.':{source:'./src/source.ts',import:'./src/import.ts'}}}),
  'packages/lib/src/source.ts':'export const flavor="source";',
  'packages/lib/src/import.ts':'export const flavor="import";',
  'api.ts':"import '@demo/lib';"
 });
 assert.deepEqual(result.edges.map(e=>e.to),['file:packages/lib/src/import.ts']);
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='tsconfig.json'&&w.detail.includes('customConditions require moduleResolution')));
});
test('malformed TypeScript customConditions are ignored with an explicit warning',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/*']}),
  'tsconfig.json':JSON.stringify({compilerOptions:{moduleResolution:'Bundler',customConditions:'source'}}),
  'packages/lib/package.json':JSON.stringify({name:'@demo/lib',exports:{'.':{source:'./src/source.ts',import:'./src/import.ts'}}}),
  'packages/lib/src/source.ts':'export const flavor="source";',
  'packages/lib/src/import.ts':'export const flavor="import";',
  'api.ts':"import '@demo/lib';"
 });
 assert.deepEqual(result.edges.map(e=>e.to),['file:packages/lib/src/import.ts']);
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.path==='tsconfig.json'&&w.detail.includes('customConditions must be an array')));
});
test('workspace glob matching stops at a deterministic work budget',async()=>{
 const directory='a/'.repeat(119)+'pkg',pattern='**/'.repeat(120)+'wanted';
 const files:Record<string,string>={'package.json':JSON.stringify({workspaces:Array.from({length:256},()=>pattern)}),'api.ts':"import '@demo/deep';"};
 files[directory+'/package.json']=JSON.stringify({name:'@demo/deep'});
 const result=await scanFiles(files);
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.detail.includes('safety budget')));
 assert.equal(result.edges.length,0);
});
test('workspace glob matcher preserves recursive directory patterns',async()=>{
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/**']}),
  'packages/group/lib/package.json':JSON.stringify({name:'@demo/lib',exports:{'.':'./src/index.js'}}),
  'packages/group/lib/src/index.ts':'export const value=1;',
  'api.ts':"import '@demo/lib';"
 });
 assert.ok(result.edges.some(e=>e.to==='file:packages/group/lib/src/index.ts'));
 assert.equal(result.warnings.length,0);
 const zeroDirectories=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/**/lib']}),
  'packages/lib/package.json':JSON.stringify({name:'@demo/root-lib',exports:{'.':'./src/index.js'}}),
  'packages/lib/src/index.ts':'export const root=1;',
  'packages/group/lib/package.json':JSON.stringify({name:'@demo/nested-lib',exports:{'.':'./src/index.js'}}),
  'packages/group/lib/src/index.ts':'export const nested=1;',
  'api.ts':"import '@demo/root-lib'; import '@demo/nested-lib';"
 });
 assert.deepEqual(zeroDirectories.edges.map(e=>e.to),['file:packages/lib/src/index.ts','file:packages/group/lib/src/index.ts']);
 assert.equal(zeroDirectories.warnings.length,0);
});
test('deep workspace export conditions are bounded and reported',async()=>{
 let target:unknown='./src/index.js';
 for(let depth=0;depth<128;depth++)target={default:target};
 const result=await scanFiles({
  'package.json':JSON.stringify({workspaces:['packages/*']}),
  'packages/lib/package.json':JSON.stringify({name:'lib',exports:{'.':target}}),
  'packages/lib/src/index.ts':'export const value=1;',
  'api.ts':"import 'lib';"
 });
 assert.ok(result.warnings.some(w=>w.code==='CONFIG_UNSUPPORTED'&&w.detail.includes('nesting exceeds 64 levels')));
 assert.ok(result.warnings.some(w=>w.code==='UNRESOLVED_WORKSPACE_IMPORT'));
 assert.equal(result.edges.length,0);
});
test('unsupported workspace export conditions remain unresolved instead of inventing a target',async()=>{
 const result=await scanFiles({'package.json':'{"workspaces":["packages/*"]}','packages/lib/package.json':'{"name":"lib","exports":{".":{"browser":"./src/browser.js"}}}','packages/lib/src/browser.ts':'export const browser=true;','api.ts':"require('lib');"});
 assert.equal(result.edges.length,0);
 assert.ok(result.warnings.some(w=>w.code==='UNRESOLVED_WORKSPACE_IMPORT'&&w.detail.includes('unambiguous supported require target')));
});
test('adjacent test suggestions include common cross-extension TSX tests',async()=>{
 const f=fixture({'src/button.tsx':'export const button=1;','src/button.test.ts':''});
 try{
  const base=git(f.repo,'rev-parse','HEAD');f.write({'src/button.tsx':'export const button=2;'});const head=f.commit('change TSX component');
  const graph=await analyze({repo:f.repo,base,head,repository:'https://github.com/example/project'}),testNode=graph.nodes.find(n=>n.path==='src/button.test.ts');
  assert.ok(testNode?.roles.includes('test'));
  assert.ok(testNode?.testReasons.some(reason=>reason.includes('Naming convention for src/button.tsx')));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
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
