import ts from 'typescript';
import Parser from 'web-tree-sitter';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Snapshot} from './git.js';
import {Edge,Warning,Revision,Kind,nodeId,safePath,compare} from './model.js';
declare const __ASSET_DIR__:string;
const js=/\.[cm]?[jt]sx?$/;
const MAX_WORKSPACE_PATTERNS=256;
const MAX_WORKSPACE_PATTERN_LENGTH=512;
const MAX_WORKSPACE_BRACE_ALTERNATIVES=16;
const MAX_WORKSPACE_BRACE_EXPANSIONS=256;
const MAX_WORKSPACE_PATH_LENGTH=4096;
const MAX_WORKSPACE_GLOB_WORK=2_000_000;
const MAX_EXPORTS_CONDITION_DEPTH=64;
const MAX_EXPORTS_CONDITION_NODES=4096;
const MAX_JS_AST_NODES=100_000;
function withoutYamlComment(raw:string):string|undefined {
 let quote:'"'|"'"|undefined,comment=raw.length;
 for(let i=0;i<raw.length;i++){
  const character=raw[i];
  if(quote==='"'&&character==='\\'){i++;continue;}
  if(quote==="'"&&character==="'"&&raw[i+1]==="'"){i++;continue;}
  if(quote&&character===quote){quote=undefined;continue;}
  if(!quote&&(character==='"'||character==="'")){quote=character;continue;}
  if(!quote&&character==='#'&&(i===0||/\s/.test(raw[i-1]))){comment=i;break;}
 }
 if(quote)return;
 return raw.slice(0,comment).trim();
}
function yamlWorkspaceScalar(raw:string):string|undefined {
 const value=withoutYamlComment(raw);if(!value)return;
 if(value.startsWith("'")){
  if(!value.endsWith("'")||value.length<2)return;
  let result='';
  for(let i=1;i<value.length-1;i++){
   if(value[i]==="'"){if(value[i+1]!=="'")return;result+="'";i++;}else result+=value[i];
  }
  return result;
 }
 if(value.startsWith('"')){try{const parsed=JSON.parse(value);return typeof parsed==='string'?parsed:undefined;}catch{return;}}
 if('!&*|>{[`,'.includes(value[0])||/:\s/.test(value))return;
 return value;
}
function yamlWorkspaceFlowSequence(raw:string):string[]|undefined {
 const value=withoutYamlComment(raw)?.trim();if(!value||!value.startsWith('[')||!value.endsWith(']'))return;
 const body=value.slice(1,-1);if(!body.trim())return [];
 const result:string[]=[];let quote:'"'|"'"|undefined,start=0;
 const push=(end:number):boolean=>{const item=yamlWorkspaceScalar(body.slice(start,end));if(item===undefined)return false;result.push(item);start=end+1;return true;};
 for(let i=0;i<body.length;i++){
  const character=body[i];
  if(quote==='"'&&character==='\\'){i++;continue;}
  if(quote==="'"&&character==="'"&&body[i+1]==="'"){i++;continue;}
  if(quote&&character===quote){quote=undefined;continue;}
  if(!quote&&(character==='"'||character==="'")){quote=character;continue;}
  if(!quote&&(character==='['||character==='{'||character==='}'||character===']'))return;
  if(!quote&&character===','&&!push(i))return;
 }
 if(quote||!push(body.length))return;
 return result;
}
function pnpmWorkspacePatterns(text:string):{patterns:string[];error?:string} {
 let inPackages=false,found=false,afterFlowSequence=false;const patterns:string[]=[];
 for(const line of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
  const trimmed=line.trim();if(!trimmed||trimmed.startsWith('#'))continue;
  if(!/^\s/.test(line)){
   inPackages=false;afterFlowSequence=false;
   const entry=/^packages:\s*(.*)$/.exec(line);
   if(entry){
    if(found)return {patterns,error:'Duplicate top-level packages key'};
    found=true;const value=withoutYamlComment(entry[1]);if(value===undefined)return {patterns,error:'Malformed YAML packages value'};
    if(!value){inPackages=true;continue;}
    if(value.startsWith('[')){
     const inline=yamlWorkspaceFlowSequence(value);if(!inline)return {patterns,error:'Inline workspace values must be a simple YAML string sequence'};
     patterns.push(...inline);afterFlowSequence=true;continue;
    }
    return {patterns,error:'Workspace declarations must use a block list or a simple inline string sequence'};
   }
   continue;
  }
  if(!inPackages){if(afterFlowSequence&&/^\s+-/.test(line))return {patterns,error:'Do not mix inline and block workspace entries'};continue;}
  const item=/^\s{2,}-\s*(.*)$/.exec(line);
  if(!item)return {patterns,error:'Workspace entries must be simple package pattern strings'};
  const pattern=yamlWorkspaceScalar(item[1]);
  if(!pattern)return {patterns,error:'Workspace entry is not a supported YAML string'};
  patterns.push(pattern);
 }
 if(!found)return {patterns,error:'A top-level packages list was not found'};
 return {patterns};
}
function expandWorkspaceAlternatives(pattern:string):string[]|undefined {
 const classEnd=(value:string,start:number):number=>{for(let i=start+1;i<value.length;i++){if(value[i]==='\\')return -1;if(value[i]===']')return i;}return -1;};
 const braceEnd=(value:string,start:number):number=>{
  let depth=0;
  for(let i=start;i<value.length;i++){
   if(value[i]==='['){const end=classEnd(value,i);if(end<0)return -1;i=end;continue;}
   if(value[i]==='{')depth++;
   else if(value[i]==='}'){depth--;if(depth===0)return i;if(depth<0)return -1;}
  }
  return -1;
 };
 const split=(value:string):string[]|undefined=>{
  const parts:string[]=[];let depth=0,start=0,hasComma=false;
  for(let i=0;i<value.length;i++){
   if(value[i]==='['){const end=classEnd(value,i);if(end<0)return;i=end;continue;}
   if(value[i]==='{')depth++;
   else if(value[i]==='}'){depth--;if(depth<0)return;}
   else if(value[i]===','&&depth===0){parts.push(value.slice(start,i));start=i+1;hasComma=true;}
  }
  if(!hasComma||depth!==0)return;
  parts.push(value.slice(start));return parts;
 };
 const expand=(value:string):string[]|undefined=>{
  let expanded=[''];
  for(let i=0;i<value.length;i++){
   if(value[i]==='['){const end=classEnd(value,i);if(end<0)return;const part=value.slice(i,end+1);expanded=expanded.map(prefix=>prefix+part);i=end;continue;}
   if(value[i]==='}')return;
   if(value[i]!=='{'){expanded=expanded.map(prefix=>prefix+value[i]);continue;}
   const end=braceEnd(value,i);if(end<0)return;
   const alternatives=split(value.slice(i+1,end));if(!alternatives||alternatives.length<2||alternatives.length>MAX_WORKSPACE_BRACE_ALTERNATIVES||alternatives.some(part=>!part))return;
   const expandedAlternatives:string[]=[];
   for(const alternative of alternatives){const items=expand(alternative);if(!items||expandedAlternatives.length+items.length>MAX_WORKSPACE_BRACE_EXPANSIONS)return;expandedAlternatives.push(...items);}
   if(expanded.length*expandedAlternatives.length>MAX_WORKSPACE_BRACE_EXPANSIONS)return;
   const next:string[]=[];for(const prefix of expanded)for(const alternative of expandedAlternatives)next.push(prefix+alternative);expanded=next;i=end;
  }
  return expanded;
 };
 return expand(pattern);
}
export interface Scan {edges:Edge[];warnings:Warning[]}
interface Import {name:string;kind:Kind;members?:string[]}
export function jsImports(source:string,file:string):{imports:Import[];warnings:string[]} {
 const imports:Import[]=[],warnings:string[]=[];let sf:ts.SourceFile;
 try{sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);}catch(error){if(error instanceof RangeError)return {imports,warnings:['JavaScript parser resource limit reached; import graph may be incomplete']};throw error;}
 const diagnostics=(sf as ts.SourceFile & {parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics;
 if(diagnostics?.length)warnings.push('Parse errors; import graph may be incomplete');
 const pending:ts.Node[]=[sf];let visited=0;
 while(pending.length){
  if(visited>=MAX_JS_AST_NODES){warnings.push('AST node limit reached; import graph may be incomplete');break;}
  visited++;const n=pending.pop()!;
  if(ts.isImportDeclaration(n)||ts.isExportDeclaration(n)){
   if(n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier)){
    const typeOnly=ts.isImportDeclaration(n)?!!n.importClause?.isTypeOnly||(!n.importClause?.name&&!!n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.length>0&&n.importClause.namedBindings.elements.every(e=>e.isTypeOnly)):!!n.isTypeOnly||(!!n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.length>0&&n.exportClause.elements.every(e=>e.isTypeOnly));
    imports.push({name:n.moduleSpecifier.text,kind:typeOnly?'type-only':'static'});
   }
  } else if(ts.isImportEqualsDeclaration(n)&&ts.isExternalModuleReference(n.moduleReference)){
   const e=n.moduleReference.expression;if(e&&ts.isStringLiteral(e))imports.push({name:e.text,kind:'require'});
  } else if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(n.expression)&&n.expression.text==='require'))){
   const arg=n.arguments[0];if(arg&&(ts.isStringLiteral(arg)||ts.isNoSubstitutionTemplateLiteral(arg)))imports.push({name:arg.text,kind:n.expression.kind===ts.SyntaxKind.ImportKeyword?'dynamic-literal':'require'});
   else warnings.push('Dynamic import/require expression cannot be resolved');
  }
  const children:ts.Node[]=[];ts.forEachChild(n,child=>{children.push(child);});
  for(let i=children.length-1;i>=0;i--)pending.push(children[i]);
 }
 return {imports,warnings};
}
let language:Promise<Parser.Language>|undefined;
async function pythonParser():Promise<Parser> {
 if(!language)language=(async()=>{
  const assets=typeof __ASSET_DIR__!=='undefined'?__ASSET_DIR__:fileURLToPath(new URL('../node_modules/',import.meta.url));
  const runtime=typeof __ASSET_DIR__!=='undefined'?path.join(assets,'tree-sitter.wasm'):path.join(assets,'web-tree-sitter','tree-sitter.wasm');
  const grammar=typeof __ASSET_DIR__!=='undefined'?path.join(assets,'tree-sitter-python.wasm'):path.join(assets,'tree-sitter-wasms','out','tree-sitter-python.wasm');
  await Parser.init({locateFile:()=>runtime});return Parser.Language.load(grammar);
 })();
 const lang=await language;const parser=new Parser();parser.setLanguage(lang);parser.setTimeoutMicros(500000);return parser;
}
export async function pythonImports(source:string):Promise<{imports:Import[];warnings:string[]}> {
 const parser=await pythonParser();const imports:Import[]=[],warnings:string[]=[];let tree:Parser.Tree|undefined;
 try {
  tree=parser.parse(source);if(!tree){warnings.push('Python parse time limit exceeded');return {imports,warnings};}
  if(tree.rootNode.hasError())warnings.push('Python syntax error; graph may be incomplete');
  function visit(n:Parser.SyntaxNode){
   if(n.type==='import_statement'){
    for(const c of n.namedChildren){if(c.type==='dotted_name')imports.push({name:c.text,kind:'python'});else if(c.type==='aliased_import'){const name=c.childForFieldName('name');if(name)imports.push({name:name.text,kind:'python'});}}
   }else if(n.type==='import_from_statement'){
    const module=n.childForFieldName('module_name');const members:string[]=[];
    for(const c of n.namedChildren){if(c===module||c.id===module?.id)continue;
     if(c.type==='dotted_name')members.push(c.text);else if(c.type==='aliased_import'){const name=c.childForFieldName('name');if(name)members.push(name.text);}else if(c.type==='wildcard_import')warnings.push('Python wildcard imports cannot establish symbol relationships');
    }
    if(module)imports.push({name:module.text,kind:'python',members});
   }else if(n.type==='call'){const fn=n.childForFieldName('function')?.text;if(fn==='__import__'||fn==='importlib.import_module')warnings.push('Dynamic Python import not resolved');}
   for(const c of n.namedChildren)visit(c);
  }visit(tree.rootNode);return {imports,warnings};
 } finally {tree?.delete();parser.delete();}
}
function candidates(base:string,from:string,kind:Kind):string[] {
 const normalizedPath=path.posix.normalize(base).replace(/\/+$/,''),normalizedBase=normalizedPath==='.'?'':normalizedPath,extension=path.posix.extname(normalizedBase),stem=normalizedBase.slice(0,-extension.length),indexBase=normalizedBase?normalizedBase+'/index':'index';
 const substitutions:Record<string,string[]>={'.js':['.ts','.tsx','.d.ts','.js'],'.jsx':['.tsx','.d.ts','.jsx'],'.mjs':['.mts','.d.mts','.mjs'],'.cjs':['.cts','.d.cts','.cjs']};
 const declarationFile=(value:string)=>/(?:\.d|\.test-d)\.(?:ts|mts|cts)$/.test(value),javascriptImporter=/\.(?:js|jsx|mjs|cjs)$/.test(from);
 if(substitutions[extension]){
  const mapped=substitutions[extension].map(x=>stem+x);
  if(declarationFile(from))return [...mapped.filter(declarationFile),...mapped.filter(x=>!declarationFile(x))];
  if(kind==='type-only')return mapped;
  if(javascriptImporter)return [normalizedBase,...mapped.filter(x=>x!==normalizedBase&&!declarationFile(x))];
  return mapped.filter(x=>!declarationFile(x));
 }
 if(extension)return [normalizedBase];
 if(kind==='type-only')return [normalizedBase,...['.ts','.tsx','.d.ts','.js','.jsx'].map(x=>normalizedBase+x),...['.ts','.tsx','.d.ts','.js','.jsx'].map(x=>indexBase+x)];
 if(declarationFile(from))return [normalizedBase,...['.d.ts','.d.mts','.d.cts','.ts','.tsx','.js','.jsx'].map(x=>normalizedBase+x),...['.d.ts','.d.mts','.d.cts','.ts','.tsx','.js','.jsx'].map(x=>indexBase+x)];
 if(javascriptImporter)return [normalizedBase,...['.js','.jsx','.mjs','.cjs','.ts','.tsx','.mts','.cts'].map(x=>normalizedBase+x),...['.js','.jsx','.mjs','.cjs','.ts','.tsx','.mts','.cts'].map(x=>indexBase+x)];
 return [normalizedBase,...['.ts','.tsx','.js','.jsx'].map(x=>normalizedBase+x),...['.ts','.tsx','.js','.jsx'].map(x=>indexBase+x)];
}
export async function scan(snapshot:Snapshot,revision:Revision,roots:string[],deadline:number):Promise<Scan>{
 const edges:Edge[]=[],warnings=[...snapshot.warnings];const edgeSet=new Set<string>();
 const warn=(code:string,p:string,detail:string)=>warnings.push({code,path:p,revision,detail});
 const add=(from:string,to:string,kind:Kind)=>{const e={from:nodeId(from),to:nodeId(to),kind,revision};const key=JSON.stringify(e);if(!edgeSet.has(key)){edgeSet.add(key);edges.push(e);}};
 type Rule={pattern:string;values:string[];base:string};
 type Config={baseUrl?:string;moduleResolution?:'node16'|'nodenext'|'bundler';customConditions?:string[];rules:Rule[]};
 const packageFiles=[...snapshot.files].filter(([p])=>p.endsWith('/package.json')||p==='package.json');
 const packageDirs=new Map<string,Record<string,unknown>>();
 for(const [p,text] of packageFiles){try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))continue;const dir=p==='package.json'?'':path.posix.dirname(p);packageDirs.set(dir,value);}catch{warn('CONFIG_UNSUPPORTED',p,'Invalid package.json; package metadata was ignored');}}
 const rootManifest=packageDirs.get('')??{};
 const workspaceObject=rootManifest.workspaces&&typeof rootManifest.workspaces==='object'&&!Array.isArray(rootManifest.workspaces)?rootManifest.workspaces as {packages?:unknown}:undefined;
 const workspaceFieldValid=Array.isArray(rootManifest.workspaces)||!!workspaceObject&&Array.isArray(workspaceObject.packages);
 const packageWorkspacePatterns=Array.isArray(rootManifest.workspaces)?rootManifest.workspaces:workspaceFieldValid?(workspaceObject!.packages as string[]):[];
 let workspacesRaw:unknown[]=packageWorkspacePatterns,workspaceConfigPath='package.json';
 if(rootManifest.workspaces!==undefined&&!workspaceFieldValid)warn('CONFIG_UNSUPPORTED','package.json','Workspace declarations must be a string array or an object with a packages array');
 const pnpmWorkspace=snapshot.files.get('pnpm-workspace.yaml');
 if(pnpmWorkspace!==undefined){
  workspaceConfigPath='pnpm-workspace.yaml';const parsed=pnpmWorkspacePatterns(pnpmWorkspace);
  if(parsed.error){warn('CONFIG_UNSUPPORTED',workspaceConfigPath,parsed.error);workspacesRaw=[];}
  else if(rootManifest.workspaces!==undefined&&workspaceFieldValid&&JSON.stringify(packageWorkspacePatterns)!==JSON.stringify(parsed.patterns)){
   warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'pnpm-workspace.yaml and package.json declare different workspace patterns; workspace resolution was skipped');workspacesRaw=[];
  }else workspacesRaw=parsed.patterns;
 }
 type WorkspaceToken={kind:'literal';value:string}|{kind:'one'}|{kind:'star';crossesSlash:boolean}|{kind:'globstar-directory'}|{kind:'class';negated:boolean;ranges:[number,number][]};
 type WorkspacePattern={exclude:boolean;tokens:WorkspaceToken[]};
 const workspacePatterns:WorkspacePattern[]=[];
 const workspacePatternLimitExceeded=workspacesRaw.length>MAX_WORKSPACE_PATTERNS;
 let expandedWorkspacePatternCount=0,workspaceExpansionLimitExceeded=false;
 if(workspacePatternLimitExceeded)warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'Workspace pattern count exceeds 256; workspace resolution was skipped');
 if(!workspacePatternLimitExceeded)for(const raw of workspacesRaw){
  if(typeof raw!=='string'){warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'Unsupported workspace pattern: '+String(raw));continue;}
  const exclude=raw.startsWith('!'),pattern=raw.replace(/^!/,'').replace(/^\.\//,'').replace(/\/$/,'');
   const expanded=pattern.length<=MAX_WORKSPACE_PATTERN_LENGTH?expandWorkspaceAlternatives(pattern):undefined;
   if(!expanded||expanded.some(value=>value.length>MAX_WORKSPACE_PATTERN_LENGTH||!safePath(value.replaceAll('*','x').replaceAll('?','x')))){
    warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'Unsupported or oversized workspace pattern: '+raw);continue;
   }
   if(expandedWorkspacePatternCount+expanded.length>MAX_WORKSPACE_PATTERNS){warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'Workspace pattern expansion exceeds 256; workspace resolution was skipped');workspaceExpansionLimitExceeded=true;break;}
   expandedWorkspacePatternCount+=expanded.length;const workspacePatternStart=workspacePatterns.length;let invalidClassPattern=false;
   for(const expandedPattern of expanded){
    const chars=Array.from(expandedPattern),tokens:WorkspaceToken[]=[];let unsupportedClass=false;
    for(let i=0;i<chars.length;i++){
     if(chars[i]==='*'){
      const crossesSlash=chars[i+1]==='*';
      if(crossesSlash&&chars[i+2]==='/'){tokens.push({kind:'globstar-directory'});i+=2;}
      else{tokens.push({kind:'star',crossesSlash});if(crossesSlash)i++;}
     }
     else if(chars[i]==='?')tokens.push({kind:'one'});
     else if(chars[i]==='['){
      const end=chars.indexOf(']',i+1);if(end<0){unsupportedClass=true;break;}
      let body=chars.slice(i+1,end),negated=false;if(body[0]==='!'||body[0]==='^'){negated=true;body=body.slice(1);}
      if(!body.length||body.some(character=>character==='/'||character==='\\'||character==='[')){unsupportedClass=true;break;}
      const ranges:[number,number][]=[];
      for(let j=0;j<body.length;j++){
       const first=body[j].codePointAt(0)!;
       if(j+2<body.length&&body[j+1]==='-'&&body[j+2]!=='-'){
        const last=body[j+2].codePointAt(0)!;if(first>last){unsupportedClass=true;break;}ranges.push([first,last]);j+=2;
       }else ranges.push([first,first]);
      }
      if(unsupportedClass)break;tokens.push({kind:'class',negated,ranges});i=end;
     }
     else tokens.push({kind:'literal',value:chars[i]});
    }
    if(unsupportedClass){warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'Malformed or unsupported workspace character class: '+raw);invalidClassPattern=true;break;}
    workspacePatterns.push({exclude,tokens});
  }
  if(invalidClassPattern){workspacePatterns.length=workspacePatternStart;continue;}
 }
 const includePatterns=workspacePatternLimitExceeded||workspaceExpansionLimitExceeded?[]:workspacePatterns.filter(pattern=>!pattern.exclude),excludePatterns=workspacePatternLimitExceeded||workspaceExpansionLimitExceeded?[]:workspacePatterns.filter(pattern=>pattern.exclude);
 const workspaces=new Map<string,{dir:string;manifest:Record<string,unknown>}>();
 const ambiguousWorkspaces=new Set<string>();
 let workspaceGlobWork=0,workspaceGlobLimitExceeded=false;
 const globMatches=(pattern:WorkspacePattern,value:string):boolean|undefined=>{
  if(value.length>MAX_WORKSPACE_PATH_LENGTH){workspaceGlobLimitExceeded=true;return;}
  const close=(states:Set<number>):Set<number>|undefined=>{
   const closed=new Set(states),pending=[...states];
   while(pending.length){
    if(++workspaceGlobWork>MAX_WORKSPACE_GLOB_WORK){workspaceGlobLimitExceeded=true;return;}
    const state=pending.pop()!,token=pattern.tokens[state];
    if((token?.kind==='star'||token?.kind==='globstar-directory')&&!closed.has(state+1)){closed.add(state+1);pending.push(state+1);}
   }
   return closed;
  };
  let states=close(new Set([0]));if(!states)return;
  for(const character of value){
   const next=new Set<number>();
   for(const state of states){
    if(++workspaceGlobWork>MAX_WORKSPACE_GLOB_WORK){workspaceGlobLimitExceeded=true;return;}
    const token=pattern.tokens[state];if(!token)continue;
    if(token.kind==='star'){if(token.crossesSlash||character!=='/')next.add(state);}
    else if(token.kind==='globstar-directory'){next.add(state);if(character==='/')next.add(state+1);}
    else if(token.kind==='one'){if(character!=='/')next.add(state+1);}
    else if(token.kind==='class'){
     const point=character.codePointAt(0)!,matched=token.ranges.some(([start,end])=>point>=start&&point<=end);
     if(character!=='/'&&(token.negated?!matched:matched))next.add(state+1);
    }
    else if(token.value===character)next.add(state+1);
   }
   if(next.size===0)return false;
   states=close(next);if(!states)return;
  }
  return states.has(pattern.tokens.length);
 };
 const matchesAny=(patterns:WorkspacePattern[],value:string):boolean=>{
  for(const pattern of patterns){const matched=globMatches(pattern,value);if(matched===undefined)return false;if(matched)return true;}
  return false;
 };
 for(const [dir,manifest] of packageDirs){
  if(workspaceGlobLimitExceeded)break;
  if(!dir||typeof manifest.name!=='string')continue;
  const included=matchesAny(includePatterns,dir),excluded=matchesAny(excludePatterns,dir);
  if(workspaceGlobLimitExceeded)break;
  if(included&&!excluded){if(workspaces.has(manifest.name)&&workspaces.get(manifest.name)!.dir!==dir){ambiguousWorkspaces.add(manifest.name);workspaces.delete(manifest.name);warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'Duplicate workspace package name is ambiguous: '+manifest.name);}else if(!ambiguousWorkspaces.has(manifest.name))workspaces.set(manifest.name,{dir,manifest});}
 }
 if(workspaceGlobLimitExceeded){workspaces.clear();ambiguousWorkspaces.clear();warn('CONFIG_UNSUPPORTED',workspaceConfigPath,'Workspace glob matching exceeded its safety budget; workspace resolution was skipped');}
 const configCache=new Map<string,Config>();
 const resolvingConfigs=new Set<string>();
 const configFileFor=(from:string):string|undefined=>{
  let dir=path.posix.dirname(from);
  while(dir!=='.'){
   const candidate=dir+'/tsconfig.json';if(snapshot.files.has(candidate))return candidate;
   const parent=path.posix.dirname(dir);if(parent===dir)break;dir=parent;
  }
  return snapshot.files.has('tsconfig.json')?'tsconfig.json':undefined;
 };
 const resolveConfig=(file:string,depth=0):Config=>{
  const cached=configCache.get(file);if(cached)return cached;
  if(depth>=8||resolvingConfigs.has(file)){warn('CONFIG_UNSUPPORTED',file,'TypeScript config inheritance is cyclic or exceeds eight levels');return {rules:[]};}
  resolvingConfigs.add(file);let result:Config={rules:[]};
  const text=snapshot.files.get(file),parsed=text?ts.parseConfigFileTextToJson(file,text):undefined;
  if(!parsed||parsed.error||!parsed.config||typeof parsed.config!=='object')warn('CONFIG_UNSUPPORTED',file,'Invalid TypeScript config JSON');
  else {
   const config=parsed.config as Record<string,unknown>;
   if(config.references!==undefined&&(!Array.isArray(config.references)||config.references.length>0))warn('CONFIG_UNSUPPORTED',file,'TypeScript project references are not modeled; analysis follows source imports only');
   const parentPaths=typeof config.extends==='string'?[config.extends]:Array.isArray(config.extends)?config.extends.filter((v):v is string=>typeof v==='string'):[];
   if(config.extends!==undefined&&(!Array.isArray(config.extends)&&typeof config.extends!=='string'||Array.isArray(config.extends)&&parentPaths.length!==config.extends.length))warn('CONFIG_UNSUPPORTED',file,'Unsupported TypeScript extends value');
   for(const parent of parentPaths){
    if(!parent.startsWith('.')||parent.includes('\\')){warn('CONFIG_UNSUPPORTED',file,'External TypeScript extends is not followed: '+parent);continue;}
    const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),parent));
    if(!safePath(base)){warn('CONFIG_UNSUPPORTED',file,'Unsafe TypeScript extends path ignored');continue;}
    const candidate=snapshot.files.has(base)?base:snapshot.files.has(base+'.json')?base+'.json':snapshot.files.has(base+'/tsconfig.json')?base+'/tsconfig.json':undefined;
    if(candidate){const inherited=resolveConfig(candidate,depth+1),merged=new Map(result.rules.map(rule=>[rule.pattern,rule]));for(const rule of inherited.rules)merged.set(rule.pattern,rule);result={baseUrl:inherited.baseUrl??result.baseUrl,moduleResolution:inherited.moduleResolution??result.moduleResolution,customConditions:inherited.customConditions??result.customConditions,rules:[...merged.values()]};}
    else warn('CONFIG_UNSUPPORTED',file,'Relative TypeScript extends target was not found: '+parent);
   }
   const options=config.compilerOptions;
   if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)))warn('CONFIG_UNSUPPORTED',file,'compilerOptions must be an object');
   else if(options&&typeof options==='object'){
    const compiler=options as Record<string,unknown>;let ruleBase=result.baseUrl??path.posix.dirname(file);
    if(Object.hasOwn(compiler,'moduleResolution')){
     const resolution=typeof compiler.moduleResolution==='string'?compiler.moduleResolution.toLowerCase():'';
     if(resolution==='node16'||resolution==='nodenext'||resolution==='bundler')result.moduleResolution=resolution;
     else{result.moduleResolution=undefined;if(result.customConditions?.length)warn('CONFIG_UNSUPPORTED',file,'customConditions require moduleResolution node16, nodenext, or bundler');}
    }
    if(Object.hasOwn(compiler,'customConditions')){
     const conditions=compiler.customConditions;
     if(!Array.isArray(conditions)||!conditions.every(value=>typeof value==='string'&&value.length>0)){
      result.customConditions=[];warn('CONFIG_UNSUPPORTED',file,'customConditions must be an array of non-empty strings');
     }else if(!result.moduleResolution){
      result.customConditions=[];warn('CONFIG_UNSUPPORTED',file,'customConditions require moduleResolution node16, nodenext, or bundler');
     }else result.customConditions=[...conditions];
    }
    if(typeof compiler.baseUrl==='string'){
     const next=path.posix.normalize(path.posix.join(path.posix.dirname(file),compiler.baseUrl));
     if(next===''||next==='.')result.baseUrl='';else if(safePath(next))result.baseUrl=next;else warn('CONFIG_UNSUPPORTED',file,'Unsafe baseUrl ignored');
     ruleBase=result.baseUrl??path.posix.dirname(file);
    }
    if(compiler.paths!==undefined){
     // TypeScript replaces an inherited paths map whenever the child declares one.
     result.rules=[];
     if(!compiler.paths||typeof compiler.paths!=='object'||Array.isArray(compiler.paths))warn('CONFIG_UNSUPPORTED',file,'paths must be an object');
     else for(const [pattern,value] of Object.entries(compiler.paths as Record<string,unknown>)){
      if(pattern.split('*').length>2||!Array.isArray(value)||!value.every(v=>typeof v==='string')){warn('CONFIG_UNSUPPORTED',file,'Unsupported paths rule: '+pattern);continue;}
      const values=(value as string[]).map(v=>path.posix.normalize(path.posix.join(ruleBase,v))).filter(safePath);
      result.rules=result.rules.filter(rule=>rule.pattern!==pattern);result.rules.push({pattern,values,base:ruleBase});
     }
    }
   }
  }
  resolvingConfigs.delete(file);result.rules.sort((a,b)=>Number(a.pattern.includes('*'))-Number(b.pattern.includes('*'))||b.pattern.split('*')[0].length-a.pattern.split('*')[0].length||compare(a.pattern,b.pattern));configCache.set(file,result);return result;
 };
 const effectiveConfig=(from:string):Config=>{const file=configFileFor(from);return file?resolveConfig(file):{rules:[]};};
 const resolveManifestTarget=(dir:string,manifest:Record<string,unknown>,subpath:string,kind:Kind,customConditions:readonly string[]):string|undefined=>{
  let target:string|undefined,exportMiddle='';const exportsValue=manifest.exports;
  if(exportsValue!==undefined){
   let value:unknown=exportsValue;
   if(typeof value==='object'&&value!==null&&!Array.isArray(value)){
    const exportsObject=value as Record<string,unknown>;
    if(Object.keys(exportsObject).some(key=>key.startsWith('.'))){
     const key=subpath?'./'+subpath:'.';value=exportsObject[key];
     if(value===undefined)for(const [pattern,entry] of Object.entries(exportsObject)){
      const star=pattern.indexOf('*');if(star<0||pattern.indexOf('*',star+1)>=0)continue;
      const prefix=pattern.slice(0,star),suffix=pattern.slice(star+1);
      if(key.startsWith(prefix)&&key.endsWith(suffix)&&key.length>=prefix.length+suffix.length){value=entry;exportMiddle=key.slice(prefix.length,key.length-suffix.length);break;}
     }
    }else if(!subpath)value=exportsObject;
    else value=undefined;
   }else if(subpath)value=undefined;
   const baseConditions=kind==='require'?['require','node','default']:kind==='type-only'?['types','import','node','default']:['import','node','default'];
   const activeConditions=new Set([...baseConditions,...customConditions]);
   const pick=(root:unknown):string|undefined=>{
    const pending:{value:unknown;depth:number}[]=[{value:root,depth:0}];let visited=0;
    while(pending.length){
     const {value:current,depth}=pending.pop()!;
     if(++visited>MAX_EXPORTS_CONDITION_NODES){warn('CONFIG_UNSUPPORTED',dir?dir+'/package.json':'package.json','Package exports condition map exceeds its safety budget');return;}
     if(depth>MAX_EXPORTS_CONDITION_DEPTH){warn('CONFIG_UNSUPPORTED',dir?dir+'/package.json':'package.json','Package exports condition nesting exceeds 64 levels');return;}
     if(typeof current==='string')return current;
     if(Array.isArray(current)){
      for(let i=current.length-1;i>=0;i--)pending.push({value:current[i],depth:depth+1});
     }else if(current&&typeof current==='object'){
      const conditionMap=current as Record<string,unknown>,entries=Object.entries(conditionMap);
      for(let i=entries.length-1;i>=0;i--){const [condition,targetValue]=entries[i];if(activeConditions.has(condition))pending.push({value:targetValue,depth:depth+1});}
      if(kind==='type-only'&&Object.hasOwn(conditionMap,'types'))pending.push({value:conditionMap.types,depth:depth+1});
     }
    }
   };
   target=pick(value);
   if(target&&exportMiddle)target=target.replaceAll('*',exportMiddle);
  }else if(subpath)target='./'+subpath;
  else for(const key of ['module','main','types','typings'])if(typeof manifest[key]==='string'){target=manifest[key] as string;break;}
  if(!target&&!subpath&&exportsValue===undefined)target='./index';
  if(target&&exportsValue===undefined&&!target.startsWith('./')){if(target.startsWith('/')||target.startsWith('..'))return;target='./'+target;}
  if(!target||!target.startsWith('./')||target.includes('\\'))return;
  const relative=path.posix.normalize(path.posix.join(dir,target.slice(2)));return safePath(relative)?relative:undefined;
 };
 const resolvePackagePath=(from:string,dir:string,manifest:Record<string,unknown>,subpath:string,kind:Kind,customConditions:readonly string[]):string|undefined=>{
  const target=resolveManifestTarget(dir,manifest,subpath,kind,customConditions);if(!target)return;
  for(const candidate of candidates(target,from,kind))if(snapshot.files.has(candidate))return candidate;
 };
 const packageNameAndSubpath=(spec:string):{name:string;subpath:string}=>{
  const parts=spec.split('/');const count=spec.startsWith('@')?2:1;return {name:parts.slice(0,count).join('/'),subpath:parts.slice(count).join('/')};
 };
 const resolveWorkspace=(from:string,spec:string,kind:Kind,customConditions:readonly string[]):string|undefined=>{
  const {name,subpath}=packageNameAndSubpath(spec);if(ambiguousWorkspaces.has(name)){warn('UNRESOLVED_WORKSPACE_IMPORT',from,'Duplicate workspace package name is ambiguous: '+name);return;}const pkg=workspaces.get(name);if(!pkg)return;
  const result=resolvePackagePath(from,pkg.dir,pkg.manifest,subpath,kind,customConditions);if(!result)warn('UNRESOLVED_WORKSPACE_IMPORT',from,'Workspace import has no unambiguous supported '+kind+' target in its package export map: '+spec);return result;
 };
 const resolveDirectoryPackage=(from:string,dir:string,kind:Kind,customConditions:readonly string[]):string|undefined=>{
  const manifest=packageDirs.get(dir);if(!manifest)return;
  const result=resolvePackagePath(from,dir,manifest,'',kind,customConditions);if(!result)warn('CONFIG_UNSUPPORTED',from,'Package entry has no unambiguous supported '+kind+' target in '+dir+'/package.json');return result;
 };
 const resolveJS=(from:string,spec:string,kind:Kind):string|undefined=>{
  if(spec.includes('\\')||spec.includes('\0')){warn('UNRESOLVED_IMPORT',from,'Unsafe import path');return;}
  const config=effectiveConfig(from),customConditions=config.moduleResolution?config.customConditions??[]:[];const bases:string[]=[];let local=spec.startsWith('.');let alias=false;
  if(local)bases.push(path.posix.join(path.posix.dirname(from),spec));
  else {
   const matches:Rule[]=[];
   for(const rule of config.rules){const [prefix,suffix]=rule.pattern.split('*');const match=suffix===undefined?spec===rule.pattern:spec.startsWith(prefix)&&spec.endsWith(suffix)&&spec.length>=prefix.length+suffix.length;if(match)matches.push(rule);
   }
   const rule=matches[0];if(rule){local=true;alias=true;const [prefix,suffix]=rule.pattern.split('*');const middle=suffix===undefined?'':spec.slice(prefix.length,spec.length-suffix.length);for(const target of rule.values)bases.push(target.replace('*',middle));}
   if(config.baseUrl!==undefined)bases.push(path.posix.join(config.baseUrl,spec));
  }
  for(const base of bases){const normalized=path.posix.normalize(base);if(normalized.startsWith('/'))continue;const trimmed=normalized.replace(/\/+$/,''),b=trimmed==='.'?'':trimmed;if(b&&!safePath(b))continue;if(packageDirs.has(b)){const result=resolveDirectoryPackage(from,b,kind,customConditions);if(result)return result;continue;}for(const c of candidates(b,from,kind))if(snapshot.files.has(c))return c;}
  const workspaceName=packageNameAndSubpath(spec).name,knownWorkspace=workspaces.has(workspaceName);
  if(!local){const workspace=resolveWorkspace(from,spec,kind,customConditions);if(workspace)return workspace;if(knownWorkspace)return;}
  if(local||alias)warn('UNRESOLVED_IMPORT',from,'Cannot resolve local import '+spec);
  else if(!spec.startsWith('node:')&&!knownWorkspace)warn('EXPECTED_EXTERNAL_IMPORT',from,'External package is excluded from the local import graph: '+spec);
 };
 const resolvePy=(from:string,imp:Import):string[]=>{
  const rel=imp.name.match(/^\.+/)?.[0].length??0;const name=imp.name.slice(rel).replaceAll('.','/');
  let bases:string[];
  if(rel){let dir=path.posix.dirname(from);for(let i=1;i<rel;i++)dir=path.posix.dirname(dir);bases=[path.posix.join(dir,name)];}
  else bases=pythonRoots.map(root=>path.posix.join(root,name));
  const found:string[]=[];let matchedBases=0;
  for(const b of new Set(bases)){
   if(!safePath(b)&&b!=='.')continue;
   const main=[b+'.py',b+'/__init__.py'].filter(p=>snapshot.files.has(p));
   const children=(imp.members??[]).flatMap(member=>[b+'/'+member+'.py',b+'/'+member+'/__init__.py']).filter(p=>snapshot.files.has(p));
   if(main.length>1){warn('AMBIGUOUS_IMPORT',from,'Both Python module and package match '+imp.name);return [];}
   if(main.length){matchedBases++;found.push(...main,...(main[0].endsWith('/__init__.py')?children:[]));}
   else if(children.length)warn('AMBIGUOUS_NAMESPACE',from,'Namespace package excluded: '+imp.name);
  }
  if(matchedBases>1&&!rel){warn('AMBIGUOUS_IMPORT',from,'Multiple Python source roots match '+imp.name);return [];}
  if(!found.length){warn(rel?'UNRESOLVED_IMPORT':'EXPECTED_EXTERNAL_IMPORT',from,(rel?'Unresolved relative Python module: ':'External Python package is excluded from the local import graph: ')+imp.name);return [];}
  // Include existing package initializers along an explicitly resolved module path.
  for(const p of [...found]){let dir=path.posix.dirname(p);while(dir!=='.'){const init=dir+'/__init__.py';if(snapshot.files.has(init))found.push(init);dir=path.posix.dirname(dir);}}
  return [...new Set(found)];
 };
 const detectedRoots=[...roots];
 for(const p of snapshot.files.keys())if(p.endsWith('/__init__.py')){const parts=p.split('/');const index=parts.lastIndexOf('src');if(index>0){const root=parts.slice(0,index+1).join('/');if(!detectedRoots.includes(root))detectedRoots.push(root);}}
 const pythonRoots=detectedRoots.sort(compare);
 for(const p of snapshot.files.keys())if(/(?:^|\/)tsconfig\.json$/.test(p))resolveConfig(p);
 for(const [p,source] of [...snapshot.files].sort(([a],[b])=>compare(a,b))){
  if(Date.now()>deadline){warn('TIME_LIMIT',p,'Parsing stopped at analysis deadline');break;}
  if(js.test(p)){
   const result=jsImports(source,p);for(const detail of result.warnings)warn('DYNAMIC_OR_INVALID_SYNTAX',p,detail);
   for(const imp of result.imports){const to=resolveJS(p,imp.name,imp.kind);if(to)add(p,to,imp.kind);}
  }else if(p.endsWith('.py')){
   const result=await pythonImports(source);for(const detail of result.warnings)warn('DYNAMIC_OR_INVALID_SYNTAX',p,detail);
   for(const imp of result.imports)for(const to of resolvePy(p,imp))if(to!==p)add(p,to,'python');
  }else if(/\.(?:go|rs|java|rb|php|vue|svelte|c|cpp|h|cs)$/.test(p))warn('UNSUPPORTED_LANGUAGE',p,'File import syntax is not supported');
 }
 return {edges,warnings};
}
