import {startLoading,failLoading} from './loading-screen.js';
import {projectRoute} from './project-navigation.js';
import {LocalDrafts} from './local-drafts.js';
import {cloudRequest} from './cloud-session.js';
import {isSvgAnimation} from './svg-animation-model.js';
startLoading();
try{
 const route=projectRoute(location.search);let body,draftId;
 if(route?.kind==='local')body=new LocalDrafts(localStorage,sessionStorage).get(route.id).body;
 else if(route?.kind==='cloud'){try{body=(await cloudRequest('/'+encodeURIComponent(route.id))).body;}catch{/* The regular editor owns its existing offline recovery flow. */}}
 else{try{const drafts=new LocalDrafts(localStorage,sessionStorage);body=drafts.restore();draftId=drafts.activeId;}catch{/* Existing recovery UI handles unavailable local storage. */}}
 if(body&&isSvgAnimation(JSON.parse(body)))location.replace('./svg-animation.html'+(route?location.search:'?draft='+encodeURIComponent(draftId)));
 else await import('./app.js');
}
catch(error){console.error(error);failLoading();}
