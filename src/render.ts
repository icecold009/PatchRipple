import {mkdir,writeFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {Graph,validateGraph} from './model.js';
import {html,svg,escapeHTML} from './viewer.js';
export {html,svg,escapeHTML,sourceLink} from './viewer.js';
export function summary(graph:Graph):string {
 return '## PatchRipple static impact map\n\n'+(graph.completeness.complete?'Complete within supported syntax.':'**Incomplete analysis: inspect warnings.**')+'\n\n'+graph.changes.length+' changes; '+graph.nodes.length+' candidates; '+graph.warnings.length+' warnings. Static candidates are not runtime or safety proof.\n\n<pre>'+escapeHTML(graph.nodes.slice(0,30).map(n=>n.path+' ['+n.roles.join(',')+']').join('\n'))+'</pre>\n\nBase: '+graph.change.analysisBaseSha+'\nHead: '+graph.change.headSha+'\n';
}
export async function canonicalTarget(target:string):Promise<string>{
 let parent=path.resolve(target),tail:string[]=[];
 while(true){try{return path.join(await realpath(parent),...tail.reverse());}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const next=path.dirname(parent);if(next===parent)throw e;tail.push(path.basename(parent));parent=next;}}
}
export function outputIsOutsideRepository(root:string,target:string):boolean{
 const relative=path.relative(root,target);return relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative);
}
export async function writeBundle(graph:Graph,out:string,repo:string,generatedAt=new Date().toISOString()):Promise<void>{
 validateGraph(graph);const target=await canonicalTarget(out),root=await realpath(repo);
 if(!outputIsOutsideRepository(root,target))throw new Error('Output must be outside analyzed repository');
 try{await lstat(target);throw new Error('Output path already exists; choose a new path');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 await mkdir(target,{recursive:true});
 const outputs={'graph.json':JSON.stringify(graph,null,2)+'\n','index.html':html(graph),'graph.svg':svg(graph),'metadata.json':JSON.stringify({generatedAt,tool:'PatchRipple',version:'0.1.0',completeness:graph.completeness},null,2)+'\n'};
 for(const [name,contents] of Object.entries(outputs))await writeFile(path.join(target,name),contents,{flag:'wx'});
}
