import {parseArgs} from 'node:util';
import {analyze} from './analyze.js';
import {writeBundle} from './render.js';
import {Limits,defaultLimits} from './model.js';
export async function main(args:string[]):Promise<number>{
 let values:Record<string,string|boolean|undefined>,positionals:string[];
 try{
  ({values,positionals}=parseArgs({args,allowPositionals:true,strict:true,options:{repo:{type:'string'},base:{type:'string'},head:{type:'string'},out:{type:'string'},repository:{type:'string'},mode:{type:'string'},'python-roots':{type:'string'},'max-nodes':{type:'string'},'max-depth':{type:'string'},'max-files':{type:'string'},'timeout-ms':{type:'string'},help:{type:'boolean'},version:{type:'boolean'}}}));
  if(values.version){console.log('patchripple 0.1.0');return 0;}
  if(values.help){console.log('patchripple analyze --repo PATH --base REF --head REF --repository https://github.com/owner/repo --out NEW_PATH\n[--mode pr|direct] [--python-roots .,src] [--max-nodes N] [--max-depth N] [--max-files N] [--timeout-ms N]\nOutput must be new and outside the analyzed repository. Reads Git blobs; never runs target code.');return 0;}
  if(positionals.length!==1||positionals[0]!=='analyze'||['repo','base','head','out','repository'].some(k=>typeof values[k]!=='string'||values[k]==='')||values.mode!==undefined&&!['pr','direct'].includes(String(values.mode)))throw new Error('Invalid command or missing required arguments; use --help');
 }catch(e){console.error((e as Error).message);return 2;}
 const limits:Partial<Limits>={};
 for(const [flag,key] of [['max-nodes','maxNodes'],['max-depth','maxDepth'],['max-files','maxFiles'],['timeout-ms','timeoutMs']] as const)if(values[flag]!==undefined){const n=Number(values[flag]);if(!Number.isSafeInteger(n)||n<1||n>defaultLimits[key]){console.error('Invalid limit '+flag+'; ceiling '+defaultLimits[key]);return 2;}limits[key]=n;}
 try{
  const graph=await analyze({repo:String(values.repo),base:String(values.base),head:String(values.head),repository:String(values.repository),mode:values.mode as 'pr'|'direct'|undefined,limits,pythonRoots:values['python-roots']===undefined?undefined:String(values['python-roots']).split(',').map(x=>x==='.'?'':x)});
  await writeBundle(graph,String(values.out),String(values.repo));console.log(JSON.stringify({out:values.out,changes:graph.changes.length,candidates:graph.nodes.length,warnings:graph.warnings.length,complete:graph.completeness.complete}));return 0;
 }catch(e){console.error((e as Error).message);return 1;}
}
