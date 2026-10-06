import {readFile,appendFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {analyze} from './analyze.js';
import {writeBundle,summary} from './render.js';
import {Limits} from './model.js';
export async function runAction(env:NodeJS.ProcessEnv=process.env):Promise<void>{
 const input=(key:string)=>env['INPUT_'+key.toUpperCase()]??'';
 const event=env.GITHUB_EVENT_PATH?JSON.parse(await readFile(env.GITHUB_EVENT_PATH,'utf8')):{};
 const pr=event.pull_request;
 const base=input('base')||pr?.base?.sha,head=input('head')||pr?.head?.sha;
 if(typeof base!=='string'||typeof head!=='string')throw new Error('Provide base and head commit SHAs or a pull_request event');
 // Only full SHAs in hosted input; the caller must fetch exact objects first.
 if(!/^[a-f0-9]{40,64}$/.test(base)||!/^[a-f0-9]{40,64}$/.test(head))throw new Error('Action base/head must be full commit SHAs');
 const repository=input('repository')||(env.GITHUB_REPOSITORY?'https://github.com/'+env.GITHUB_REPOSITORY:'');
 const repo=path.resolve(input('repo')||env.GITHUB_WORKSPACE||'.');
 const out=path.resolve(input('out')||path.join(env.RUNNER_TEMP||path.dirname(repo),'patchripple-'+randomUUID()));
 const limits:Partial<Limits>={};
 for(const [name,key] of [['max-nodes','maxNodes'],['max-files','maxFiles'],['max-depth','maxDepth'],['timeout-ms','timeoutMs']] as const)if(input(name))limits[key]=Number(input(name));
 const graph=await analyze({repo,base,head,repository,limits,pullRequest:Number.isSafeInteger(pr?.number)?pr.number:undefined,pythonRoots:input('python-roots')?input('python-roots').split(',').map(x=>x==='.'?'':x):undefined});
 await writeBundle(graph,out,repo);
 if(env.GITHUB_STEP_SUMMARY)await appendFile(env.GITHUB_STEP_SUMMARY,summary(graph));
 if(env.GITHUB_OUTPUT){
  for(const [key,value] of Object.entries({'bundle-path':out,'changed-count':graph.changes.length,'candidate-count':graph.nodes.length,'warning-count':graph.warnings.length,'complete':graph.completeness.complete})){
   const delimiter='patchripple_'+randomUUID();await appendFile(env.GITHUB_OUTPUT,key+'<<'+delimiter+'\n'+String(value)+'\n'+delimiter+'\n');
  }
 }
 console.log(JSON.stringify({changes:graph.changes.length,candidates:graph.nodes.length,complete:graph.completeness.complete}));
}
if(process.argv[1]&&/action\.(?:ts|js|cjs)$/.test(process.argv[1]))void runAction().catch(()=>{console.error('PatchRipple analysis failed. Check required inputs, fetched Git objects, trusted limits, and a new output path outside the analyzed repository.');process.exitCode=1;});
