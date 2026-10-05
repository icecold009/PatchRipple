import ts from 'typescript';
import Parser from 'web-tree-sitter';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Snapshot} from './git.js';
import {Edge,Warning,Revision,Kind,nodeId,safePath,compare} from './model.js';
declare const __ASSET_DIR__:string;
const js=/\.[cm]?[jt]sx?$/;
export interface Scan {edges:Edge[];warnings:Warning[]}
interface Import {name:string;kind:Kind;members?:string[]}
export function jsImports(source:string,file:string):{imports:Import[];warnings:string[]} {
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const imports:Import[]=[],warnings:string[]=[];
 const diagnostics=(sf as ts.SourceFile & {parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics;
 if(diagnostics?.length)warnings.push('Parse errors; import graph may be incomplete');
 function visit(n:ts.Node){
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
  ts.forEachChild(n,visit);
 }visit(sf);
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
function candidates(base:string):string[] {
 // Emitted JS paths refer to corresponding TS/TSX/declaration source candidates.
 const extension=path.posix.extname(base),stem=base.slice(0,-extension.length);
 const substitutions:Record<string,string[]>={'.js':['.ts','.tsx','.d.ts','.js'],'.jsx':['.tsx','.d.ts','.jsx'],'.mjs':['.mts','.d.mts','.mjs'],'.cjs':['.cts','.d.cts','.cjs']};
 if(substitutions[extension])return substitutions[extension].map(x=>stem+x);
 if(extension)return [base];
 return [base,...['.ts','.tsx','.d.ts','.js','.jsx'].map(x=>base+x),...['.ts','.tsx','.d.ts','.js','.jsx'].map(x=>base+'/index'+x)];
}
export async function scan(snapshot:Snapshot,revision:Revision,roots:string[],deadline:number):Promise<Scan>{
 const edges:Edge[]=[],warnings=[...snapshot.warnings];const edgeSet=new Set<string>();
 const warn=(code:string,p:string,detail:string)=>warnings.push({code,path:p,revision,detail});
 const add=(from:string,to:string,kind:Kind)=>{const e={from:nodeId(from),to:nodeId(to),kind,revision};const key=JSON.stringify(e);if(!edgeSet.has(key)){edgeSet.add(key);edges.push(e);}};
 type Rule={pattern:string;values:string[];base:string};
 type Config={baseUrl?:string;rules:Rule[]};
 const packageFiles=[...snapshot.files].filter(([p])=>p.endsWith('/package.json')||p==='package.json');
 const packageDirs=new Map<string,Record<string,unknown>>();
 for(const [p,text] of packageFiles){try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))continue;const dir=p==='package.json'?'':path.posix.dirname(p);packageDirs.set(dir,value);}catch{warn('CONFIG_UNSUPPORTED',p,'Invalid package.json; package metadata was ignored');}}
 const rootManifest=packageDirs.get('')??{};
 const workspaceObject=rootManifest.workspaces&&typeof rootManifest.workspaces==='object'&&!Array.isArray(rootManifest.workspaces)?rootManifest.workspaces as {packages?:unknown}:undefined;
 const workspaceFieldValid=Array.isArray(rootManifest.workspaces)||!!workspaceObject&&Array.isArray(workspaceObject.packages);
 const workspacesRaw=Array.isArray(rootManifest.workspaces)?rootManifest.workspaces:workspaceFieldValid?(workspaceObject!.packages as string[]):[];
 if(rootManifest.workspaces!==undefined&&!workspaceFieldValid)warn('CONFIG_UNSUPPORTED','package.json','Workspace declarations must be a string array or an object with a packages array');
 const workspaces=new Map<string,{dir:string;manifest:Record<string,unknown>}>();
 const ambiguousWorkspaces=new Set<string>();
 for(const pattern of workspacesRaw)if(typeof pattern!=='string'||pattern.includes('{')||pattern.includes('[')||pattern.includes(']')||pattern==='!')warn('CONFIG_UNSUPPORTED','package.json','Unsupported workspace pattern: '+String(pattern));
 const globMatches=(pattern:string,value:string):boolean=>{
  const normalized=pattern.replace(/^!/, '').replace(/^\.\//,'').replace(/\/$/,'');
  if(!safePath(normalized.replaceAll('*','x').replaceAll('?','x')))return false;
  if(normalized.includes('[')||normalized.includes(']'))return false;
  const escaped=normalized.replace(/[.+^${}()|\\]/g,'\\$&').replaceAll('**','\u0000').replaceAll('*','[^/]*').replaceAll('?','[^/]');
  return new RegExp('^'+escaped.replaceAll('\u0000','.*')+'$').test(value);
 };
 for(const [dir,manifest] of packageDirs){
  if(!dir||typeof manifest.name!=='string')continue;
  const patterns=workspacesRaw.filter((pattern):pattern is string=>typeof pattern==='string'),included=patterns.some(pattern=>!pattern.startsWith('!')&&globMatches(pattern,dir)),excluded=patterns.some(pattern=>pattern.startsWith('!')&&globMatches(pattern,dir));
  if(included&&!excluded){if(workspaces.has(manifest.name)&&workspaces.get(manifest.name)!.dir!==dir){ambiguousWorkspaces.add(manifest.name);workspaces.delete(manifest.name);warn('CONFIG_UNSUPPORTED','package.json','Duplicate workspace package name is ambiguous: '+manifest.name);}else if(!ambiguousWorkspaces.has(manifest.name))workspaces.set(manifest.name,{dir,manifest});}
 }
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
   const config=parsed.config as Record<string,unknown>;const parentPaths=typeof config.extends==='string'?[config.extends]:Array.isArray(config.extends)?config.extends.filter((v):v is string=>typeof v==='string'):[];
   if(config.extends!==undefined&&(!Array.isArray(config.extends)&&typeof config.extends!=='string'||Array.isArray(config.extends)&&parentPaths.length!==config.extends.length))warn('CONFIG_UNSUPPORTED',file,'Unsupported TypeScript extends value');
   for(const parent of parentPaths){
    if(!parent.startsWith('.')||parent.includes('\\')){warn('CONFIG_UNSUPPORTED',file,'External TypeScript extends is not followed: '+parent);continue;}
    const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),parent));
    if(!safePath(base)){warn('CONFIG_UNSUPPORTED',file,'Unsafe TypeScript extends path ignored');continue;}
    const candidate=snapshot.files.has(base)?base:snapshot.files.has(base+'.json')?base+'.json':snapshot.files.has(base+'/tsconfig.json')?base+'/tsconfig.json':undefined;
    if(candidate){const inherited=resolveConfig(candidate,depth+1),merged=new Map(result.rules.map(rule=>[rule.pattern,rule]));for(const rule of inherited.rules)merged.set(rule.pattern,rule);result={baseUrl:inherited.baseUrl??result.baseUrl,rules:[...merged.values()]};}
    else warn('CONFIG_UNSUPPORTED',file,'Relative TypeScript extends target was not found: '+parent);
   }
   const options=config.compilerOptions;
   if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)))warn('CONFIG_UNSUPPORTED',file,'compilerOptions must be an object');
   else if(options&&typeof options==='object'){
    const compiler=options as Record<string,unknown>;let ruleBase=result.baseUrl??path.posix.dirname(file);
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
 const resolveManifestTarget=(dir:string,manifest:Record<string,unknown>,subpath:string,kind:Kind):string|undefined=>{
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
   const activeConditions=kind==='require'?new Set(['require','node','default']):kind==='type-only'?new Set(['types','import','node','default']):new Set(['import','node','default']);
   const pick=(v:unknown):string|undefined=>{
    if(typeof v==='string')return v;
    if(Array.isArray(v)){for(const item of v){const found=pick(item);if(found)return found;}return;}
    if(v&&typeof v==='object'){
     const conditionMap=v as Record<string,unknown>,entries=Object.entries(conditionMap);
     if(kind==='type-only'&&Object.hasOwn(conditionMap,'types'))entries.unshift(['types',conditionMap.types]);
     for(const [condition,targetValue] of entries)if(activeConditions.has(condition)){const found=pick(targetValue);if(found)return found;}
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
 const resolvePackagePath=(dir:string,manifest:Record<string,unknown>,subpath:string,kind:Kind):string|undefined=>{
  const target=resolveManifestTarget(dir,manifest,subpath,kind);if(!target)return;
  for(const candidate of candidates(target))if(snapshot.files.has(candidate))return candidate;
 };
 const packageNameAndSubpath=(spec:string):{name:string;subpath:string}=>{
  const parts=spec.split('/');const count=spec.startsWith('@')?2:1;return {name:parts.slice(0,count).join('/'),subpath:parts.slice(count).join('/')};
 };
 const resolveWorkspace=(from:string,spec:string,kind:Kind):string|undefined=>{
  const {name,subpath}=packageNameAndSubpath(spec);if(ambiguousWorkspaces.has(name)){warn('UNRESOLVED_WORKSPACE_IMPORT',from,'Duplicate workspace package name is ambiguous: '+name);return;}const pkg=workspaces.get(name);if(!pkg)return;
  const result=resolvePackagePath(pkg.dir,pkg.manifest,subpath,kind);if(!result)warn('UNRESOLVED_WORKSPACE_IMPORT',from,'Workspace import has no unambiguous supported '+kind+' target in its package export map: '+spec);return result;
 };
 const resolveDirectoryPackage=(from:string,dir:string,kind:Kind):string|undefined=>{
  const manifest=packageDirs.get(dir);if(!manifest)return;
  const result=resolvePackagePath(dir,manifest,'',kind);if(!result)warn('CONFIG_UNSUPPORTED',from,'Package entry has no unambiguous supported '+kind+' target in '+dir+'/package.json');return result;
 };
 const resolveJS=(from:string,spec:string,kind:Kind):string|undefined=>{
  if(spec.includes('\\')||spec.includes('\0')){warn('UNRESOLVED_IMPORT',from,'Unsafe import path');return;}
  const config=effectiveConfig(from);const bases:string[]=[];let local=spec.startsWith('.');let alias=false;
  if(local)bases.push(path.posix.join(path.posix.dirname(from),spec));
  else {
   const matches:Rule[]=[];
   for(const rule of config.rules){const [prefix,suffix]=rule.pattern.split('*');const match=suffix===undefined?spec===rule.pattern:spec.startsWith(prefix)&&spec.endsWith(suffix)&&spec.length>=prefix.length+suffix.length;if(match)matches.push(rule);
   }
   const rule=matches[0];if(rule){local=true;alias=true;const [prefix,suffix]=rule.pattern.split('*');const middle=suffix===undefined?'':spec.slice(prefix.length,spec.length-suffix.length);for(const target of rule.values)bases.push(target.replace('*',middle));}
   if(config.baseUrl!==undefined)bases.push(path.posix.join(config.baseUrl,spec));
  }
  for(const b of bases){if(!safePath(b)&&b!=='.')continue;if(packageDirs.has(b)){const result=resolveDirectoryPackage(from,b,kind);if(result)return result;continue;}for(const c of candidates(b))if(snapshot.files.has(c))return c;}
  const workspaceName=packageNameAndSubpath(spec).name,knownWorkspace=workspaces.has(workspaceName);
  if(!local){const workspace=resolveWorkspace(from,spec,kind);if(workspace)return workspace;if(knownWorkspace)return;}
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
