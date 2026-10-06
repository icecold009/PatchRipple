import {fixture,git} from '../tests/helpers.js';
import {analyze} from '../src/analyze.js';
import {writeFileSync,rmSync} from 'node:fs';
import {platform,arch,release,totalmem,cpus} from 'node:os';

async function measure(name:string,files:Record<string,string>,changedPath:string,changedSource:string){
 const f=fixture(files);
 try{
  const base=git(f.repo,'rev-parse','HEAD');f.write({[changedPath]:changedSource});const head=f.commit('benchmark '+name);
  const start=performance.now(),graph=await analyze({repo:f.repo,base,head,repository:'https://github.com/example/project'}),elapsedMs=Math.round(performance.now()-start);
  return {name,filesPerRevision:Object.keys(files).length,elapsedMs,rssAfterBytes:process.memoryUsage().rss,changedPaths:graph.changes.length,nodes:graph.nodes.length,edges:graph.edges.length,complete:graph.completeness.complete,omittedNodes:graph.completeness.omittedNodes,omittedEdges:graph.completeness.omittedEdges,warnings:[...new Set(graph.warnings.map(w=>w.code))].sort(),limits:graph.limits};
 }finally{rmSync(f.dir,{recursive:true,force:true});}
}

const deep:Record<string,string>={};for(let i=0;i<1000;i++)deep['src/n'+i+'.ts']=(i?'import "./n'+(i-1)+'";\n':'')+'export const x'+i+'='+i+';';
const wide:Record<string,string>={'src/core.ts':'export const value=1;'};for(let i=0;i<650;i++)wide['src/consumers/c'+String(i).padStart(4,'0')+'.ts']="import '../core'; export const consumer"+i+'=true;';
const python:Record<string,string>={'src/app/__init__.py':'','src/app/core.py':'VALUE = 1'};for(let i=0;i<200;i++)python['src/app/consumer_'+i+'.py']='from app.core import VALUE\nRESULT = VALUE + '+i+'\n';
const scenarios=[];
scenarios.push(await measure('deep-js-chain-1000-files',deep,'src/n0.ts','export const x0=42;'));
scenarios.push(await measure('wide-js-fanout-651-candidates',wide,'src/core.ts','export const value=2;'));
scenarios.push(await measure('python-src-layout-202-files',python,'src/app/core.py','VALUE = 2'));
const evidence={date:new Date().toISOString(),platform:platform(),arch:arch(),osRelease:release(),cpu:cpus()[0]?.model,systemMemoryBytes:totalmem(),method:'Synthetic temporary Git histories; base and head are scanned; these are performance bounds, not real-repository accuracy evidence.',scenarios};
writeFileSync('docs/BENCHMARK.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
