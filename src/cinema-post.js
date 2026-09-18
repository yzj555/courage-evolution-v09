import * as T from 'three';

// A small, fixed-size render pipeline: scene -> soft bright pass -> composite.
// Every animation value comes from the cinematic clock, including film grain.
export function createCinemaPost(renderer,{antialias=true}={}){
 const hdr=renderer.extensions.has('EXT_color_buffer_float');
 const main=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:antialias?Math.min(4,renderer.capabilities.maxSamples):0});
 const blurA=new T.WebGLRenderTarget(1,1,{depthBuffer:false}),blurB=new T.WebGLRenderTarget(1,1,{depthBuffer:false});
 const s=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));s.add(quad);
 const vertexShader='varying vec2 vUV;void main(){vUV=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:null},stepUV:{value:new T.Vector2()},extract:{value:1}},vertexShader,
  fragmentShader:`varying vec2 vUV;uniform sampler2D source;uniform vec2 stepUV;uniform float extract;
  vec3 fetch(vec2 p){vec3 c=texture2D(source,p).rgb;return mix(c,c*smoothstep(.48,1.05,max(c.r,max(c.g,c.b))),extract);}
  void main(){vec3 c=fetch(vUV)*.227027;c+=(fetch(vUV+stepUV*1.384615)+fetch(vUV-stepUV*1.384615))*.316216;c+=(fetch(vUV+stepUV*3.230769)+fetch(vUV-stepUV*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`});
 const composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:main.texture},bloom:{value:blurB.texture},strength:{value:.38},flash:{value:0},time:{value:0},rush:{value:0}},vertexShader,
  fragmentShader:`varying vec2 vUV;uniform sampler2D source,bloom;uniform float strength,flash,time,rush;
  void main(){vec3 c=texture2D(source,vUV).rgb;
   if(rush>.001){vec2 trail=(vUV-vec2(.5,.795))*rush*.045;c=c*.60+texture2D(source,vUV-trail*.33).rgb*.22+texture2D(source,vUV-trail*.67).rgb*.12+texture2D(source,vUV-trail).rgb*.06;}
   c+=texture2D(bloom,vUV).rgb*strength;
   float vignette=1.-.28*pow(length((vUV-.5)*vec2(1.0,1.3)),1.7);c*=vignette;
   c=mix(c,vec3(1.1,1.02,.85),flash);float noise=fract(sin(dot(vUV*1000.+floor(time*24.),vec2(12.9898,78.233)))*43758.5453);c+=(noise-.5)*.002;
   gl_FragColor=vec4(c,1.);#include <colorspace_fragment>
  }`.replace(';#include',';\n#include')});
 function resize(w,h){main.setSize(w,h);blurA.setSize(Math.max(1,w>>2),Math.max(1,h>>2));blurB.setSize(Math.max(1,w>>2),Math.max(1,h>>2));}
 function render(scene,cam,{flash=0,bloom=.38,time=0,rush=0}={}){
  renderer.setRenderTarget(main);renderer.render(scene,cam);
  quad.material=blur;blur.uniforms.source.value=main.texture;blur.uniforms.extract.value=1;blur.uniforms.stepUV.value.set(1.5/blurA.width,0);renderer.setRenderTarget(blurA);renderer.render(s,camera);
  blur.uniforms.source.value=blurA.texture;blur.uniforms.extract.value=0;blur.uniforms.stepUV.value.set(0,1.5/blurA.height);renderer.setRenderTarget(blurB);renderer.render(s,camera);
  quad.material=composite;composite.uniforms.strength.value=bloom;composite.uniforms.flash.value=flash;composite.uniforms.time.value=time;composite.uniforms.rush.value=rush;renderer.setRenderTarget(null);renderer.render(s,camera);
 }
 return {resize,render,targets:[main,blurA,blurB]};
}
