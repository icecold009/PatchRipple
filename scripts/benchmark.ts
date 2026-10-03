import {fixture,git} from '../tests/helpers.js';
import {analyze} from '../src/analyze.js';
import {writeFileSync,rmSync} from 'node:fs';
import {platform,arch,release,totalmem,cpus} from 'node:os';
const files:Record<string,string>={};
for(let i=0;i<1000;i++)files['src/n'+i+'.ts']=(i?'import "./n'+(i-1)+'";\n':'')+'export const x'+i+'='+i+';';
const f=fixture(files);
try{
 const base=git(f.repo,'rev-parse','HEAD');f.write({'src/n0.ts':'export const x0=42;'});const head=f.commit('benchmark');
 const start=performance.now();const g=await analyze({repo:f.repo,base,head,repository:'https://github.com/example/project'});const elapsedMs=performance.now()-start;
 const evidence={date:new Date().toISOString(),platform:platform(),arch:arch(),osRelease:release(),cpu:cpus()[0]?.model,systemMemoryBytes:totalmem(),filesPerRevision:1000,elapsedMs:Math.round(elapsedMs),rssAfterBytes:process.memoryUsage().rss,nodes:g.nodes.length,warnings:g.warnings.map(w=>w.code),limits:g.limits};
 writeFileSync('docs/BENCHMARK.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{rmSync(f.dir,{recursive:true,force:true});}
