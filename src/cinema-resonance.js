import * as T from 'three';
import {smooth,pulse,RESONANCE,CREST_RESONANCE} from './cinema-config.js';
import {addDigiviceDepth,createDigiviceEmission} from './cinema-digivice.js';
import {createCourageTag} from './cinema-crest.js';

// The animated LCD and glyphs are shaded on the casing itself. No detached
// transparent screen can cross the casing or the following character shot.
function material(map,activatedMap){
 const uniforms={resTime:{value:0},resCharge:{value:0},resPulse:{value:0},resActivation:{value:0},resActivatedMap:{value:activatedMap}};
 const m=new T.MeshBasicMaterial({map,transparent:true,alphaTest:.035,depthWrite:false,depthTest:false,toneMapped:false});
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec2 vResUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvResUV=uv;');
  shader.fragmentShader='varying vec2 vResUV;uniform float resTime,resCharge,resPulse,resActivation;uniform sampler2D resActivatedMap;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,texture2D(resActivatedMap,vMapUv).rgb,resActivation);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec2 px=(vResUV-.5)*vec2(640.,-760.);
    vec2 lcdPx=px-vec2(0.,-17.);
    float screen=(1.-smoothstep(102.,106.,abs(lcdPx.x)))*(1.-smoothstep(102.,106.,abs(lcdPx.y)));
    float sweep=exp(-pow((lcdPx.y-(104.-fract(resTime*.45)*208.))/12.,2.));
    vec3 lcd=mix(vec3(.035,.084,.055),vec3(.22,.48,.27),resCharge)+vec3(.12,.23,.15)*sweep;
    outgoingLight=mix(outgoingLight,lcd,screen);
    vec2 ring=lcdPx/142.;float radius=length(ring),angle=atan(ring.y,ring.x);
    float band=smoothstep(.85,.91,radius)*(1.-smoothstep(1.08,1.13,radius))*(1.-screen);
    float glyph=band*(1.-smoothstep(.18,.32,max(outgoingLight.r,outgoingLight.g)));
    float travel=pow(.5+.5*cos(angle+resTime*1.7),5.);
    outgoingLight*=1.-band*resCharge*.78;
    outgoingLight+=vec3(.25,.67,.42)*glyph*(resCharge*.30+travel*.29+resPulse*.40);
   #include <opaque_fragment>
  `);
 };
 m.customProgramCacheKey=()=> 'cinema-resonance-v8';return {material:m,uniforms};
}
export function createResonance(deviceMap,activatedMap){
 const root=new T.Group();root.name='Digivice_Resonance';
 const d=material(deviceMap,activatedMap),tag=createCourageTag(),badge=tag.root;
 const device=new T.Mesh(new T.PlaneGeometry(1,760/640),d.material);
 device.material.depthTest=true;device.material.depthWrite=true;
 addDigiviceDepth(device);
 const emission=createDigiviceEmission(device);
 device.renderOrder=badge.renderOrder=30;root.add(device,badge);
 const halo=new T.Mesh(new T.PlaneGeometry(2.6,2.6),new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,blending:T.AdditiveBlending,
  uniforms:{time:{value:0},charge:{value:0},power:{value:0},cues:{value:new T.Vector3(...RESONANCE.pulses)},color:{value:new T.Color(0x8affbf)}},
  vertexShader:'varying vec2 q;void main(){q=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 q;uniform float time,charge,power;uniform vec3 color,cues;
   float wave(float start,float r){float age=(time-start)/.80;return step(0.,age)*(1.-smoothstep(.55,1.,age))*exp(-pow((r-(.25+age*.55))/.013,2.));}
   void main(){float r=length(q*vec2(1.,.87));float glow=exp(-r*r*5.5)*(.04+charge*.13+power*.13);
    float rings=wave(cues.x,r)+wave(cues.y,r)+wave(cues.z,r);float a=glow+rings*.17;
    gl_FragColor=vec4(color,a*(1.-smoothstep(.85,1.,r)));}`
 }));halo.renderOrder=28;halo.position.z=-.003;root.add(halo);
 const offset=new T.Vector3(),shell=device.getObjectByName('Digivice_Beveled_Shell'),shellWhite=new T.Color(0x74b5b2),shellOrange=new T.Color(0xc7792f);let state={visible:false};
 function update(config,time,camera){
  const duration=config.resonanceDuration,visible=duration>0&&time<duration,kind=config.kind;
  const crest=config.crestDuration>0,badgeShot=crest&&time<CREST_RESONANCE.tagDuration;
  root.visible=visible;device.visible=visible&&!badgeShot;badge.visible=visible&&badgeShot;halo.visible=visible&&!badgeShot;
  if(!visible){state={visible:false};return;}
  if(badgeShot){
   // One suspended object, with the light anchored to its engraved sun.
   // The receiver replaces it only underneath the peak of the light cut.
   root.quaternion.copy(camera.quaternion);offset.set(0,-.025,-3);
   root.position.copy(camera.position).add(offset.applyQuaternion(camera.quaternion));
   root.scale.setScalar(Math.min(1.08,camera.aspect/.72));tag.update(Math.max(0,time));
   emission.mesh.visible=false;
   state={visible:true,stage:time<.5?'徽章亮相':time<1.7?'勇气纹章点亮':'纹章释放光芒',time,charge:tag.state.charge,power:tag.state.power,tag:tag.state,push:0,scale:root.scale.x,emission:null,flash:pulse(time,...CREST_RESONANCE.cut)};
   return;
  }
  const t=crest?Math.max(0,time-CREST_RESONANCE.tagDuration)*RESONANCE.duration/CREST_RESONANCE.deviceDuration:Math.max(0,time);
  const charge=smooth(RESONANCE.chargeStart,RESONANCE.chargeEnd,t),push=smooth(RESONANCE.fullView,RESONANCE.duration,t),settle=1-smooth(0,RESONANCE.settle,t);
  const bump=at=>Math.exp(-Math.pow((t-at)/.15,2)),power=RESONANCE.pulses.reduce((sum,at,i)=>sum+bump(at)*[.35,.58,.9][i],0);
  const quiet=1-push,roll=(-.035+Math.sin(t*1.7)*.045+settle*.085)*quiet;
  // Finish the casing's entrance turn before any strip leaves the screen.
  // Once emitting, all rows share the passage's camera-space vertical axis.
  const upright=1-smooth(.25,.62,t),sway=upright;
  root.quaternion.copy(camera.quaternion);
  offset.set(Math.sin(t*1.4)*.016*quiet*sway,(.155+Math.sin(t*1.9)*.029-settle*.07+power*.009)*quiet,-3);
  root.position.copy(camera.position).add(offset.applyQuaternion(camera.quaternion));
  const fill=6*Math.tan(T.MathUtils.degToRad(camera.fov*.5))*Math.max(camera.aspect/.32,1/.28)*1.08;
  const framing=Math.min(camera.aspect<1?.86:1,camera.aspect/.75);
  const base=(1.1-settle*.12)*(1+power*.016+Math.sin(t*1.9)*.005)*framing;
  root.scale.setScalar(base*Math.pow(fill/base,push));
  device.rotation.set(Math.cos(t*1.5)*.042*quiet*upright,(Math.sin(t*1.35)*.10+settle*.09)*quiet*upright,roll*upright);
  // A restrained activation tremor resolves before vertical data emission.
  const activation=crest?smooth(.05,.56,t):0;
  device.position.set(crest?Math.sin(t*72)*.004*pulse(t,.05,.18,.38,.62):0,0,0);
  d.uniforms.resTime.value=t;d.uniforms.resCharge.value=charge;d.uniforms.resPulse.value=power;d.uniforms.resActivation.value=activation;
  shell.material.color.copy(shellWhite).lerp(shellOrange,activation);
  emission.update(t,charge,push,root.scale.x);
  halo.material.uniforms.time.value=t;halo.material.uniforms.charge.value=charge;halo.material.uniforms.power.value=power;halo.material.uniforms.color.value.set(kind==='normal'?0x8affbf:0xffc867);
  state={visible:true,stage:crest?'神圣计划响应':'共鸣',time:t,charge,power,push,roll:roll*sway,activation,scale:root.scale.x,emission:emission.state,flash:crest?pulse(time,...CREST_RESONANCE.cut):0};
 }
 return {root,device,badge,tag,halo,emission,update,get state(){return state;}};
}
