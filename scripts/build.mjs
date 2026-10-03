import {build} from 'esbuild';
import {mkdir,copyFile,writeFile,chmod} from 'node:fs/promises';
await mkdir('dist',{recursive:true});await mkdir('schema',{recursive:true});
const common={bundle:true,platform:'node',target:'node24',format:'cjs',legalComments:'eof',tsconfig:'tsconfig.json',define:{__ASSET_DIR__:'__dirname','import.meta.url':'""'}};
await build({...common,entryPoints:['src/cli-entry.ts'],outfile:'dist/cli.cjs'});
await build({...common,entryPoints:['src/action.ts'],outfile:'dist/action.cjs'});
for(const [from,to] of [['node_modules/web-tree-sitter/tree-sitter.wasm','dist/tree-sitter.wasm'],['node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm','dist/tree-sitter-python.wasm']]){await copyFile(from,to);await chmod(to,0o644);}
const {graphSchema}=await import('../src/model.ts');
await writeFile('schema/graph-v1.json',JSON.stringify(graphSchema,null,2)+'\n');
await import('./notices.mjs');
