import test from 'node:test';
import assert from 'node:assert/strict';
import {createPageTypeahead,pageMatchRanges,cyclePageMatch} from '../web/page-typeahead.js';
const pages=[{id:1,name:'Home'},{id:2,name:'Design mobile'},{id:3,name:'Design desktop'},{id:4,name:'Details'}];
test('page-sized jumps retain matching pages and clamp at list boundaries',()=>{
 assert.equal(cyclePageMatch(pages,'',1,2,false),3);
 assert.equal(cyclePageMatch(pages,'',4,-2,false),2);
 assert.equal(cyclePageMatch(pages,'',3,8,false),4);
 assert.equal(cyclePageMatch(pages,'',2,-8,false),1);
 assert.equal(cyclePageMatch(pages,'Design',2,8,false),3);
 assert.equal(cyclePageMatch(pages,'Design',3,-8,false),2);
 assert.equal(cyclePageMatch(pages,'missing',1,8,false),null);
});
test('Home and End include all pages when search is empty',()=>{
 assert.equal(cyclePageMatch(pages,'',2,'first'),1);
 assert.equal(cyclePageMatch(pages,'',2,'last'),4);
 assert.equal(cyclePageMatch([],'',2,'last'),null);
});
test('empty-search arrow navigation cycles all pages and wraps in both directions',()=>{
 assert.equal(cyclePageMatch(pages,'',1,1),2);
 assert.equal(cyclePageMatch(pages,'',2,-1),1);
 assert.equal(cyclePageMatch(pages,'',4,1),1);
 assert.equal(cyclePageMatch(pages,'',1,-1),4);
 assert.equal(cyclePageMatch([pages[0]],'',1,1),1);
 assert.equal(cyclePageMatch([],'',1,-1),null);
});
test('typing refines a name without changing the current match',()=>{
 const t=createPageTypeahead();let id=1,time=0;
 for(const key of 'Design d')id=t.match(key,pages,id,time+=50)??id;
 assert.equal(id,3);
});
test('repeated letters cycle, pause and reset start a fresh search',()=>{
 const t=createPageTypeahead();assert.equal(t.match('d',pages,1,0),2);
 assert.equal(t.match('D',pages,2,100),3);assert.equal(t.match('d',pages,4,200),2);
 assert.equal(t.match('h',pages,2,1300),1);t.reset();assert.equal(t.match('d',pages,1,1350),2);
});
test('no match and empty lists leave focus alone; initial space does not search',()=>{
 const t=createPageTypeahead();assert.equal(t.match(' ',pages,1,0),null);
 assert.equal(t.match('z',pages,1,50),null);t.reset();assert.equal(t.match('d',[],1,100),null);
});
test('Backspace edits the displayed search after a pause and recovers from no matches',()=>{
 const t=createPageTypeahead();assert.equal(t.match('d',pages,1,0),2);
 assert.equal(t.match('z',pages,2,50),null);assert.equal(t.query,'dz');
 assert.equal(t.match('Backspace',pages,2,5000),2);assert.equal(t.query,'d');
 assert.equal(t.match('Backspace',pages,2,5100),null);assert.equal(t.query,'');
 assert.equal(t.match('Backspace',pages,2,5200),null);
 t.match('d',pages,1,5300);t.match('d',pages,2,5400);
 t.match('Backspace',pages,3,5500);assert.equal(t.query,'');
});

test('search finds middle and ending text case-insensitively',()=>{
 for(const [query,expected] of [['MOBILE',2],['esk',3],['ails',4]]){
  const t=createPageTypeahead();let id=1,time=0;
  for(const key of query)id=t.match(key,pages,id,time+=50)??id;
  assert.equal(id,expected);
 }
});
test('highlight ranges include every occurrence and preserve original text positions',()=>{
 assert.deepEqual(pageMatchRanges('Mobile / MOBILE / mobile','mobile'),[[0,6],[9,15],[18,24]]);
 assert.deepEqual(pageMatchRanges('Design desktop','esk'),[[8,11]]);
 assert.deepEqual(pageMatchRanges('Page 1',''),[]);
 assert.deepEqual(pageMatchRanges('Page 1','xyz'),[]);
});

test('arrow navigation cycles only substring matches in both directions',()=>{
 assert.equal(cyclePageMatch(pages,'sign',2,1),3);
 assert.equal(cyclePageMatch(pages,'sign',3,1),2);
 assert.equal(cyclePageMatch(pages,'sign',2,-1),3);
 assert.equal(cyclePageMatch(pages,'sign',1,1),2);
 assert.equal(cyclePageMatch(pages,'sign',1,-1),3);
 assert.equal(cyclePageMatch(pages,'mobile',2,1),2);
 assert.equal(cyclePageMatch(pages,'missing',2,1),null);
 assert.equal(cyclePageMatch([], 'sign',2,-1),null);
});

test('Home and End choose the first and last matches without including unrelated pages',()=>{
 assert.equal(cyclePageMatch(pages,'sign',3,'first'),2);
 assert.equal(cyclePageMatch(pages,'sign',2,'last'),3);
 assert.equal(cyclePageMatch(pages,'mobile',1,'first'),2);
 assert.equal(cyclePageMatch(pages,'mobile',1,'last'),2);
 assert.equal(cyclePageMatch(pages,'missing',1,'first'),null);
 assert.equal(cyclePageMatch([], 'sign',1,'last'),null);
});
test('search field accepts complete literal queries including repeated letters',()=>{
 const t=createPageTypeahead();t.setQuery('OO',100);assert.equal(t.query,'oo');
 assert.deepEqual(pageMatchRanges('Book',t.query),[[1,3]]);
 t.setQuery('Design mobile',200);assert.equal(t.query,'design mobile');
 t.reset();assert.equal(t.query,'');
});
