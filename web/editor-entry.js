import {startLoading,failLoading} from './loading-screen.js';
startLoading();
try{await import('./app.js');}
catch(error){console.error(error);failLoading();}
