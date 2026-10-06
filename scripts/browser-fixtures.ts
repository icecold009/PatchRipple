import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {html} from '../src/viewer.js';
import {defaultLimits,Graph,FileNode,Edge} from '../src/model.js';

const output=path.resolve(process.env.PATCHRIPPLE_EDGE_FIXTURES??'.tmp/browser-edge-fixtures');
const base='a'.repeat(40),head='b'.repeat(40),repository={name:'example/browser-fixtures',url:'https://github.com/example/browser-fixtures'};
const change={baseTipSha:base,analysisBaseSha:base,headSha:head,mode:'direct' as const};
const bundle=(changes:Graph['changes'],nodes:FileNode[],edges:Edge[],warnings:Graph['warnings']=[],omittedNodes=0):Graph=>({schemaVersion:1,repository,change,changes,nodes,edges,warnings,completeness:{complete:warnings.every(w=>w.category==='expected-external')&&omittedNodes===0,omittedNodes,omittedEdges:0},limits:defaultLimits});
const empty=bundle([],[],[]);
const paths=['src/changed.ts',...Array.from({length:83},(_,i)=>'src/related/'+String(i).padStart(3,'0')+'.ts'),'zz-deep-dependent.ts'];
const largeNodes:FileNode[]=paths.map((file,index)=>({id:'file:'+file,path:file,roles:[index===0?'changed':'impact'],revisions:['head'],owners:[],testReasons:[]}));
const largeEdges:Edge[]=[];
for(let i=1;i<=81;i++)largeEdges.push({from:'file:'+paths[i],to:'file:'+paths[0],kind:'static',revision:'head'});
largeEdges.push({from:'file:'+paths[83],to:'file:'+paths[82],kind:'static',revision:'head'});
largeEdges.push({from:'file:'+paths[84],to:'file:'+paths[83],kind:'static',revision:'head'});
largeEdges.push({from:'file:'+paths[82],to:'file:'+paths[0],kind:'static',revision:'head'});
const large=bundle([{status:'M',oldPath:paths[0],newPath:paths[0]}],largeNodes,largeEdges);
const incompleteNodes:FileNode[]=paths.slice(0,2).map((file,index)=>({id:'file:'+file,path:file,roles:[index===0?'changed':'impact'],revisions:['head'],owners:[],testReasons:[]}));
const incomplete=bundle([{status:'M',oldPath:paths[0],newPath:paths[0]}],incompleteNodes,[{from:'file:'+paths[1],to:'file:'+paths[0],kind:'static',revision:'head'}],[{code:'NODE_LIMIT',category:'resource-limit',detail:'3 candidate nodes omitted'}],3);

await mkdir(output,{recursive:true});
for(const [name,graph] of Object.entries({empty,large,incomplete}))await writeFile(path.join(output,name+'.html'),html(graph),'utf8');
console.log(JSON.stringify({fixtures:Object.keys({empty,large,incomplete}),output}));
