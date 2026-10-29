import test from 'node:test';
import assert from 'node:assert/strict';
import {projectRoute,projectUrl,visibleProjects} from '../web/project-navigation.js';
import {LocalDrafts,newDesign} from '../web/local-drafts.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}};

test('project links roundtrip local and cloud identities without interpreting names as URLs',()=>{
 for(const kind of ['local','cloud'])for(const id of ['a-file-id','spaces & symbols/#?']){
  const project={kind,id},url=new URL(projectUrl(project),'https://example.test');
  assert.equal(url.pathname,'/editor/index.html');assert.equal(url.hash,'');assert.deepEqual(projectRoute(url.search),project);
 }
 assert.equal(projectRoute(''),null);assert.equal(projectRoute('?unrelated=value'),null);
 for(const search of ['?draft=','?cloud=','?draft=a&cloud=b','?draft=%20'])assert.throws(()=>projectRoute(search),/incomplete/);
});

test('an explicit project link reopens that file regardless of the last active project',()=>{
 const storage=memory(),tab=memory();let id=0;const library=new LocalDrafts(storage,tab,{id:()=>String(++id)});
 const first=library.create(newDesign('Original','desktop')),second=library.create(newDesign('Another','mobile'));
 const request=projectRoute(new URL(projectUrl({kind:'local',id:first.id}),'https://example.test').search),reloaded=new LocalDrafts(storage,tab);
 assert.equal(JSON.parse(reloaded.restore()).name,'Another');
 assert.equal(JSON.parse(reloaded.activate(request.id)).name,'Original');assert.equal(reloaded.list().length,2);
 assert.equal(JSON.parse(reloaded.get(second.id).body).name,'Another');
 assert.throws(()=>reloaded.get('missing'),/no longer available/);assert.equal(reloaded.list().length,2);
});

test('home filters and sorts local and cloud projects without changing saved ordering',()=>{
 const projects=[{id:'a',kind:'local',name:'Mobile',updatedAt:10},{id:'b',kind:'cloud',name:'Desktop',updatedAt:30},{id:'c',kind:'local',name:'Checkout',updatedAt:20}];
 assert.deepEqual(visibleProjects(projects).map(p=>p.id),['b','c','a']);
 assert.deepEqual(visibleProjects(projects,{sort:'name'}).map(p=>p.id),['c','b','a']);
 assert.deepEqual(visibleProjects(projects,{scope:'local'}).map(p=>p.id),['c','a']);
 assert.deepEqual(visibleProjects(projects,{query:'  DESK ',scope:'cloud'}).map(p=>p.id),['b']);
 assert.deepEqual(visibleProjects(projects,{query:'missing'}),[]);assert.deepEqual(projects.map(p=>p.id),['a','b','c']);
});
