import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {validateGraph} from '../src/model.js';
import {html,svg} from '../src/render.js';
const graph:unknown=JSON.parse(await readFile('fixtures/sample.graph.json','utf8'));validateGraph(graph);
await mkdir('docs/demo',{recursive:true});
for(const [name,value] of Object.entries({'index.html':html(graph),'graph.svg':svg(graph),'graph.json':JSON.stringify(graph,null,2)+'\n','metadata.json':JSON.stringify({generatedAt:'2026-10-02T00:00:00Z',synthetic:true,tool:'PatchRipple',version:'0.1.0'},null,2)+'\n'}))await writeFile('docs/demo/'+name,value);
console.log('Synthetic offline demo built at docs/demo/index.html; links illustrate attribution, not public revisions.');
