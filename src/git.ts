import {spawnSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {Graph,Limits,Change,Warning,Revision,safePath} from './model.js';
export interface Snapshot {files:Map<string,string>;paths:Set<string>;warnings:Warning[]}
export class GitReader {
 readonly root:string; readonly deadline:number;
 constructor(repo:string,readonly limits:Limits){this.root=realpathSync(repo);this.deadline=Date.now()+limits.timeoutMs;this.run(['rev-parse','--show-toplevel']);}
 run(args:string[],input?:Buffer|string,maxBuffer=this.limits.maxBytes+4*1024*1024):Buffer {
  const remaining=this.deadline-Date.now(); if(remaining<=0)throw new Error('Analysis time limit exceeded');
  const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'};
  for(const k of Object.keys(env))if(/^GIT_CONFIG_(?:COUNT|KEY_|VALUE_)/.test(k)||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(k))delete (env as Record<string,string|undefined>)[k];
  const result=spawnSync('git',['--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-C',this.root,...args],{input,env,timeout:remaining,maxBuffer,windowsHide:true});
  if(result.error||result.status!==0)throw new Error('Git input unavailable or limit exceeded: '+args[0]+'. Verify repository, commit objects, and fetch history.');
  return result.stdout;
 }
 ref(ref:string):string {
  if(!ref||ref.startsWith('-')||/[\0\r\n]/.test(ref))throw new Error('Invalid commit reference');
  return this.run(['rev-parse','--verify','--end-of-options',ref+'^{commit}']).toString().trim();
 }
 revisions(base:string,head:string,mode:'pr'|'direct'):Graph['change'] {
  const baseTipSha=this.ref(base),headSha=this.ref(head);
  const analysisBaseSha=mode==='direct'?baseTipSha:this.run(['merge-base',baseTipSha,headSha]).toString().trim();
  return {baseTipSha,analysisBaseSha,headSha,mode};
 }
 changes(base:string,head:string):Change[] {
  const parts=new TextDecoder('utf-8',{fatal:true}).decode(this.run(['diff','--no-ext-diff','--no-textconv','--name-status','-z','--find-renames',base,head,'--'])).split('\0').filter(Boolean);
  const out:Change[]=[];
  for(let i=0;i<parts.length;){const raw=parts[i++];const a=parts[i++];if(!a||!safePath(a))throw new Error('Unsafe or malformed Git path');
   if(raw.startsWith('R')){const b=parts[i++];if(!b||!safePath(b))throw new Error('Unsafe rename path');out.push({status:'R',oldPath:a,newPath:b});}
   else if(raw==='A')out.push({status:'A',newPath:a});else if(raw==='D')out.push({status:'D',oldPath:a});
   else if(raw==='M'||raw==='T')out.push({status:raw,oldPath:a,newPath:a});else throw new Error('Unsupported Git change status');
  }
  return out;
 }
 snapshot(sha:string,revision:Revision,selectedPaths?:string[]):Snapshot {
  const records=new TextDecoder('utf-8',{fatal:true}).decode(this.run(['ls-tree','-r','-z','-l',sha,...(selectedPaths?['--',...selectedPaths]:[])])).split('\0').filter(Boolean);
  const paths=new Set<string>(), files=new Map<string,string>(), warnings:Warning[]=[];
  const selected:{path:string;oid:string;size:number}[]=[];let bytes=0;
  for(const record of records){
   const tab=record.indexOf('\t');const p=record.slice(tab+1);const [mode,type,oid,sizeRaw]=record.slice(0,tab).trim().split(/\s+/);const size=Number(sizeRaw);
   if(!safePath(p))throw new Error('Unsafe Git tree path');paths.add(p);
   const warn=(code:string,detail:string)=>warnings.push({code,path:p,revision,detail});
   if(type!=='blob'||!['100644','100755'].includes(mode)){warn('SKIPPED_ENTRY','Symlink or submodule not followed');continue;}
   if(selected.length>=this.limits.maxFiles){warn('FILE_LIMIT','File count limit reached');continue;}
   if(size>this.limits.maxFileBytes||bytes+size>this.limits.maxBytes){warn('BYTE_LIMIT','Source byte limit reached');continue;}
   bytes+=size;selected.push({path:p,oid,size});
  }
  if(selected.length){
   const result=this.run(['cat-file','--batch'],selected.map(x=>x.oid).join('\n')+'\n');let offset=0;
   for(const item of selected){const end=result.indexOf(10,offset);if(end<0)throw new Error('Malformed blob response');const header=result.subarray(offset,end).toString().split(' ');const n=Number(header[2]);
    if(header[0]!==item.oid||header[1]!=='blob'||n!==item.size)throw new Error('Blob metadata mismatch');offset=end+1;
    const data=result.subarray(offset,offset+n);offset+=n+1;
    if(data.includes(0)){warnings.push({code:'BINARY_FILE',path:item.path,revision,detail:'Binary content skipped'});continue;}
    try{files.set(item.path,new TextDecoder('utf-8',{fatal:true}).decode(data));}catch{warnings.push({code:'FILE_ENCODING',path:item.path,revision,detail:'Non-UTF8 source excluded'});}
   }
  }
  return {files,paths,warnings};
 }
}
