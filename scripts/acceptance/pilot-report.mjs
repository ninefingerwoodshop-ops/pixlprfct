import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Input: {participants:["P1"], sessions:[{participant:"P1",date:"2026-11-01",
// voluntary:false,fallback:false,fallbackReason:"",dataLoss:false,
// tasks:[{name:"import",completed:true,assisted:false,minutes:4}]}]}
export function pilotReport(input){
 const participants=input.participants??[],sessions=input.sessions??[];
 if(!Array.isArray(participants)||new Set(participants).size!==participants.length||!Array.isArray(sessions))throw new Error('Use unique participant IDs and an array of sessions.');
 const first=new Map(),returning=new Set(),reasons={};let attempted=0,completed=0,unassisted=0,fallback=0,loss=0;
 for(const s of [...sessions].sort((a,b)=>a.date.localeCompare(b.date))){
  if(!participants.includes(s.participant)||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||!Number.isFinite(Date.parse(s.date))||!Array.isArray(s.tasks)||['voluntary','fallback','dataLoss'].some(k=>typeof s[k]!=='boolean'))throw new Error('Every session needs a known participant, ISO date, boolean outcomes and task array.');
  if(!first.has(s.participant))first.set(s.participant,Date.parse(s.date));else if(s.voluntary&&Date.parse(s.date)>first.get(s.participant)&&Date.parse(s.date)-first.get(s.participant)<=7*86400000)returning.add(s.participant);
  for(const t of s.tasks){if(typeof t.completed!=='boolean'||typeof t.assisted!=='boolean')throw new Error('Tasks need explicit completed and assisted outcomes.');attempted++;if(t.completed){completed++;if(!t.assisted)unassisted++;}}
  if(s.fallback){fallback++;const reason=s.fallbackReason?.trim()||'Reason not recorded';reasons[reason]=(reasons[reason]??0)+1;}if(s.dataLoss)loss++;
 }
 const ratio=(n,d)=>d?Math.round(n/d*1000)/10:null;
 return {status:sessions.length?'Observed results; confirm day-7 follow-up is complete before deciding':'Not run — no participant evidence',participants:participants.length,participantsObserved:first.size,sessions:sessions.length,tasks:{attempted,completed,unassisted,unassistedPercent:ratio(unassisted,attempted)},voluntaryReturnByDay7:{count:returning.size,denominator:participants.length,percent:ratio(returning.size,participants.length)},fallback:{sessions:fallback,percent:ratio(fallback,sessions.length),reasons},dataLossIncidents:loss};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const input=process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):{participants:[],sessions:[]};console.log(JSON.stringify(pilotReport(input),null,2));}
