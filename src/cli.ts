import {parseArgs} from 'node:util';
import {analyze} from './analyze.js';
import {writeBundle,canonicalTarget,outputIsOutsideRepository} from './render.js';
import {GitReader} from './git.js';
import {Limits,defaultLimits} from './model.js';
import {lstat} from 'node:fs/promises';
export async function main(args:string[]):Promise<number>{
 let values:Record<string,string|boolean|undefined>,positionals:string[];
 try{
  ({values,positionals}=parseArgs({args,allowPositionals:true,strict:true,options:{repo:{type:'string'},base:{type:'string'},head:{type:'string'},out:{type:'string'},repository:{type:'string'},mode:{type:'string'},'python-roots':{type:'string'},'max-nodes':{type:'string'},'max-depth':{type:'string'},'max-files':{type:'string'},'timeout-ms':{type:'string'},help:{type:'boolean'},version:{type:'boolean'}}}));
  if(values.version){console.log('patchripple 0.1.0');return 0;}
  if(values.help){console.log('patchripple doctor --repo PATH --base REF --head REF --out NEW_PATH\npatchripple analyze --repo PATH --base REF --head REF --repository https://github.com/owner/repo --out NEW_PATH\n[--mode pr|direct] [--python-roots .,src] [--max-nodes N] [--max-depth N] [--max-files N] [--timeout-ms N]\nDoctor checks Node, Git history, exact refs, and output-path safety without writing files. Output must be new and outside the analyzed repository. Target code and configuration are never run.');return 0;}
  if(positionals.length!==1||!['analyze','doctor'].includes(positionals[0])||['repo','base','head','out'].some(k=>typeof values[k]!=='string'||values[k]==='')||positionals[0]==='analyze'&&(typeof values.repository!=='string'||values.repository==='')||values.mode!==undefined&&!['pr','direct'].includes(String(values.mode)))throw new Error('Invalid command or missing required arguments; use --help');
 }catch(e){console.error((e as Error).message);return 2;}
 const limits:Partial<Limits>={};
 for(const [flag,key] of [['max-nodes','maxNodes'],['max-depth','maxDepth'],['max-files','maxFiles'],['timeout-ms','timeoutMs']] as const)if(values[flag]!==undefined){const n=Number(values[flag]);if(!Number.isSafeInteger(n)||n<1||n>defaultLimits[key]){console.error('Invalid limit '+flag+'; ceiling '+defaultLimits[key]);return 2;}limits[key]=n;}
 try{
  if(positionals[0]==='doctor'){
   if(Number(process.versions.node.split('.')[0])<24)throw new Error('Node 24 or newer is required');
   const reader=new GitReader(String(values.repo),defaultLimits),change=reader.revisions(String(values.base),String(values.head),values.mode as 'pr'|'direct'|undefined??'pr');
   const output=await canonicalTarget(String(values.out)),repo=reader.root;
   if(!outputIsOutsideRepository(repo,output))throw new Error('Output path must be outside the analyzed repository');
   try{await lstat(output);throw new Error('Output path already exists; choose a new path');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   console.log(JSON.stringify({ready:true,node:process.versions.node,gitRepository:repo,baseTip:change.baseTipSha,analysisBase:change.analysisBaseSha,head:change.headSha,output}));return 0;
  }
  const graph=await analyze({repo:String(values.repo),base:String(values.base),head:String(values.head),repository:String(values.repository),mode:values.mode as 'pr'|'direct'|undefined,limits,pythonRoots:values['python-roots']===undefined?undefined:String(values['python-roots']).split(',').map(x=>x==='.'?'':x)});
  await writeBundle(graph,String(values.out),String(values.repo));console.log(JSON.stringify({out:values.out,changes:graph.changes.length,candidates:graph.nodes.length,warnings:graph.warnings.length,complete:graph.completeness.complete}));return 0;
 }catch(e){console.error((e as Error).message);return 1;}
}
