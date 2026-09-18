import * as T from 'three';
import {smooth,CREST_RESONANCE} from './cinema-config.js';

// The separate tapered crest plate and Tag follow Toei's 1999 model sheet:
// https://www.toei-anim.co.jp/tv/dejimon/chara/monsyou-taichi.html
// These are local vector shapes, not an embedded screenshot or toy photo.
const TAU=Math.PI*2,CREST_Y=-.115;
const OUTLINE=[[-.073,.56],[.073,.56],[.294,.075],[.316,-.228],[.132,-.54],[-.132,-.54],[-.316,-.228],[-.294,.075]];
const WINDOW=[[-.253,.045],[.253,.045],[.273,-.245],[-.273,-.245]];
const SLOT=[[-.025,.492],[.025,.492],[.039,.426],[-.039,.426]];
function polygon(points){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
function basic(color){return new T.MeshBasicMaterial({color,transparent:true,depthWrite:true,toneMapped:false,fog:false});}
function line(parent,points,color=0x675622,width=.002,z=.015){
 const curve=new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(x,y,z)),false,'catmullrom',0);
 const mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(8,points.length*4),width,4,false),basic(color));mesh.renderOrder=32;parent.add(mesh);return mesh;
}
function panel(parent,points,color,z){const mesh=new T.Mesh(new T.ShapeGeometry(polygon(points)),basic(color));mesh.position.z=z;mesh.renderOrder=31;parent.add(mesh);return mesh;}
function extrude(parent,shape,depth,front,side,z=0){
 const geo=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,curveSegments:12});geo.translate(0,0,z-depth);
 const mesh=new T.Mesh(geo,[basic(front),basic(side)]);mesh.renderOrder=30;parent.add(mesh);return mesh;
}
export function drawCourage(g,r,color='#a95218',width=r*.048){
 g.strokeStyle=color;g.lineWidth=width;g.lineJoin='miter';
 g.beginPath();g.arc(0,0,r*.42,0,TAU);g.stroke();
 g.beginPath();g.arc(0,0,r*.20,0,TAU);g.stroke();
 for(let i=0;i<8;i++){
  g.save();g.rotate(i*TAU/8);const cardinal=i%2===0;
  g.beginPath();g.moveTo(r*.59,-r*(cardinal?.115:.095));g.lineTo(r*(cardinal?1:.84),0);g.lineTo(r*.59,r*(cardinal?.115:.095));g.closePath();g.stroke();g.restore();
 }
}
export function courageMap(){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.translate(256,256);drawCourage(g,225,'#ffffff',10);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
}
export function createCourageTag(){
 const root=new T.Group();root.name='Courage_Tag_And_Crest';
 const shellShape=polygon(OUTLINE);shellShape.holes.push(new T.Path(WINDOW.map(p=>new T.Vector2(...p))),new T.Path(SLOT.map(p=>new T.Vector2(...p))));
 const shell=extrude(root,shellShape,.075,0xc8b350,0x756321);shell.name='Tag_Beveled_Frame_With_Window';
 // The bevels are broad cel facets, with the characteristic slanted lower grip.
 panel(root,[[-.073,.56],[-.045,.535],[-.258,.060],[-.294,.075]],0xf1dc7a,.007);
 panel(root,[[.073,.56],[.294,.075],[.316,-.228],[.285,-.213],[.268,.067],[.048,.534]],0x8b7a2c,.008);
 panel(root,[[-.316,-.228],[-.132,-.54],[-.102,-.484],[-.264,-.231]],0xe4cc6d,.008);
 panel(root,[[.316,-.228],[.132,-.54],[.102,-.484],[.264,-.231]],0x9b8331,.008);
 panel(root,[[-.132,-.54],[.132,-.54],[.102,-.484],[-.102,-.484]],0xd7c15f,.008);
 panel(root,[[-.046,.408],[.046,.408],[.214,.106],[-.214,.106]],0xb5a244,.009);
 line(root,[[-.046,.408],[-.214,.106],[.214,.106],[.046,.408]],0x73632c,.0025);
 line(root,[[-.057,.518],[-.278,.069]],0xffe69b,.0027);
 line(root,[[-.248,.065],[.247,.065],[.280,-.244]],0x6d5826,.0025);
 line(root,[[-.277,-.254],[.277,-.254]],0xffde87,.003);
 // Raised side rails and trapezoidal orange insert, independent from the Tag.
 const insertShape=polygon([[-.256,.05],[.256,.05],[.276,-.244],[-.276,-.244]]);
 const insert=extrude(root,insertShape,.018,0xe4a351,0xa86426,.010);insert.name='Courage_Trapezoidal_Insert';
 panel(root,[[-.241,.025],[.241,.025],[.254,-.222],[-.254,-.222]],0xeab16b,.016);
 for(const s of [-1,1]){
  panel(root,[[s*.248,.054],[s*.272,.07],[s*.302,-.255],[s*.277,-.25]],s<0?0xf4c585:0xc88b3f,.020);
  line(root,[[s*.247,.025],[s*.260,-.221]],0x9c6229,.0025,.021);
 }
 // Etched digital motif in the lower trapezoidal recess.
 panel(root,[[-.188,-.282],[.188,-.282],[.09,-.407],[-.09,-.407]],0xab9137,.010);
 line(root,[[-.188,-.282],[.188,-.282],[.09,-.407],[-.09,-.407],[-.188,-.282]],0x735b22,.0028);
 const circuits=[
  [[-.157,-.294],[-.133,-.323],[-.058,-.323],[-.058,-.307],[.015,-.307],[.015,-.29]],
  [[-.145,-.335],[-.115,-.37],[-.086,-.37],[-.086,-.351],[-.018,-.351],[-.018,-.374],[.023,-.374],[.023,-.339],[.063,-.339],[.063,-.293]],
  [[.087,-.298],[.142,-.298],[.12,-.323],[.088,-.323],[.088,-.354],[.051,-.39],[.005,-.39],[.005,-.381]],
  [[-.077,-.395],[-.051,-.37],[-.028,-.37]],
 ];
 for(const points of circuits){line(root,points,0xebcc68,.0045,.017);line(root,points.map(([x,y])=>[x+.002,y-.003]),0x72571e,.0017,.024);}
 for(const s of [-1,1])for(let i=0;i<5;i++){
  const y=-.28-i*.033,x=.302-i*.021;
  line(root,[[s*x,y],[s*(x-.041),y+.025]],0x6f5b24,.0033,.015);
  line(root,[[s*(x-.006),y+.009],[s*(x-.045),y+.033]],0xedce74,.002,.018);
 }
 // White suspension cord from the anime, through an actual metal loop.
 const ring=new T.Mesh(new T.TorusGeometry(.030,.009,8,40),basic(0xc1c6b8));ring.position.set(0,.548,.038);ring.scale.y=1.45;ring.rotation.y=.20;ring.renderOrder=33;root.add(ring);
 const cordPath=new T.CatmullRomCurve3([new T.Vector3(-.13,1.08,-.045),new T.Vector3(-.096,.80,-.024),new T.Vector3(-.025,.566,.019),new T.Vector3(.035,.669,.012),new T.Vector3(.21,1.08,-.04)]);
 const cord=new T.Mesh(new T.TubeGeometry(cordPath,60,.006,6,false),basic(0xebece0));cord.renderOrder=29;root.add(cord);cord.name='Anime_White_Cord';
 // Clean, outlined sun: two circles and eight separated triangular rays.
 const symbol=new T.Mesh(new T.PlaneGeometry(.216,.216),new T.MeshBasicMaterial({map:courageMap(),color:0xb36326,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:false}));
 symbol.position.set(0,CREST_Y,.032);symbol.renderOrder=34;root.add(symbol);symbol.name='Courage_Sun_Engraving';
 const shine=new T.Mesh(new T.PlaneGeometry(.53,.245),new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,fog:false,
  uniforms:{time:{value:0},charge:{value:0},power:{value:0}},
  vertexShader:'varying vec2 q;void main(){q=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 q;uniform float time,charge,power;void main(){float reflection=(1.-smoothstep(.03,.065,abs(q.x*.7+q.y-.68)))*.17;float center=exp(-dot((q-.5)*vec2(1.5,1.),(q-.5)*vec2(1.5,1.))*4.);float a=reflection+center*(charge*.15+power*.28);gl_FragColor=vec4(1.,.78,.38,a);}`
 }));shine.position.set(0,-.10,.027);shine.renderOrder=33;root.add(shine);
 const aura=new T.Mesh(new T.PlaneGeometry(2.5,2.5),new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,blending:T.AdditiveBlending,
  uniforms:{power:{value:0},charge:{value:0},burst:{value:0},time:{value:0}},
  vertexShader:'varying vec2 q;void main(){q=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 q;uniform float power,charge,burst,time;void main(){float r=length(q),a=atan(q.y,q.x);float core=exp(-r*r*25.);float rays=pow(abs(cos(a*4.)),46.)*exp(-r*3.4);float minor=pow(max(0.,cos(a*19.+sin(time*.7)*.3)),45.)*exp(-r*4.);float opacity=core*(charge*.16+power*.22)+rays*(power*.28+burst*.30)+minor*burst*.17;gl_FragColor=vec4(1.,.55,.10,opacity*(1.-smoothstep(.8,1.,r)));}`
 }));aura.position.set(0,CREST_Y,-.09);aura.renderOrder=28;root.add(aura);
 const symbolDark=new T.Color(0xa6531d),symbolLit=new T.Color().setRGB(2.2,1.55,.70);let state={};
 function update(t){
  const charge=smooth(.45,1.86,t),power=CREST_RESONANCE.pulses.reduce((sum,at,i)=>sum+Math.exp(-Math.pow((t-at)/[.21,.24,.28][i],2))*[.38,.64,.92][i],0);
  const burst=smooth(1.73,2.38,t),entry=1-smooth(0,.7,t);
  root.rotation.set(.045+entry*.05,Math.sin(t*1.7)*.09+entry*.25,Math.sin(t*2.4)*.028*Math.exp(-t*.75));
  root.position.set(0,.02+smooth(0,.9,t)*.055+Math.sin(t*2.1)*.008,0);root.scale.setScalar(1+smooth(.8,2.38,t)*.10);
  symbol.material.color.copy(symbolDark).lerp(symbolLit,Math.min(1,charge*.62+power*.56));
  for(const m of [shine.material,aura.material]){m.uniforms.time.value=t;m.uniforms.charge.value=charge;m.uniforms.power.value=power;}
  aura.material.uniforms.burst.value=burst;
  state={charge,power,burst,sunY:CREST_Y,scale:root.scale.x};
 }
 return {root,shell,insert,symbol,cord,aura,update,get state(){return state;}};
}
