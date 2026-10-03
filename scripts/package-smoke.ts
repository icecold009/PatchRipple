import {mkdtempSync,copyFileSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fixture,git} from '../tests/helpers.js';
import {validateGraph} from '../src/model.js';
const f=fixture({'src/core.ts':'export const x=1;','src/api.ts':"import './core';",'pkg/__init__.py':'','pkg/core.py':'x=1','pkg/api.py':'from .core import x'});
const isolated=mkdtempSync(path.join(tmpdir(),'patchripple-package-'));
try{
 for(const name of readdirSync('dist'))copyFileSync('dist/'+name,path.join(isolated,name));
 writeFileSync(path.join(isolated,'package.json'),JSON.stringify({type:'commonjs'}));
 copyFileSync(path.join(isolated,'cli.cjs'),path.join(isolated,'patchripple'));
 const namedCommand=spawnSync(process.execPath,[path.join(isolated,'patchripple'),'--version'],{encoding:'utf8',cwd:isolated,timeout:60000,windowsHide:true});
 assert.equal(namedCommand.status,0,namedCommand.stderr);assert.equal(namedCommand.stdout.trim(),'patchripple 0.1.0');
 assert.throws(()=>createRequire(path.join(isolated,'cli.cjs')).resolve('typescript'));
 const base=git(f.repo,'rev-parse','HEAD');f.write({'src/core.ts':'export const x=2;','pkg/core.py':'x=2'});const head=f.commit('package comparison');
 const args=['analyze','--repo',f.repo,'--base',base,'--head',head,'--repository','https://github.com/example/project','--out',path.join(isolated,'cli-output')];
 const result=spawnSync(process.execPath,[path.join(isolated,'cli.cjs'),...args],{encoding:'utf8',cwd:isolated,env:{...process.env,NODE_PATH:''},timeout:60000,windowsHide:true});
 assert.equal(result.status,0,result.stderr);const graph=JSON.parse(readFileSync(path.join(isolated,'cli-output','graph.json'),'utf8'));validateGraph(graph);
 assert.ok(graph.nodes.some(n=>n.path==='src/api.ts'));assert.ok(graph.nodes.some(n=>n.path==='pkg/api.py'));
 const outputs=path.join(isolated,'action-output.txt'),summary=path.join(isolated,'action-summary.md');
 const action=spawnSync(process.execPath,[path.join(isolated,'action.cjs')],{encoding:'utf8',cwd:isolated,timeout:60000,windowsHide:true,env:{...process.env,NODE_PATH:'',INPUT_REPO:f.repo,INPUT_BASE:base,INPUT_HEAD:head,INPUT_REPOSITORY:'https://github.com/example/project',INPUT_OUT:path.join(isolated,'action-output'),GITHUB_OUTPUT:outputs,GITHUB_STEP_SUMMARY:summary}});
 assert.equal(action.status,0,action.stderr);validateGraph(JSON.parse(readFileSync(path.join(isolated,'action-output','graph.json'),'utf8')));assert.ok(readFileSync(summary,'utf8').includes(head));assert.ok(readFileSync(outputs,'utf8').includes('bundle-path'));
 console.log(JSON.stringify({isolated:true,nodeModulesUnavailable:true,namedCliEntry:true,cli:true,action:true,jsTs:true,pythonWasm:true,summaryOutputs:true}));
}finally{rmSync(isolated,{recursive:true,force:true});rmSync(f.dir,{recursive:true,force:true});}
