import test from 'node:test';
import assert from 'node:assert/strict';
import {TeamSession,sameArtwork} from '../web/team-session.js';
import {CloudSession} from '../web/cloud-session.js';
const document={version:1,name:'Team',active_page:1,shapes:[]};
test('review navigation is allowed but artwork edits and offline saves are gated',async()=>{
 let body=JSON.stringify(document),clock=1000,writes=0;
 const session=new CloudSession({snapshot:()=>body,request:async()=>{writes++;return {revision:2};}});session.adopt({id:'file',revision:1},body);
 const model=new TeamSession({session,request:async()=>({serverNow:clock,documentRevision:1,canEdit:true,role:'editor',lease:null}),reload:async()=>{},now:()=>clock});session.equal=sameArtwork;session.beforeWrite=()=>{if(!model.editable())throw new Error('Editing paused');};
 await model.context('file');assert.equal(model.editable(),false);assert.equal(model.guard(document,{...document,active_page:2}),null);assert(model.guard(document,{...document,name:'Unsafe'}));
 await model.accept({serverNow:clock,documentRevision:1,canEdit:true,lease:{mine:true,token:'one',expiresAt:91000}});assert(model.editable());body=JSON.stringify({...document,name:'Retained locally'});model.offline();await assert.rejects(session.flush(),/paused/);assert.equal(writes,0);assert(session.isDirty());assert.equal(JSON.parse(body).name,'Retained locally');
 clock=100000;assert.equal(model.editable(),false);
});
test('handoff reloads the saved revision before allowing edits and never overwrites dirty work',async()=>{
 let dirty=false,reloads=0,revision=1;
 const session={isDirty:()=>dirty,get active(){return {id:'file',revision};},flush:async()=>{dirty=false;}};
 const model=new TeamSession({session,request:async()=>({serverNow:0,documentRevision:1,canEdit:true,lease:null}),reload:async()=>{assert.equal(model.editable(),false);reloads++;revision=2;},now:()=>0});
 await model.context('file');await model.accept({serverNow:0,documentRevision:2,canEdit:true,lease:{mine:true,token:'new',expiresAt:90000}});assert.equal(reloads,1);assert(model.editable());
 dirty=true;await model.accept({serverNow:0,documentRevision:3,canEdit:true,lease:{mine:true,token:'newer',expiresAt:90000}});assert.equal(reloads,1);assert.equal(model.editable(),false);assert.match(model.issue,/unsaved/);
});
