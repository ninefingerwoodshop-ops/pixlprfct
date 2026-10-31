import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotReport} from '../scripts/acceptance/pilot-report.mjs';
test('pilot reporting distinguishes missing evidence, assisted completion, voluntary returns and fallback',()=>{
 const empty=pilotReport({});assert.match(empty.status,/Not run/);assert.equal(empty.tasks.unassistedPercent,null);assert.equal(empty.voluntaryReturnByDay7.percent,null);
 const session=(participant,date,extra={})=>({participant,date,voluntary:false,fallback:false,dataLoss:false,tasks:[{completed:true,assisted:false}],...extra});
 const report=pilotReport({participants:['P1','P2','P3'],sessions:[
  session('P1','2026-11-01'),session('P2','2026-11-01',{tasks:[{completed:true,assisted:true},{completed:false,assisted:false}]}),
  session('P1','2026-11-02'),session('P2','2026-11-03',{voluntary:true,fallback:true,fallbackReason:'Export cleanup'}),
  session('P1','2026-11-09',{voluntary:true}),
 ]});
 assert.deepEqual(report.tasks,{attempted:6,completed:5,unassisted:4,unassistedPercent:66.7});assert.equal(report.participantsObserved,2);
 assert.deepEqual(report.voluntaryReturnByDay7,{count:1,denominator:3,percent:33.3});assert.deepEqual(report.fallback,{sessions:1,percent:20,reasons:{'Export cleanup':1}});
});
