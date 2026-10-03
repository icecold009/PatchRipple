import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {rmSync,writeFileSync,readFileSync} from 'node:fs';
import {fixture,git} from './helpers.js';
import {analyze} from '../src/analyze.js';
import {runAction} from '../src/action.js';
import {GitReader} from '../src/git.js';
import {defaultLimits,validateGraph} from '../src/model.js';
const repository='https://github.com/example/project';
test('byte bounds, symlink modes and unsupported language produce explicit incomplete output',async()=>{
 const f=fixture({'core.ts':'export const x=1;', 'source.go':'package main'});
 try{
  const base=git(f.repo,'rev-parse','HEAD');f.write({'core.ts':'export const x=2;'});
  const blob=git(f.repo,'hash-object','-w','core.ts');git(f.repo,'update-index','--add','--cacheinfo','120000,'+blob+',link.ts');
  git(f.repo,'commit','-m','symlink mode and changes');const head=git(f.repo,'rev-parse','HEAD');
  const g=await analyze({repo:f.repo,base,head,repository,limits:{maxFileBytes:8}});
  assert.equal(g.completeness.complete,false);assert.ok(g.warnings.some(w=>w.code==='SKIPPED_ENTRY'));assert.ok(g.warnings.some(w=>w.code==='BYTE_LIMIT'));
  const full=await analyze({repo:f.repo,base,head,repository});assert.ok(full.warnings.some(w=>w.code==='UNSUPPORTED_LANGUAGE'));assert.ok(!full.edges.some(e=>e.from==='file:link.ts'));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('depth and source-file ceilings never claim completeness',async()=>{
 const f=fixture({'core.ts':'export const x=1;','api.ts':"import './core';",'ui.ts':"import './api';",'page.ts':"import './ui';"});
 try{const base=git(f.repo,'rev-parse','HEAD');f.write({'core.ts':'export const x=2;'});const head=f.commit('depth');
  const deep=await analyze({repo:f.repo,base,head,repository,limits:{maxDepth:1}});assert.ok(deep.warnings.some(w=>w.code==='DEPTH_LIMIT'));assert.ok(!deep.nodes.some(n=>n.path==='ui.ts'));
  const files=await analyze({repo:f.repo,base,head,repository,limits:{maxFiles:1}});assert.ok(files.warnings.some(w=>w.code==='FILE_LIMIT'));assert.equal(files.completeness.complete,false);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('namespace/config uncertainty is visible and malformed Python does not silently pass',async()=>{
 const f=fixture({'src/pkg/core.py':'value=1','src/api.py':'from pkg import core\n','tsconfig.json':'{"extends":"../outside.json","compilerOptions":{"baseUrl":"../"}}','broken.py':'from ('});
 try{const base=git(f.repo,'rev-parse','HEAD');f.write({'src/pkg/core.py':'value=2'});const head=f.commit('namespace');
  const g=await analyze({repo:f.repo,base,head,repository});for(const code of ['AMBIGUOUS_NAMESPACE','CONFIG_UNSUPPORTED','DYNAMIC_OR_INVALID_SYNTAX'])assert.ok(g.warnings.some(w=>w.code===code));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('shallow repository missing the comparison base fails without fallback',async()=>{
 const f=fixture({'core.ts':'export const x=1;'});
 try{const base=git(f.repo,'rev-parse','HEAD');f.write({'core.ts':'export const x=2;'});const head=f.commit('head');
  const shallow=path.join(f.dir,'shallow');git(f.repo,'clone','--depth=1','file:///'+f.repo.replaceAll('\\','/'),shallow);
  await assert.rejects(analyze({repo:shallow,base,head,repository}),/Git input/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('Action wrapper exact-SHA inputs create summary and delimited outputs, reject branch refs',async()=>{
 const f=fixture({'core.py':'value=1','api.py':'from core import value'});
 try{const base=git(f.repo,'rev-parse','HEAD');f.write({'core.py':'value=2'});const head=f.commit('Action');
  const output=path.join(f.dir,'output.txt'),summary=path.join(f.dir,'summary.md');
  await runAction({INPUT_REPO:f.repo,INPUT_BASE:base,INPUT_HEAD:head,INPUT_REPOSITORY:repository,INPUT_OUT:path.join(f.dir,'bundle'),GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary});
  assert.ok(readFileSync(output,'utf8').includes('bundle-path<<patchripple_'));assert.ok(readFileSync(summary,'utf8').includes(head));
  const graph=JSON.parse(readFileSync(path.join(f.dir,'bundle','graph.json'),'utf8'));validateGraph(graph);assert.ok(graph.nodes.some((n:{path:string})=>n.path==='api.py'));
  await assert.rejects(runAction({INPUT_BASE:'main',INPUT_HEAD:head}),/full commit SHAs/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('Git reader rejects option-like refs before invoking Git',()=>{
 const f=fixture({'a.ts':'export const a=1;'});
 try{const reader=new GitReader(f.repo,defaultLimits);assert.throws(()=>reader.ref('-option'),/reference/);}finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('non-UTF8 source is excluded with an encoding warning',async()=>{
 const f=fixture({'core.py':'value=1'});
 try{const base=git(f.repo,'rev-parse','HEAD');writeFileSync(path.join(f.repo,'core.py'),Buffer.from([0xff,0xfe,0x61]));const head=f.commit('non-UTF8');
  const graph=await analyze({repo:f.repo,base,head,repository});assert.ok(graph.warnings.some(w=>w.code==='FILE_ENCODING'));assert.equal(graph.completeness.complete,false);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
