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
 let config: {baseUrl?:string;paths?:Record<string,string[]>}={};
 const configText=snapshot.files.get('tsconfig.json');
 if(configText){
  const parsed=ts.parseConfigFileTextToJson('tsconfig.json',configText);
  if(parsed.error)warn('CONFIG_UNSUPPORTED','tsconfig.json','Invalid tsconfig JSON');
  else if(parsed.config&&typeof parsed.config==='object'){
   if(parsed.config.extends)warn('CONFIG_UNSUPPORTED','tsconfig.json','External extends is not followed');
   const opts=parsed.config.compilerOptions;
   if(opts&&typeof opts==='object'){
    if(typeof opts.baseUrl==='string'){const base=path.posix.normalize(opts.baseUrl);if(base==='.'||safePath(base))config.baseUrl=base==='.'?'':base;else warn('CONFIG_UNSUPPORTED','tsconfig.json','Unsafe baseUrl ignored');}
    if(opts.paths&&typeof opts.paths==='object')config.paths=opts.paths;
   }
  }
 }
 const resolveJS=(from:string,spec:string):string|undefined=>{
  if(spec.includes('\\')||spec.includes('\0')){warn('UNRESOLVED_IMPORT',from,'Unsafe import path');return;}
  const bases:string[]=[];let local=spec.startsWith('.');
  if(local)bases.push(path.posix.join(path.posix.dirname(from),spec));
  else {
   const matches:{pattern:string;values:string[];prefix:string;suffix:string|undefined}[]=[];
   for(const [pattern,values] of Object.entries(config.paths??{})){
    if(!Array.isArray(values)||!values.every(x=>typeof x==='string')||pattern.split('*').length>2){warn('CONFIG_UNSUPPORTED','tsconfig.json','Unsupported paths rule');continue;}
    const [prefix,suffix]=pattern.split('*');const match=suffix===undefined?spec===pattern:spec.startsWith(prefix)&&spec.endsWith(suffix)&&spec.length>=prefix.length+suffix.length;
    if(match)matches.push({pattern,values,prefix,suffix});
   }
   matches.sort((a,b)=>Number(b.suffix===undefined)-Number(a.suffix===undefined)||b.prefix.length-a.prefix.length||compare(a.pattern,b.pattern));
   const rule=matches[0];if(rule){local=true;const middle=rule.suffix===undefined?'':spec.slice(rule.prefix.length,spec.length-rule.suffix.length);for(const target of rule.values){if(target.split('*').length>2){warn('CONFIG_UNSUPPORTED','tsconfig.json','Unsupported paths substitution');continue;}bases.push(path.posix.join(config.baseUrl??'',target.replace('*',middle)));}}
   if(config.baseUrl!==undefined)bases.push(path.posix.join(config.baseUrl,spec));
  }
  for(const b of bases){if(!safePath(b))continue;if(snapshot.paths.has(b+'/package.json')){warn('PACKAGE_DIRECTORY_UNSUPPORTED',from,'Directory package metadata is not resolved: '+spec);continue;}for(const c of candidates(b))if(snapshot.files.has(c))return c;}
  if(local)warn('UNRESOLVED_IMPORT',from,'Cannot resolve '+spec);
  else if(!spec.startsWith('node:'))warn('EXTERNAL_OR_WORKSPACE_IMPORT',from,'Package/workspace import excluded: '+spec);
 };
 const resolvePy=(from:string,imp:Import):string[]=>{
  const rel=imp.name.match(/^\.+/)?.[0].length??0;const name=imp.name.slice(rel).replaceAll('.','/');
  let bases:string[];
  if(rel){let dir=path.posix.dirname(from);for(let i=1;i<rel;i++)dir=path.posix.dirname(dir);bases=[path.posix.join(dir,name)];}
  else bases=roots.map(root=>path.posix.join(root,name));
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
  if(!found.length){warn(rel?'UNRESOLVED_IMPORT':'EXTERNAL_OR_UNRESOLVED_PYTHON',from,'Python module excluded/unresolved: '+imp.name);return [];}
  // Include existing package initializers along an explicitly resolved module path.
  for(const p of [...found]){let dir=path.posix.dirname(p);while(dir!=='.'){const init=dir+'/__init__.py';if(snapshot.files.has(init))found.push(init);dir=path.posix.dirname(dir);}}
  return [...new Set(found)];
 };
 for(const [p,source] of [...snapshot.files].sort(([a],[b])=>compare(a,b))){
  if(Date.now()>deadline){warn('TIME_LIMIT',p,'Parsing stopped at analysis deadline');break;}
  if(js.test(p)){
   const result=jsImports(source,p);for(const detail of result.warnings)warn('DYNAMIC_OR_INVALID_SYNTAX',p,detail);
   for(const imp of result.imports){const to=resolveJS(p,imp.name);if(to)add(p,to,imp.kind);}
  }else if(p.endsWith('.py')){
   const result=await pythonImports(source);for(const detail of result.warnings)warn('DYNAMIC_OR_INVALID_SYNTAX',p,detail);
   for(const imp of result.imports)for(const to of resolvePy(p,imp))if(to!==p)add(p,to,'python');
  }else if(/\.(?:go|rs|java|rb|php|vue|svelte|c|cpp|h|cs)$/.test(p))warn('UNSUPPORTED_LANGUAGE',p,'File import syntax is not supported');
 }
 return {edges,warnings};
}
