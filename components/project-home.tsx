'use client';
import {useEffect,useRef} from 'react';
import {loadingScreenMarkup,startLoading,finishLoading,failLoading} from '../web/loading-screen.js';
import '../web/loading-screen.css';

export default function ProjectHome(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let disposed=false,cleanup:(()=>void)|undefined;
  startLoading('Loading your projects…');
  import('../web/project-home.js').then(({mountProjectHome})=>{
   if(!disposed&&root.current)cleanup=mountProjectHome(root.current,{onReady:finishLoading,onError:()=>failLoading()});
  }).catch(error=>{if(!disposed){console.error(error);failLoading();}});
  return ()=>{disposed=true;cleanup?.();finishLoading();};
 },[]);
 return <><div dangerouslySetInnerHTML={{__html:loadingScreenMarkup('Loading your projects…')}}/><div id="project-home" ref={root}/></>;
}
