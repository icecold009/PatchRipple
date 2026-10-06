import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const paths=['schema/graph-v1.json',...(await readdir('dist')).sort().map(p=>'dist/'+p)];
async function digest(){return Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));}
const before=await digest();
const build=spawnSync(process.execPath,['--import','tsx','scripts/build.mjs'],{encoding:'utf8',timeout:60000,windowsHide:true});
assert.equal(build.status,0,build.stderr);
const after=await digest();assert.deepEqual(after,before,'Generated files differ from a clean rebuild');
await writeFile('docs/BUILD_EVIDENCE.json',JSON.stringify({generatedFilesIdentical:true,files:after},null,2)+'\n');
console.log(JSON.stringify({generatedFilesIdentical:true,files:paths.length}));
