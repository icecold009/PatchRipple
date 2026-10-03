import Parser from 'web-tree-sitter';
await Parser.init();
const language=await Parser.Language.load('node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm');
const parser=new Parser();parser.setLanguage(language);
const tree=parser.parse('from .core import thing\nimport app.api as api\n');
if(tree.rootNode.hasError())throw new Error('Python grammar rejected valid source');
console.log(JSON.stringify({runtime:'web-tree-sitter 0.20.8',grammar:'tree-sitter-wasms 0.1.13 Python',offline:true,syntax:tree.rootNode.toString()}));
tree.delete();parser.delete();
