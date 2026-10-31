// Cache only the editor's artwork, leaving selection and interaction overlays live.
// Overscan allows small pans to reuse the raster at its original pixel density.
// Fractional-pixel shifts repaint so text never becomes blurred by resampling.
export function createViewportRenderer(render,{createSurface=(w,h)=>new OffscreenCanvas(w,h),maxPixels=16_777_216,padding=256,deferEdits=false}={}){
 let cached=null,lastKey=null;
 const invalidate=()=>{lastKey=null;if(cached){cached.surface.width=1;cached.surface.height=1;cached=null;}};
 const draw=(scene,target,paint)=>{
  const t=target.getTransform(),width=target.canvas.width,height=target.canvas.height;
  const bufferWidth=width+padding*2,bufferHeight=height+padding*2;
  if(t.b||t.c||t.a<=0||t.a!==t.d||bufferWidth*bufferHeight>maxPixels||bufferWidth>8192||bufferHeight>8192){invalidate();render(scene,target,paint);return;}
  const key=JSON.stringify(scene),dx=cached?t.e-cached.x:0,dy=cached?t.f-cached.y:0;
  // Fresh artwork can paint directly. Building and copying a large temporary
  // raster on every keystroke is more expensive than its saved work. Cache on
  // the next unchanged draw, when pan/selection reuse can actually benefit.
  if(deferEdits&&lastKey!==key){invalidate();lastKey=key;render(scene,target,paint);return;}
  const aligned=Math.abs(dx-Math.round(dx))<1e-6&&Math.abs(dy-Math.round(dy))<1e-6;
  if(!cached||cached.key!==key||cached.scale!==t.a||cached.width!==width||cached.height!==height||!aligned||Math.abs(dx)>padding||Math.abs(dy)>padding){
   invalidate();const surface=createSurface(bufferWidth,bufferHeight),context=surface.getContext('2d');
   context.setTransform(t.a,0,0,t.d,t.e+padding,t.f+padding);
   render(scene,context,paint);
   cached={surface,key,scale:t.a,x:t.e,y:t.f,width,height};lastKey=key;
  }
  target.save();target.setTransform(1,0,0,1,0,0);
  target.drawImage(cached.surface,Math.round(t.e-cached.x)-padding,Math.round(t.f-cached.y)-padding);
  target.restore();
 };
 return {draw,invalidate};
}
