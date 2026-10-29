import {startLoading,finishLoading,failLoading} from './loading-screen.js';
startLoading();
try{
 const {mountProjectHome}=await import('./project-home.js');
 mountProjectHome(document.getElementById('project-home'),{onReady:finishLoading,onError:()=>failLoading()});
}catch(error){console.error(error);failLoading();}
