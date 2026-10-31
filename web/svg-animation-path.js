import {parsePath} from './svg-path.js';

const NS='http://www.w3.org/2000/svg';
export const pathKinds=new Set(['path','line','polyline','polygon','rect','circle','ellipse']);
export function pathGeometry(node){
 const n=name=>node[name]?.baseVal?.value??Number(node.getAttribute(name)??0),kind=node.localName;
 if(kind==='path')return node.getAttribute('d')??'';
 if(kind==='line')return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
 if(kind==='polyline'||kind==='polygon')return 'M'+(node.getAttribute('points')??'')+(kind==='polygon'?'Z':'');
 if(kind==='circle'||kind==='ellipse'){const x=n('cx'),y=n('cy'),rx=n(kind==='circle'?'r':'rx'),ry=n(kind==='circle'?'r':'ry');return `M${x+rx} ${y}A${rx} ${ry} 0 1 1 ${x-rx} ${y}A${rx} ${ry} 0 1 1 ${x+rx} ${y}Z`;}
 if(kind==='rect'){const x=n('x'),y=n('y'),w=n('width'),h=n('height'),rx=Math.min(w/2,n('rx')||n('ry')),ry=Math.min(h/2,n('ry')||n('rx'));return rx&&ry?`M${x+rx} ${y}H${x+w-rx}A${rx} ${ry} 0 0 1 ${x+w} ${y+ry}V${y+h-ry}A${rx} ${ry} 0 0 1 ${x+w-rx} ${y+h}H${x+rx}A${rx} ${ry} 0 0 1 ${x} ${y+h-ry}V${y+ry}A${rx} ${ry} 0 0 1 ${x+rx} ${y}Z`:`M${x} ${y}H${x+w}V${y+h}H${x}Z`;}
 throw new Error('Choose a path, line, rectangle, ellipse, or polygon.');
}
export function captureMotionPath(source,target){
 if(source===target||target.contains(source))throw new Error('Choose a path outside the animated element.');
 const paths=parsePath(pathGeometry(source));if(paths.length!==1)throw new Error('Choose one continuous motion path.');
 const sourceMatrix=source.getScreenCTM(),parentMatrix=target.parentElement.getScreenCTM();if(!sourceMatrix||!parentMatrix)throw new Error('This path cannot be measured.');
 const matrix=parentMatrix.inverse().multiply(sourceMatrix),point=p=>{const q=new DOMPoint(p.x,p.y).matrixTransform(matrix);if(!Number.isFinite(q.x)||!Number.isFinite(q.y)||Math.abs(q.x)>100000||Math.abs(q.y)>100000)throw new Error('Motion path coordinates are out of range.');return `${Number(q.x.toFixed(6))} ${Number(q.y.toFixed(6))}`;};
 const path=paths[0],nodes=path.points;let d='M'+point(nodes[0]);
 for(let i=1;i<nodes.length+(path.closed?1:0);i++){const a=nodes[i-1],b=nodes[i%nodes.length];d+=a.out||b.in?'C'+point(a.out??a)+' '+point(b.in??b)+' '+point(b):'L'+point(b);}
 if(path.closed)d+='Z';const probe=document.createElementNS(NS,'path');probe.setAttribute('d',d);if(!(probe.getTotalLength()>0))throw new Error('Motion paths need a nonzero length.');
 return {d,name:(source.getAttribute('data-layer-name')||source.localName).slice(0,256),rotate:'none'};
}
export function pathSampler(d){
 const node=document.createElementNS(NS,'path');node.setAttribute('d',d);const length=node.getTotalLength();if(!Number.isFinite(length)||length<=0)throw new Error('Motion paths need a nonzero length.');
 return progress=>{const distance=Math.max(0,Math.min(1,progress))*length,p=node.getPointAtLength(distance),epsilon=Math.min(.01,length/1000),a=node.getPointAtLength(Math.max(0,distance-epsilon)),b=node.getPointAtLength(Math.min(length,distance+epsilon));return {x:p.x,y:p.y,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};};
}
