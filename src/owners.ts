import {Warning,compare} from './model.js';

type Token={kind:'literal';value:string}|{kind:'one'}|{kind:'star'|'globstar'|'globstar-dir'};
interface Rule {tokens:Token[];rooted:boolean;allowDescendants:boolean;owners:string[]}
const MAX_OWNER_PATTERN_LENGTH=512;
const MAX_OWNER_RULES=2048;
const MAX_OWNER_PATH_LENGTH=4096;
const MAX_OWNER_MATCH_WORK=20_000_000;

function tokenize(pattern:string):Token[]{
 const tokens:Token[]=[];
 for(let i=0;i<pattern.length;i++){
  const c=pattern[i];
  if(c==='*'&&pattern[i+1]==='*'){
   i++;if(pattern[i+1]==='/'){i++;tokens.push({kind:'globstar-dir'});}else tokens.push({kind:'globstar'});
  }else if(c==='*')tokens.push({kind:'star'});
  else if(c==='?')tokens.push({kind:'one'});
  else tokens.push({kind:'literal',value:c});
 }
 return tokens;
}

function matches(rule:Rule,path:string):boolean {
 const length=path.length;let current=new Uint8Array(length+1),next=new Uint8Array(length+1);
 current[0]=1;if(!rule.rooted)for(let i=1;i<=length;i++)if(path[i-1]==='/')current[i]=1;
 for(const token of rule.tokens){
  next.fill(0);
  if(token.kind==='literal'){
   for(let i=0;i<length;i++)if(current[i]&&path[i]===token.value)next[i+1]=1;
  }else if(token.kind==='one'){
   for(let i=0;i<length;i++)if(current[i]&&path[i]!=='/')next[i+1]=1;
  }else if(token.kind==='star'){
   for(let i=0;i<=length;i++)if(current[i]||(i>0&&path[i-1]!=='/'&&next[i-1]))next[i]=1;
  }else if(token.kind==='globstar'){
   for(let i=0;i<=length;i++)if(current[i]||(i>0&&next[i-1]))next[i]=1;
  }else{
   let canConsume=false;
   for(let i=0;i<=length;i++){
    if(current[i]||(i>0&&canConsume&&path[i-1]==='/'))next[i]=1;
    if(current[i])canConsume=true;
   }
  }
  [current,next]=[next,current];
 }
 for(let i=0;i<=length;i++)if(current[i]&&(i===length||rule.allowDescendants&&path[i]==='/'))return true;
 return false;
}

export function compileOwners(files:Map<string,string>):{match:(path:string)=>string[];warnings:Warning[]}{
 const selected=['.github/CODEOWNERS','CODEOWNERS','docs/CODEOWNERS'].find(p=>files.has(p));
 const warnings:Warning[]=[],rules:Rule[]=[];
 if(!selected)return {match:()=>[],warnings};
 const warn=(detail:string)=>warnings.push({code:'CODEOWNERS_UNSUPPORTED',path:selected,revision:'base',detail});
 let warnedLongPattern=false,warnedRuleLimit=false,remainingWork=MAX_OWNER_MATCH_WORK,warnedWorkLimit=false;
 for(const line of files.get(selected)!.split(/\r?\n/)){
  const trimmed=line.replace(/\s+#.*$/,'').trim();if(!trimmed||trimmed.startsWith('#'))continue;const parts=trimmed.split(/\s+/);const raw=parts.shift()!;
  if(/[!\[\]\\]/.test(raw)||raw.includes('***')||parts.some(x=>!/^@[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$|^[^@\s]+@[^@\s]+$/.test(x))){
   warn('Unsupported CODEOWNERS pattern/owner line');continue;
  }
  if(raw.length>MAX_OWNER_PATTERN_LENGTH){if(!warnedLongPattern){warn('Pattern length limit reached; overlong rules were ignored');warnedLongPattern=true;}continue;}
  if(rules.length>=MAX_OWNER_RULES){if(!warnedRuleLimit)warn('Rule count limit reached; remaining rules were ignored');warnedRuleLimit=true;break;}
  let pattern=raw.replace(/^\//,'');const directory=pattern.endsWith('/');pattern=pattern.replace(/\/$/,'');
  const rooted=raw.startsWith('/')||pattern.includes('/'),wildcardTail=/[*?]/.test(pattern.split('/').at(-1)!);
  rules.push({tokens:tokenize(pattern),rooted,allowDescendants:directory||!wildcardTail,owners:[...new Set(parts)].sort(compare)});
 }
 return {match:p=>{
  let result:string[]=[];
  if(p.length>MAX_OWNER_PATH_LENGTH){if(!warnedWorkLimit){warn('Path length limit reached; remaining ownership matches were skipped');warnedWorkLimit=true;}return result;}
  for(const rule of rules){
   const cost=rule.tokens.length*(p.length+1);
   if(cost>remainingWork){if(!warnedWorkLimit){warn('Matching stopped at the deterministic work limit; ownership may be incomplete');warnedWorkLimit=true;}break;}
   remainingWork-=cost;if(matches(rule,p))result=rule.owners;
  }
  return result;
 },warnings};
}
