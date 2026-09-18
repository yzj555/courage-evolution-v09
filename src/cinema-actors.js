import * as T from 'three';
import {loadCharacter} from './evolution-character.js';
import {smooth,pulse,random} from './cinema-config.js';

// These are separate character instances. The accepted viewer and its materials
// are never changed by the experimental sequence.
export async function createCinemaActor(id,asset){
 const c=await loadCharacter(id,asset);c.poseAt(0,'idle',0);c.rig.updateMatrixWorld(true);c.body.computeBoundingBox();
 const nativeBox=c.body.boundingBox.clone().applyMatrix4(c.body.matrixWorld),nativeHeight=nativeBox.max.y-nativeBox.min.y;
 const center=nativeBox.getCenter(new T.Vector3()),baseMaterial=c.body.material;
 const uniforms={evoGlow:{value:0},evoGold:{value:0},evoArmor:{value:-1},evoReveal:{value:1},evoOpacity:{value:1},evoTime:{value:0},evoMin:{value:nativeBox.min.y},evoHeight:{value:nativeHeight},evoColor:{value:new T.Color(0xffc97e)}};
 const material=baseMaterial.clone();material.transparent=true;material.depthWrite=true;material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vEvolutionPosition;varying vec3 vEvolutionNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\nvEvolutionPosition=transformed;vEvolutionNormal=normalize(transformedNormal);');
  shader.fragmentShader=`varying vec3 vEvolutionPosition;varying vec3 vEvolutionNormal;uniform float evoGlow,evoGold,evoArmor,evoReveal,evoOpacity,evoTime,evoMin,evoHeight;uniform vec3 evoColor;\n`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float evolutionHeight=clamp((vEvolutionPosition.y-evoMin)/evoHeight,0.,1.);
   vec3 cell=floor(vEvolutionPosition/evoHeight*95.);
   float grain=fract(sin(dot(cell,vec3(12.9898,78.233,41.71)))*43758.5453);
   float cut=evolutionHeight*.86+grain*.12;
   if(cut>evoReveal*1.03)discard;
   float edge=(1.-smoothstep(.0,.035,abs(cut-evoReveal*1.03)))*(1.-step(.999,evoReveal));
   float scan=pow(.5+.5*sin(evolutionHeight*220.-evoTime*3.),10.);
   vec3 nn=normalize(vEvolutionNormal);float shade=dot(nn,normalize(vec3(-.3,.7,1.)))*.5+.5;
   vec3 gold=mix(vec3(.055,.009,.001),vec3(.87,.49,.034),pow(shade,3.2));
   gold+=vec3(.9,.85,.47)*pow(shade,28.)+vec3(.42,.19,.012)*pow(1.-abs(nn.z),5.);
   vec3 glow=mix(mix(evoColor,vec3(1.5,1.45,1.25),.88),gold,evoGold);
   float localGlow=evoGlow;
   if(evoGold>.5&&evoArmor>=0.){float armorCut=(1.-evolutionHeight)*.78+grain*.11;localGlow=1.-smoothstep(armorCut,armorCut+.065,evoArmor);}
   outgoingLight=mix(outgoingLight,outgoingLight*.012+glow,localGlow);
   outgoingLight+=evoColor*(edge*2.+evoGlow*scan*mix(.15,.025,evoGold));
   diffuseColor.a*=evoOpacity;
   #include <opaque_fragment>
  `);
 };
 material.customProgramCacheKey=()=> 'cinema-actor-v2';c.body.material=material;
 // Undo the known two subdivision index levels for a light, readable CG cage.
 // We share vertex/skin buffers; the accepted high-detail mesh is untouched.
 const wireGeometry=new T.BufferGeometry();for(const [name,a] of Object.entries(c.body.geometry.attributes))wireGeometry.setAttribute(name,a);
 const fineIndex=c.body.geometry.index.array,coarse=[];for(let i=0;i+32<fineIndex.length;i+=48)coarse.push(fineIndex[i],fineIndex[i+16],fineIndex[i+32]);wireGeometry.setIndex(coarse);
 const wire=new T.SkinnedMesh(wireGeometry,new T.MeshBasicMaterial({color:0x99f8ff,wireframe:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));wire.bind(c.skeleton,new T.Matrix4());wire.frustumCulled=false;wire.visible=false;c.rig.add(wire);
 let height=nativeHeight,scale=1,offset=new T.Vector3(),points=null,kind='normal';
 function configure(h,color,mode='normal'){kind=mode;height=h;scale=h/nativeHeight;offset.set(-center.x*scale,-nativeBox.min.y*scale,-center.z*scale);c.rig.scale.setScalar(scale);c.rig.position.copy(offset);c.rig.rotation.set(0,0,0);uniforms.evoColor.value.set(color);c.rig.updateMatrixWorld(true);}
 function rootTransform(spin,lift=0){const co=Math.cos(spin),si=Math.sin(spin);c.rig.rotation.set(0,spin,0);c.rig.scale.setScalar(scale);c.rig.position.set(offset.x*co+offset.z*si,offset.y+lift,-offset.x*si+offset.z*co);c.rig.updateMatrixWorld(true);}
 function pose(t,p,role,spin){
  // Set the root before evaluating IK. Seeking must not inherit a previous
  // frame's world transform, including when this actor was hidden in between.
  const lift=role==='source'?smooth(.23,.35,p)*.32:.48*(1-smooth(.77,.835,p));
  rootTransform(spin,lift);c.body.visible=true;wire.visible=false;uniforms.evoGold.value=kind==='warp'?1:0;uniforms.evoArmor.value=-1;
  if(role==='source'){
   const roar=pulse(p,.16,.21,.29,.35);
   c.poseAt(0,'idle',0);const rest=c.capturePose();
   if(roar>.001){c.poseAt(Math.max(0,p-.16)*13,'roar');c.blendFrom(rest,roar);}
   uniforms.evoGlow.value=smooth(.27,.355,p);
   uniforms.evoReveal.value=1;
   uniforms.evoOpacity.value=1;
   c.rig.visible=(kind==='growth'||p>=.18)&&p<.445;
   if(kind==='super'&&p>.30){wire.visible=true;wire.material.opacity=pulse(p,.30,.345,.421,.445)*.44;c.body.visible=p<.363;}
  }else{
   c.poseAt(0,'idle',0);const rest=c.capturePose();
   if(p>.803){
    c.poseAt(1.2,'entrance',0);c.blendFrom(rest,pulse(p,.803,.835,.847,.883));
    if(p>.855){const landed=c.capturePose();c.poseAt((p-.85)/.15*c.duration.roar,'roar');c.blendFrom(landed,pulse(p,.855,.89,.96,1));}
   }
   uniforms.evoGlow.value=1-smooth(.61,.75,p);
   uniforms.evoReveal.value=smooth(.49,.665,p);
   uniforms.evoOpacity.value=1;
   c.rig.visible=p>=.475;
   if(kind==='super'&&p<.715){wire.visible=true;wire.material.opacity=pulse(p,.475,.51,.65,.715)*.44;c.body.visible=p>.585;}
   if(kind==='warp'){
    uniforms.evoReveal.value=1;uniforms.evoGlow.value=1-smooth(.62,.765,p);uniforms.evoArmor.value=p>=.62?smooth(.62,.765,p):-1;
    const stretch=pulse(p,.56,.60,.635,.68);c.rig.scale.set(scale*(1-stretch*.08),scale*(1+stretch*.20),scale*(1-stretch*.08));
   }
  }
  material.depthWrite=uniforms.evoOpacity.value>.99;
  uniforms.evoTime.value=t;material.map=baseMaterial.map;c.rig.updateMatrixWorld(true);
 }
 function hologram(t,spin){rootTransform(spin,.36);c.poseAt(0,'idle',0);c.rig.visible=c.body.visible=true;wire.visible=false;uniforms.evoGlow.value=uniforms.evoGold.value=uniforms.evoReveal.value=uniforms.evoOpacity.value=1;uniforms.evoArmor.value=-1;uniforms.evoTime.value=t;material.map=baseMaterial.map;material.depthWrite=true;c.rig.updateMatrixWorld(true);}
 function special(t,spin=0){
  rootTransform(spin,0);c.rig.visible=c.body.visible=true;wire.visible=false;uniforms.evoGlow.value=uniforms.evoGold.value=0;uniforms.evoReveal.value=uniforms.evoOpacity.value=1;material.depthWrite=true;
  c.poseAt(0,'idle',0);const rest=c.capturePose();c.poseAt(Math.max(0,t),'special');if(t<.36)c.blendFrom(rest,smooth(0,.36,t));material.map=baseMaterial.map;c.rig.updateMatrixWorld(true);
 }
 function idle(t,spin=0){rootTransform(spin,0);c.rig.visible=c.body.visible=true;wire.visible=false;uniforms.evoGlow.value=uniforms.evoGold.value=0;uniforms.evoReveal.value=uniforms.evoOpacity.value=1;material.depthWrite=true;c.poseAt(t,'idle');material.map=baseMaterial.map;c.rig.updateMatrixWorld(true);}
 function surface(){
  if(points)return points;
  const oldScale=c.rig.scale.clone(),oldPosition=c.rig.position.clone(),oldQuaternion=c.rig.quaternion.clone();
  c.rig.scale.setScalar(1);c.rig.position.set(0,0,0);c.rig.quaternion.identity();c.poseAt(0,'idle',0);c.rig.updateMatrixWorld(true);
  const g=c.body.geometry,p=g.attributes.position,index=g.index,vertices=new Float32Array(p.count*3),v=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.body.applyBoneTransform(i,v);v.applyMatrix4(c.body.matrixWorld);vertices.set([v.x-center.x,v.y-nativeBox.min.y,v.z-center.z],i*3);}
  const triCount=(index?index.count:p.count)/3,cdf=new Float64Array(triCount),a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3();let area=0;
  const idx=k=>index?index.getX(k):k;
  for(let i=0;i<triCount;i++){a.fromArray(vertices,idx(i*3)*3);b.fromArray(vertices,idx(i*3+1)*3).sub(a);d.fromArray(vertices,idx(i*3+2)*3).sub(a);area+=b.cross(d).length()*.5;cdf[i]=area;}
  const samples=[];
  for(let i=0;i<10500;i++){
   const value=random(i*5+1)*area;let lo=0,hi=triCount-1;while(lo<hi){const mid=(lo+hi)>>>1;if(cdf[mid]<value)lo=mid+1;else hi=mid;}
   const u=Math.sqrt(random(i*5+2)),v=random(i*5+3);a.fromArray(vertices,idx(lo*3)*3).multiplyScalar(1-u);b.fromArray(vertices,idx(lo*3+1)*3).multiplyScalar(u*(1-v));d.fromArray(vertices,idx(lo*3+2)*3).multiplyScalar(u*v);a.add(b).add(d).divideScalar(nativeHeight);
   samples.push({p:a.clone(),key:Math.floor(a.y*45)*100+(Math.atan2(a.z,a.x)+Math.PI)*12+random(i+8)*.1});
  }
  samples.sort((a,b)=>a.key-b.key);points=new Float32Array(samples.length*3);samples.forEach((s,i)=>s.p.toArray(points,i*3));
  c.rig.scale.copy(oldScale);c.rig.position.copy(oldPosition);c.rig.quaternion.copy(oldQuaternion);c.rig.updateMatrixWorld(true);return points;
 }
 return {id,c,wire,uniforms,configure,pose,hologram,special,idle,surface,get height(){return height;},get dimensions(){return nativeBox.getSize(new T.Vector3()).multiplyScalar(scale);},get nativeHeight(){return nativeHeight;},get scale(){return scale;}};
}

export function createMorphCloud(){
 const g=new T.BufferGeometry(),count=10500,from=new Float32Array(count*3),target=new Float32Array(count*3),seeds=new Float32Array(count*2);
 for(let i=0;i<count;i++)seeds.set([random(i+822),random(i+5131)],i*2);
 g.setAttribute('position',new T.BufferAttribute(from,3));g.setAttribute('aTarget',new T.BufferAttribute(target,3));g.setAttribute('aSeed',new T.BufferAttribute(seeds,2));
 const uniforms={phase:{value:0},opacity:{value:0},time:{value:0},size:{value:1},spread:{value:1},color:{value:new T.Color(0xffc879)}};
 const m=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute vec3 aTarget;attribute vec2 aSeed;uniform float phase,opacity,time,size,spread;varying float vAlpha,vSeed;
  void main(){float u=smoothstep(0.,1.,phase);vec3 p=mix(position,aTarget,u);float scatter=pow(sin(u*3.14159265),1.6);float a=aSeed.x*6.283185+u*9.;
   p+=vec3(cos(a),sin(a*1.7)*.65,sin(a))*scatter*(.12+aSeed.y*.75)*spread;
   p.y+=scatter*sin(aSeed.x*23.+u*7.)*.26;
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*(.75+aSeed.y*.8)*190./max(1.,-mv.z),1.,6.);
   vAlpha=opacity*(.35+aSeed.y*.65);vSeed=aSeed.x;}`,
  fragmentShader:`uniform vec3 color;varying float vAlpha,vSeed;void main(){vec2 q=gl_PointCoord*2.-1.;float a=exp(-dot(q,q)*3.8);if(length(q)>.98)discard;gl_FragColor=vec4(mix(color,vec3(1.25,1.16,.94),vSeed*.7),a*vAlpha);}`
 });
 const mesh=new T.Points(g,m);mesh.frustumCulled=false;mesh.name='Evolution_Silhouette_Particles';mesh.renderOrder=4;
 function configure(a,b,config){const f=a.surface(),t=b.surface();for(let i=0;i<from.length;i++){from[i]=f[i]*config.fromHeight;target[i]=t[i]*config.toHeight;}g.attributes.position.needsUpdate=g.attributes.aTarget.needsUpdate=true;uniforms.color.value.set(config.color);uniforms.spread.value=config.kind==='warp'?1.15:.72;}
 function update(p,t,spin,enabled=true){uniforms.phase.value=smooth(.395,.61,p);uniforms.opacity.value=enabled?pulse(p,.38,.43,.53,.62)*.30:0;uniforms.time.value=t;mesh.rotation.y=spin;mesh.position.y=T.MathUtils.lerp(.32,.48,uniforms.phase.value);mesh.visible=uniforms.opacity.value>.001;}
 return {mesh,uniforms,configure,update};
}
