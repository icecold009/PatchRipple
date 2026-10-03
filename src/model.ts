import { Ajv } from 'ajv';
export type Revision = 'base' | 'head';
export type Kind = 'static' | 'type-only' | 'dynamic-literal' | 'require' | 'python';
export interface Warning { code: string; path?: string; revision?: Revision; detail: string }
export interface Change { status: 'A'|'M'|'D'|'R'|'T'; oldPath?: string; newPath?: string }
export interface Edge { from: string; to: string; kind: Kind; revision: Revision }
export interface FileNode { id: string; path: string; roles: ('changed'|'impact'|'test')[]; revisions: Revision[]; owners: string[]; testReasons: string[] }
export interface Limits { maxFiles: number; maxBytes: number; maxFileBytes: number; maxNodes: number; maxEdges: number; maxDepth: number; timeoutMs: number }
export const defaultLimits: Limits = {maxFiles:5000,maxBytes:40*1024*1024,maxFileBytes:512*1024,maxNodes:500,maxEdges:2000,maxDepth:20,timeoutMs:60000};
export interface Graph {
 schemaVersion: 1; repository: {name:string;url:string};
 change: {baseTipSha:string;analysisBaseSha:string;headSha:string;pullRequest?:number;mode:'pr'|'direct'};
 changes: Change[]; nodes: FileNode[]; edges: Edge[]; warnings: Warning[];
 completeness: {complete:boolean;omittedNodes:number;omittedEdges:number};
 limits: Limits;
}
const str={type:'string'}; const sha={type:'string',pattern:'^[a-f0-9]{40,64}$'};
const revision={enum:['base','head']};
const properties={
 schemaVersion:{const:1}, repository:{type:'object',additionalProperties:false,required:['name','url'],properties:{name:str,url:str}},
 change:{type:'object',additionalProperties:false,required:['baseTipSha','analysisBaseSha','headSha','mode'],properties:{baseTipSha:sha,analysisBaseSha:sha,headSha:sha,mode:{enum:['pr','direct']},pullRequest:{type:'integer',minimum:1}}},
 changes:{type:'array',items:{type:'object',additionalProperties:false,required:['status'],properties:{status:{enum:['A','M','D','R','T']},oldPath:str,newPath:str}}},
 nodes:{type:'array',items:{type:'object',additionalProperties:false,required:['id','path','roles','revisions','owners','testReasons'],properties:{id:str,path:str,roles:{type:'array',uniqueItems:true,items:{enum:['changed','impact','test']}},revisions:{type:'array',minItems:1,uniqueItems:true,items:revision},owners:{type:'array',uniqueItems:true,items:str},testReasons:{type:'array',uniqueItems:true,items:str}}}},
 edges:{type:'array',items:{type:'object',additionalProperties:false,required:['from','to','kind','revision'],properties:{from:str,to:str,revision,kind:{enum:['static','type-only','dynamic-literal','require','python']}}}},
 warnings:{type:'array',items:{type:'object',additionalProperties:false,required:['code','detail'],properties:{code:str,detail:str,path:str,revision}}},
 completeness:{type:'object',additionalProperties:false,required:['complete','omittedNodes','omittedEdges'],properties:{complete:{type:'boolean'},omittedNodes:{type:'integer',minimum:0},omittedEdges:{type:'integer',minimum:0}}},
 limits:{type:'object',additionalProperties:false,required:Object.keys(defaultLimits),properties:Object.fromEntries(Object.keys(defaultLimits).map(k=>[k,{type:'integer',minimum:1}]))}
};
export const graphSchema={ $schema:'http://json-schema.org/draft-07/schema#',type:'object',additionalProperties:false,required:Object.keys(properties),properties };
const validate=new Ajv({allErrors:true}).compile(graphSchema);
export function safePath(p:string): boolean {
 return !!p && !p.includes('\0') && !p.includes('\\') && !/^[A-Za-z]:|^\//.test(p) && p.split('/').every(s=>!!s && s!=='.' && s!=='..');
}
export function repositoryUrl(s:string): string {
 const u=new URL(s);
 if(u.protocol!=='https:' || u.hostname!=='github.com' || u.username || u.password || u.search || u.hash || u.port || !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(u.pathname)) throw new Error('Repository URL must be an uncredentialed HTTPS GitHub repository URL');
 return s.replace(/\/$/,'');
}
export function validateGraph(input:unknown): asserts input is Graph {
 if(!validate(input)) throw new Error('Invalid graph schema: '+JSON.stringify(validate.errors));
 const g=input as unknown as Graph; repositoryUrl(g.repository.url);
 const nodes=new Map<string,FileNode>();
 for(const n of g.nodes){if(!safePath(n.path)||n.id!=='file:'+n.path||nodes.has(n.id))throw new Error('Invalid or duplicate node path');nodes.set(n.id,n);}
 for(const c of g.changes){
  if((c.oldPath && !safePath(c.oldPath))||(c.newPath&&!safePath(c.newPath)))throw new Error('Unsafe change path');
  if(c.status==='A' ? !c.newPath||!!c.oldPath : c.status==='D' ? !c.oldPath||!!c.newPath : !c.oldPath||!c.newPath) throw new Error('Invalid change revision presence');
 }
 const edgeKeys=new Set<string>();
 for(const e of g.edges){const a=nodes.get(e.from),b=nodes.get(e.to);const key=JSON.stringify(e);
  if(!a||!b||!a.revisions.includes(e.revision)||!b.revisions.includes(e.revision)||edgeKeys.has(key)) throw new Error('Invalid edge endpoints/revision or duplicate edge');edgeKeys.add(key);}
 if(g.nodes.length>g.limits.maxNodes||g.edges.length>g.limits.maxEdges)throw new Error('Graph exceeds declared limits');
 if(g.completeness.complete && (g.warnings.length||g.completeness.omittedNodes||g.completeness.omittedEdges))throw new Error('Incomplete graph cannot claim completeness');
}
export const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
export const nodeId=(p:string)=>'file:'+p;
