'use client';
import {useEffect,useRef} from 'react';
import {mountProjectHome} from '../web/project-home.js';

export default function ProjectHome(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(root.current)return mountProjectHome(root.current);
 },[]);
 return <div id="project-home" ref={root}/>;
}
