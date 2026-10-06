import {readFile,writeFile,readdir} from 'node:fs/promises';
const packages=['typescript','ajv','fast-deep-equal','fast-uri','json-schema-traverse','require-from-string','web-tree-sitter','tree-sitter-wasms'];
const notices=['PatchRipple third-party notices. Generated assets retain upstream licenses.'];
for(const name of packages){
 const dir='node_modules/'+name;const pkg=JSON.parse(await readFile(dir+'/package.json','utf8'));
 const files=await readdir(dir);const license=files.find(p=>/^license(?:\.|$)/i.test(p));if(!license)throw new Error('Missing license for '+name);
 notices.push(name+' '+pkg.version+' ('+pkg.license+')\n'+await readFile(dir+'/'+license,'utf8'));
 const notice=files.find(p=>/^notice(?:\.|$)/i.test(p));if(notice)notices.push(await readFile(dir+'/'+notice,'utf8'));
}
notices.push('Python grammar distributed by tree-sitter-wasms. Upstream MIT license from tree-sitter/tree-sitter-python v0.21.0; package build dependency declares ^0.21.0.\n'+await readFile('licenses/tree-sitter-python-MIT.txt','utf8'));
await writeFile('dist/THIRD_PARTY_NOTICES.txt',(notices.join('\n\n--------------------\n\n')+'\n').replace(/\r\n?/g,'\n'));
