import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
export function git(repo:string,...args:string[]):string{
 const result=spawnSync('git',['-C',repo,...args],{encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error(result.stderr);return result.stdout.trim();
}
export function fixture(files:Record<string,string>):{repo:string;dir:string;write:(files:Record<string,string>)=>void;commit:(message:string)=>string}{
 mkdirSync('.tmp',{recursive:true});const dir=mkdtempSync(path.resolve('.tmp','fixture-'));const repo=path.join(dir,'repo');mkdirSync(repo);
 git(repo,'init','-b','main');git(repo,'config','user.name','PatchRipple fixture');git(repo,'config','user.email','fixture@example.invalid');git(repo,'config','core.autocrlf','false');git(repo,'config','commit.gpgsign','false');
 const write=(items:Record<string,string>)=>{for(const [p,text]of Object.entries(items)){mkdirSync(path.dirname(path.join(repo,p)),{recursive:true});writeFileSync(path.join(repo,p),text);}};
 const commit=(message:string)=>{git(repo,'add','--all');git(repo,'commit','--allow-empty','-m',message);return git(repo,'rev-parse','HEAD');};
 write(files);commit('base');return {repo,dir,write,commit};
}
