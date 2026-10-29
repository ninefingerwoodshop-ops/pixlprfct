export const shaderPresets={
 mesh:'float n=sin(uv.x*u_scale+sin(uv.y*u_scale+u_time))*cos(uv.y*u_scale-u_time*.3);return vec4(mix(u_color,u_secondary,n*.5+.5),1.0);',
 noise:'vec2 p=floor(uv*u_scale*40.0);float n=fract(sin(dot(p+u_seed,vec2(12.9898,78.233)))*43758.5453);return vec4(mix(u_color,u_secondary,n),1.0);',
 waves:'float n=sin((uv.x+sin(uv.y*6.0+u_time)*.2)*u_scale*6.283+u_time)*.5+.5;return vec4(mix(u_color,u_secondary,smoothstep(.2,.8,n)),1.0);'
};
export const customShaderTemplate=`// uv ranges from 0 to 1. Available uniforms:
// u_color, u_secondary, u_scale, u_time, u_seed
vec4 paint(vec2 uv) {
  ${shaderPresets.mesh}
}`;
let surface,gl,buffer,program,lastCode;
export function shaderSnapshot(p,color,width=384,height=384){
 if(!surface){surface=document.createElement('canvas');gl=surface.getContext('webgl',{preserveDrawingBuffer:true,alpha:true});if(!gl){surface=null;throw Error('Shader paints need WebGL. Enable hardware acceleration and try again.');}buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);}
 const body=p.preset==='custom'?p.code||customShaderTemplate:`vec4 paint(vec2 uv){${shaderPresets[p.preset]}}`,code=`precision highp float;varying vec2 v_uv;uniform vec3 u_color,u_secondary;uniform float u_scale,u_time,u_seed;${body}\nvoid main(){gl_FragColor=paint(v_uv);}`;
 if(code!==lastCode){const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message);}return shader;};const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 v_uv;void main(){v_uv=vec2((position.x+1.0)/2.0,(1.0-position.y)/2.0);gl_Position=vec4(position,0.0,1.0);}');let fragment,next;try{fragment=compile(gl.FRAGMENT_SHADER,code);next=gl.createProgram();gl.attachShader(next,vertex);gl.attachShader(next,fragment);gl.linkProgram(next);if(!gl.getProgramParameter(next,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(next));}catch(e){if(next)gl.deleteProgram(next);throw e;}finally{gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);}if(program)gl.deleteProgram(program);program=next;lastCode=code;}
 surface.width=width;surface.height=height;gl.viewport(0,0,width,height);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);gl.uniform3fv(gl.getUniformLocation(program,'u_color'),rgb(color));gl.uniform3fv(gl.getUniformLocation(program,'u_secondary'),rgb(p.color));for(const name of ['scale','time','seed'])gl.uniform1f(gl.getUniformLocation(program,'u_'+name),p[name]);gl.drawArrays(gl.TRIANGLES,0,6);return surface.toDataURL('image/png');
}
let playback=null;
export function stopPaintPreview(){if(playback){cancelAnimationFrame(playback.frame);playback.video?.pause();if(playback.video){playback.video.removeAttribute('src');playback.video.load();}playback=null;if(typeof window!=='undefined')window.dispatchEvent(new Event('paint-texture-ready'));}}
export async function startPaintPreview(shape,channel,paint){
 stopPaintPreview();const state={id:shape.id,channel,paint:paint.id,frame:0,data:'',started:performance.now(),last:0};playback=state;
 if(paint.media?.kind==='video'){const video=document.createElement('video');state.video=video;video.muted=true;video.loop=true;video.playsInline=true;video.src=paint.media.data_url;try{await video.play();}catch(e){stopPaintPreview();throw e;}}
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=Math.max(1,Math.round(384*shape.height/shape.width));const ctx=canvas.getContext('2d');
 const tick=now=>{if(playback!==state)return;if(now-state.last>80){state.last=now;if(state.video?.readyState>=2){canvas.height=Math.max(1,Math.round(384*state.video.videoHeight/state.video.videoWidth));ctx.drawImage(state.video,0,0,canvas.width,canvas.height);state.data=canvas.toDataURL('image/jpeg',.8);}else if(paint.shader)state.data=shaderSnapshot({...paint.shader,time:paint.shader.time+(now-state.started)/1000},paint.color,384,384);window.dispatchEvent(new Event('paint-texture-ready'));}state.frame=requestAnimationFrame(tick);};state.frame=requestAnimationFrame(tick);
}
export function previewPaints(shapes){if(!playback?.data)return shapes;return shapes.map(s=>s.id!==playback.id?s:{...s,appearance:{...s.appearance,[playback.channel==='fill'?'fills':'strokes']:(s.appearance?.[playback.channel==='fill'?'fills':'strokes']??[]).map(p=>p.id!==playback.paint?p:p.media?{...p,media:{...p.media,_frame:playback.data}}:{...p,shader:{...p.shader,snapshot:playback.data}})}});}
