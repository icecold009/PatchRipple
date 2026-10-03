import {Warning,compare} from './model.js';
export function compileOwners(files:Map<string,string>):{match:(path:string)=>string[];warnings:Warning[]}{
 const selected=['.github/CODEOWNERS','CODEOWNERS','docs/CODEOWNERS'].find(p=>files.has(p));
 const warnings:Warning[]=[],rules:{pattern:RegExp;owners:string[]}[]=[];
 if(!selected)return {match:()=>[],warnings};
 for(const line of files.get(selected)!.split(/\r?\n/)){
  const trimmed=line.replace(/\s+#.*$/,'').trim();if(!trimmed||trimmed.startsWith('#'))continue;const parts=trimmed.split(/\s+/);const raw=parts.shift()!;
  if(/[!\[\]\\]/.test(raw)||raw.includes('***')||parts.some(x=>!/^@[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$|^[^@\s]+@[^@\s]+$/.test(x))){
   warnings.push({code:'CODEOWNERS_UNSUPPORTED',path:selected,revision:'base',detail:'Unsupported CODEOWNERS pattern/owner line'});continue;
  }
  let pattern=raw.replace(/^\//,'');const directory=pattern.endsWith('/');pattern=pattern.replace(/\/$/,'');const rooted=raw.startsWith('/')||pattern.includes('/');const wildcardTail=/[*?]/.test(pattern.split('/').at(-1)!);
  let expression='';for(let i=0;i<pattern.length;i++){const c=pattern[i];if(c==='*'&&pattern[i+1]==='*'){i++;if(pattern[i+1]==='/'){i++;expression+='(?:.*/)?';}else expression+='.*';}else if(c==='*')expression+='[^/]*';else if(c==='?')expression+='[^/]';else expression+=c.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');}
  rules.push({pattern:new RegExp((rooted?'^':'(?:^|/)')+expression+(directory||!wildcardTail?'(?:/.*)?$':'$')),owners:[...new Set(parts)].sort(compare)});
 }
 return {match:p=>{let result:string[]=[];for(const rule of rules)if(rule.pattern.test(p))result=rule.owners;return result;},warnings};
}
