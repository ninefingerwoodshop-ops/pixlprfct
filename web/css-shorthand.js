export function parseBoxValues(value,{negative=false}={}){
 const text=String(value).trim(),parts=text.includes(',')?text.split(',').map(v=>v.trim()):text.split(/\s+/);
 const values=parts.map(v=>v&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:px)?$/.test(v)?Number(v.replace(/px$/,'')):NaN);
 if(values.length<1||values.length>4||values.some(n=>!Number.isFinite(n)||Math.abs(n)>100000||(!negative&&n<0)))throw Error('Enter 1–4 '+(negative?'':'non-negative ')+'numbers in CSS order');
 const [a,b=a,c=a,d=b]=values;return [a,b,c,d];
}
