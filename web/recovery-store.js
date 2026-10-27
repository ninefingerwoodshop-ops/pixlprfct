// Keep each tab's active file independent, with durable recovery after tab close.
export function recoveryStore(tab, durable) {
 return {
  getItem(key) { let value; try { value=tab?.getItem(key); } catch {} return value ?? durable?.getItem(key) ?? null; },
  setItem(key,value) {
   if(!tab&&!durable) throw new Error('Recovery storage unavailable');
   let tabError;
   try { tab?.setItem(key,value); } catch(error) { tabError=error; }
   if(durable) durable.setItem(key,value);
   else if(tabError) throw tabError;
  },
  removeItem(key) {
   const previous=tab?.getItem(key);
   tab?.removeItem(key);
   // Another tab may have saved a different file most recently.
   if(!previous||durable?.getItem(key)===previous) durable?.removeItem(key);
  }
 };
}
