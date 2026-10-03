import {GitReader,Snapshot} from './git.js';
import {scan} from './scan.js';
import {compileOwners} from './owners.js';
import {Graph,Limits,defaultLimits,Warning,Revision,Edge,FileNode,compare,nodeId,repositoryUrl,safePath,validateGraph} from './model.js';
import path from 'node:path';
export interface Options {repo:string;base:string;head:string;repository:string;mode?:'pr'|'direct';limits?:Partial<Limits>;pythonRoots?:string[];pullRequest?:number}
export async function analyze(options:Options):Promise<Graph>{
 const limits={...defaultLimits,...options.limits};
 for(const [key,value] of Object.entries(limits))if(!Number.isSafeInteger(value)||value<1||value>defaultLimits[key as keyof Limits])throw new Error('Limits must be positive integers at or below trusted defaults');
 const roots=options.pythonRoots??['','src'];if(roots.some(r=>r!==''&&!safePath(r)))throw new Error('Unsafe Python source root');
 const url=repositoryUrl(options.repository);const reader=new GitReader(options.repo,limits);const change=reader.revisions(options.base,options.head,options.mode??'pr');
 if(options.pullRequest!==undefined)change.pullRequest=options.pullRequest;
 const changes=reader.changes(change.analysisBaseSha,change.headSha);
 const snapshots:Record<Revision,Snapshot>={base:reader.snapshot(change.analysisBaseSha,'base'),head:reader.snapshot(change.headSha,'head')};
 const scans={base:await scan(snapshots.base,'base',roots,reader.deadline),head:await scan(snapshots.head,'head',roots,reader.deadline)};
 const ownerSnapshot=change.baseTipSha===change.analysisBaseSha?snapshots.base:reader.snapshot(change.baseTipSha,'base',['.github/CODEOWNERS','CODEOWNERS','docs/CODEOWNERS']);
 const ownership=compileOwners(ownerSnapshot.files);const warnings:Warning[]=[...scans.base.warnings,...scans.head.warnings,...ownership.warnings,...(ownerSnapshot===snapshots.base?[]:ownerSnapshot.warnings)];
 for(const c of changes)if(/(?:^|\/)(?:tsconfig[^/]*\.json|package\.json|pyproject\.toml|setup\.cfg)$/.test(c.newPath??c.oldPath??''))warnings.push({code:'CONFIG_CHANGE',path:c.newPath??c.oldPath,detail:'Configuration change may affect relationships beyond statically discovered imports'});
 const included=new Map<string,Set<FileNode['roles'][number]>>();let omittedNodes=0;const omitted=new Set<string>();
 const include=(p:string,role:FileNode['roles'][number]):boolean=>{
  if(included.has(p)){included.get(p)!.add(role);return true;}
  if(included.size>=limits.maxNodes){if(!omitted.has(p)){omitted.add(p);omittedNodes++;}return false;}
  included.set(p,new Set([role]));return true;
 };
 const changedPaths=[...new Set(changes.flatMap(c=>[c.oldPath,c.newPath].filter((x):x is string=>!!x)))].sort(compare);
 for(const p of changedPaths)include(p,'changed');
 for(const revision of ['base','head'] as const){
  const reverse=new Map<string,string[]>();
  for(const e of scans[revision].edges){const deps=reverse.get(e.to)??[];deps.push(e.from.slice(5));reverse.set(e.to,deps);}
  const queue=changedPaths.filter(p=>snapshots[revision].paths.has(p)).map(p=>({p,depth:0}));const seen=new Set(queue.map(x=>x.p));
  for(let i=0;i<queue.length;i++){
   const current=queue[i];const dependents=reverse.get(nodeId(current.p))??[];
   for(const p of dependents.sort(compare)){
    if(seen.has(p))continue;
    if(current.depth>=limits.maxDepth){warnings.push({code:'DEPTH_LIMIT',path:current.p,revision,detail:'Reverse import traversal depth limit reached'});continue;}
    seen.add(p);if(include(p,'impact'))queue.push({p,depth:current.depth+1});
   }
  }
 }
 const testReasons=new Map<string,Set<string>>();
 const testFile=(p:string)=>/(?:^|\/)(?:tests?|__tests__)\//.test(p)||/(?:\.test|\.spec)\.[^/]+$|(?:^|\/)test_[^/]+\.py$|_test\.py$/.test(p);
 const relate=(p:string,reason:string)=>{if(include(p,'test')){const reasons=testReasons.get(p)??new Set();reasons.add(reason);testReasons.set(p,reasons);}};
 for(const [p,roles] of included)if(testFile(p)){roles.add('test');relate(p,'Static reverse import relationship or changed test');}
 const targets=[...included.keys()].filter(p=>!testFile(p));
 for(const revision of ['base','head'] as const){
  for(const p of snapshots[revision].files.keys())if(testFile(p)){
   for(const t of targets){
    const ext=path.posix.extname(t),stem=path.posix.basename(t,ext);const dir=path.posix.dirname(t);const parent=path.posix.dirname(dir);
    const candidatePaths=[dir+'/'+stem+'.test'+ext,dir+'/'+stem+'.spec'+ext,dir+'/__tests__/'+stem+'.test'+ext,parent+'/tests/'+stem+'.test'+ext,dir+'/test_'+stem+'.py',parent+'/tests/test_'+stem+'.py',dir+'/'+stem+'_test.py'].map(p=>path.posix.normalize(p));
    if(candidatePaths.includes(p))relate(p,'Naming convention for '+t+' ('+revision+')');
   }
  }
 }
 const nodes:FileNode[]=[...included].map(([p,roles])=>({
  id:nodeId(p),path:p,roles:[...roles].sort(compare),revisions:(['base','head'] as Revision[]).filter(r=>snapshots[r].paths.has(p)),owners:ownership.match(p),testReasons:[...(testReasons.get(p)??[])].sort(compare)
 })).sort((a,b)=>compare(a.path,b.path));
 const edgeCandidates=[...scans.base.edges,...scans.head.edges].filter(e=>included.has(e.from.slice(5))&&included.has(e.to.slice(5))).sort((a,b)=>compare(JSON.stringify(a),JSON.stringify(b)));
 const edges:Edge[]=edgeCandidates.slice(0,limits.maxEdges);const omittedEdges=edgeCandidates.length-edges.length;
 if(omittedNodes)warnings.push({code:'NODE_LIMIT',detail:omittedNodes+' candidate nodes omitted'});
 if(omittedEdges)warnings.push({code:'EDGE_LIMIT',detail:omittedEdges+' candidate edges omitted'});
 const uniqueWarnings=[...new Map(warnings.map(w=>[JSON.stringify(w),w])).values()].sort((a,b)=>compare(JSON.stringify(a),JSON.stringify(b)));
 const graph:Graph={schemaVersion:1,repository:{name:new URL(url).pathname.slice(1),url},change,changes,nodes,edges,warnings:uniqueWarnings,completeness:{complete:uniqueWarnings.length===0,omittedNodes,omittedEdges},limits};
 validateGraph(graph);return graph;
}
