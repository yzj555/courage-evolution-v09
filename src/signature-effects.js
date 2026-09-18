import * as T from 'three';
import {SIGNATURES} from './signature-config.js';
import {plasmaMaterial,flameTail,particleBatch,streakBatch,shockMaterial} from './skill-vfx-primitives.js';
const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
const clamp=x=>T.MathUtils.clamp(x,0,1);
const seed=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);

function bubbleMaterial(){return new T.ShaderMaterial({
 transparent:true,depthWrite:false,uniforms:{opacity:{value:.8},color:{value:new T.Color(0xcbdff2)}},
 vertexShader:`varying vec3 n;varying vec3 eye;varying vec3 p;void main(){p=position;n=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(position,1.);eye=normalize(-v.xyz);gl_Position=projectionMatrix*v;}`,
 fragmentShader:`varying vec3 n;varying vec3 eye;varying vec3 p;uniform float opacity;uniform vec3 color;
 void main(){float f=pow(1.-abs(dot(normalize(n),normalize(eye))),2.4);float shine=pow(max(0.,dot(normalize(n),normalize(vec3(-.4,.6,1.)))),35.);vec3 rainbow=.65+.25*cos(vec3(0.,2.,4.)+p.y*5.+p.x*3.);vec3 c=mix(color,rainbow,.4);c=mix(c,vec3(1.),shine*.9+f*.23);gl_FragColor=vec4(c,(.045+.68*f+.8*shine)*opacity);}`
});}

export function createSignatureEffects(scene){
 const group=new T.Group();group.name='Signature_moves';group.visible=false;scene.add(group);
 const spheres=[],bubbles=[],rings=[],shocks=[],missiles=[],ports=[],tail=flameTail();group.add(tail);
 const sphere=new T.SphereGeometry(1,48,32),bubbleGeo=new T.SphereGeometry(1,24,16),ringGeo=new T.TorusGeometry(1,.013,6,64),shockGeo=new T.RingGeometry(.38,1.04,96);
 const glow=particleBatch(480,'glow'),smoke=particleBatch(240,'smoke'),flames=particleBatch(160,'flame'),embers=particleBatch(200,'ember'),streaks=streakBatch(520),batches=[smoke,flames,glow,embers,streaks];
 for(const [i,b] of batches.entries()){b.mesh.renderOrder=i+1;b.end();group.add(b.mesh);}
 for(let i=0;i<4;i++){const mesh=new T.Mesh(sphere,plasmaMaterial());group.add(mesh);spheres.push(mesh);}
 for(let i=0;i<30;i++){const mesh=new T.Mesh(bubbleGeo,bubbleMaterial());group.add(mesh);bubbles.push(mesh);}
 for(let i=0;i<18;i++){const ring=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xf9c660,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));group.add(ring);rings.push(ring);}
 for(let i=0;i<10;i++){const mesh=new T.Mesh(shockGeo,shockMaterial());group.add(mesh);shocks.push(mesh);}
 for(let i=0;i<2;i++){
  const missile=new T.Group(),metal=new T.MeshStandardMaterial({color:0xd6dce1,metalness:.68,roughness:.30}),dark=new T.MeshStandardMaterial({color:0x555264,metalness:.45,roughness:.38});
  const shell=new T.Mesh(new T.CylinderGeometry(.25,.28,1.22,24),metal);shell.rotation.x=Math.PI/2;missile.add(shell);
  const nose=new T.Mesh(new T.ConeGeometry(.25,.72,24),metal);nose.rotation.x=Math.PI/2;nose.position.z=.95;missile.add(nose);
  const belt=new T.Mesh(new T.CylinderGeometry(.29,.29,.15,24),dark);belt.rotation.x=Math.PI/2;belt.position.z=-.36;missile.add(belt);
  for(const [radius,length,color] of [[.29,1.7,0xff941b],[.15,1.10,0xfff2bb]]){const exhaust=new T.Mesh(new T.ConeGeometry(radius,length,16),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));exhaust.rotation.x=-Math.PI/2;exhaust.position.z=-.60-length*.5;missile.add(exhaust);}
  for(let j=0;j<4;j++){const fin=new T.Mesh(new T.BoxGeometry(.11,.50,.46),dark);fin.rotation.z=j*Math.PI/2;fin.position.set(Math.sin(j*Math.PI/2)*.34,Math.cos(j*Math.PI/2)*.34,-.50);missile.add(fin);}
  group.add(missile);missiles.push(missile);
  const port=new T.Group(),hole=new T.Mesh(new T.CircleGeometry(.54,40),new T.MeshBasicMaterial({color:0x20212c})),rim=new T.Mesh(new T.TorusGeometry(.55,.08,8,40),metal);port.add(hole,rim);group.add(port);ports.push(port);
 }
 const light=new T.PointLight(0xffb855,0,5,2);scene.add(light);
 const anchors=new WeakMap(),launchCache=new WeakMap();let state={visible:false,active:0,phase:null,kind:null,origin:[0,0,0]};
 const all=[...spheres,tail,...bubbles,...rings,...shocks,...missiles,...ports];all.forEach(o=>{o.frustumCulled=false;});
 function anchor(c){
  if(anchors.has(c))return anchors.get(c);
  const r=c.cfg,head=c.bones[r.head],jaw=c.bones[r.jaw],g=c.body.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
  let mouth,lower,upper;
  if(jaw){
   const index=c.joints.indexOf(jaw),candidates=[];let front=-Infinity;
   for(let i=0;i<p.count;i++){let w=0;for(let j=0;j<4;j++)if(si.array[i*4+j]===index)w+=sw.array[i*4+j];if(w>.55){candidates.push(i);front=Math.max(front,p.getZ(i));}}
   mouth=vec();let count=0;for(const i of candidates)if(p.getZ(i)>front-.55){mouth.add(vec().fromBufferAttribute(p,i));count++;}
   if(count)mouth.divideScalar(count);else mouth.copy(c.spec[r.jaw]).add(vec(0,0,2));mouth.x=0;mouth.y+=.15;if(Number.isFinite(front))mouth.z=front+.13;
   lower=mouth.clone().sub(c.spec[r.jaw]);upper=mouth.clone().sub(c.spec[r.head]);
  }else{let front=-Infinity;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.35&&Math.abs(p.getY(i)-6.4)<.45)front=Math.max(front,p.getZ(i));mouth=vec(0,6.4,Number.isFinite(front)?front+.30:11.3);upper=mouth.clone().sub(c.spec[r.head]);}
  const data={head,jaw,lower,upper};
  if(c.id==='metalgreymon'){
   const center=c.spec[r.chest],y=center.y-.4,points=[];
   for(const side of [1,-1]){let front=-Infinity;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-side*1.02)<.4&&Math.abs(p.getY(i)-y)<.4)front=Math.max(front,p.getZ(i));points.push(vec(side*1.02,y,Number.isFinite(front)?front+.12:center.z+2.5).sub(center));}
   data.chest=c.bones[r.chest];data.ports=points;
  }
  anchors.set(c,data);return data;
 }
 function toLocal(c,p){return c.rig.worldToLocal(p);}
 function mouthPoint(c){const a=anchor(c),p=a.upper.clone().applyMatrix4(a.head.matrixWorld);if(a.jaw)p.lerp(a.lower.clone().applyMatrix4(a.jaw.matrixWorld),.5);return toLocal(c,p);}
 function chestPoints(c){const a=anchor(c);return a.ports.map(p=>toLocal(c,p.clone().applyMatrix4(a.chest.matrixWorld)));}
 function gaiaPoint(c){return vec(0,25.2,1.5);}
 function launchPoints(c,s){
  if(launchCache.has(c))return launchCache.get(c);
  // Freeze the emitter at the release pose, so projectiles do not follow recoil.
  const saved=c.capturePose(),savedMap=c.body.material.map;c.setBlink(false);const wasBlinking=c.body.material.map!==savedMap;
  c.poseAt(s.release,'special');c.rig.updateMatrixWorld(true);
  const points=s.kind==='missiles'?chestPoints(c):[s.kind==='gaia'?gaiaPoint(c):mouthPoint(c)];
  c.blendFrom(saved,0);c.setBlink(wasBlinking);launchCache.set(c,points);return points;
 }
 let ri=0,si=0,wi=0;
 function spark(p,size,color,opacity){glow.add(p,size,size,color,clamp(opacity));}
 function puff(p,size,color,opacity,rotation=0,random=0){smoke.add(p,size,size,color,clamp(opacity),rotation,random);}
 function wave(p,radius,opacity,color=0xffcb78,tilt=0){if(ri>=rings.length)return;const o=rings[ri++];o.visible=true;o.position.copy(p);o.scale.setScalar(radius);o.rotation.set(tilt,0,0);o.material.color.set(color);o.material.opacity=clamp(opacity);}
 function shock(p,radius,opacity,color,phase,tilt=0){if(wi>=shocks.length||opacity<=.003)return;const o=shocks[wi++];o.visible=true;o.position.copy(p);o.scale.setScalar(radius);o.rotation.set(tilt,0,0);o.material.uniforms.opacity.value=clamp(opacity);o.material.uniforms.color.value.set(color);o.material.uniforms.phase.value=phase;}
 function energy(p,radius,t,opacity=1,fire=false){if(si>=spheres.length)return;const o=spheres[si++];o.visible=true;o.position.copy(p);o.scale.setScalar(radius);o.rotation.set(0,0,0);o.material.depthWrite=opacity>.85;o.material.uniforms.time.value=t;o.material.uniforms.fire.value=fire?1:0;o.material.uniforms.opacity.value=opacity;return o;}
 function direction(i){const a=seed(i+31)*Math.PI*2,z=seed(i+88)*2-1,r=Math.sqrt(1-z*z);return vec(Math.cos(a)*r,Math.sin(a)*r,z);}
 const flight=u=>u*(.38+.62*u);
 // Every emitter is derived from the action clock, including its earlier trail
 // samples. Seeking, pausing and replaying therefore recreate the same frame.
 function impact(p,age,size,color,kind='fire'){
  const gaia=kind==='gaia',life=gaia?1.80:1.55;if(age<=0||age>life)return;const u=age/life,fade=1-smooth(.20,1,u),burst=1-Math.exp(-age*8);
  spark(p,size*(2.2+burst*2),0xffa13b,(1-smooth(.08,.58,u))*.70);
  if(age<.23)energy(p,size*(.52+burst*.7),age*2,(1-smooth(.08,.23,age))*.96,true);
  shock(p,size*(.9+burst*2.5),.96*(1-smooth(.08,.54,u)),0xffb357,age*7);
  if(age>.08)shock(p,size*(.5+(1-Math.exp(-(age-.08)*5))*2.7),.58*(1-smooth(.10,.58,u)),0xffe0a1,age*6+.8,.28);
  for(let i=0;i<34;i++){
   const d=direction(i),speed=1.2+seed(i+7)*1.9,center=p.clone().addScaledVector(d,size*burst*speed*(gaia?.62:.42));center.y+=size*u*.35;
   const radius=size*(.38+seed(i+5)*.5)*(.60+u*1.8),hot=1-smooth(.06+seed(i)*.1,.45+seed(i)*.15,u);
   if(hot>.01){if(gaia)spark(center,radius*2.6,0xffbd46,hot*.46);else flames.add(center,radius*2.5,radius*2.5,i%3?0xffa52e:0xffc43c,hot*.63,i,seed(i+4)*6+age);spark(center,radius*.75,0xffd574,hot*.38);}
   puff(center,radius*(1.9+u),gaia?(i%2?0xd4b787:0xe5cf9d):(i%2?0x9e8f7e:0xb9a993),smooth(.08,.28,u)*fade*(gaia?.19:.29),i+age*.13,seed(i+4)*6+age*.7);
  }
  for(let i=0;i<52;i++){
   const d=direction(i+52),speed=size*(2.3+seed(i)*2.7),v=p.clone().addScaledVector(d,speed*(1-Math.exp(-age*2.2)));v.y-=size*age*age*.22;
   const tail=v.clone().addScaledVector(d,-size*(.10+(gaia?.9:.55)*(1-u))),alpha=fade*(.4+.6*seed(i+9));
   streaks.add(v,tail,size*(gaia?.044:.031),color,alpha);embers.add(v,size*.10,size*.10,i%2?0xff9a28:0xffd46b,alpha);
  }
 }
 function update(c,action,time,enabled=true){
  group.visible=!!(enabled&&c&&action==='special');light.intensity=0;all.forEach(o=>o.visible=false);ri=si=wi=0;batches.forEach(b=>{b.begin();b.end();});
  if(!group.visible){state={...state,visible:false,active:0,phase:null,particles:0,streaks:0,projectiles:0};return;}
  const s=SIGNATURES[c.id];if(!s){group.visible=false;state={visible:false,active:0,phase:null};return;}
  group.position.copy(c.rig.position);group.quaternion.copy(c.rig.quaternion);group.scale.copy(c.rig.scale);c.rig.updateMatrixWorld(true);
  const origin=s.kind==='gaia'?gaiaPoint(c):s.kind==='missiles'?chestPoints(c)[0]:mouthPoint(c),launch=launchPoints(c,s),timeAfter=time-s.release;
  const power=smooth(.15,s.release-.12,time)*(1-smooth(s.end-.2,s.end+.45,time));
  if(s.kind==='bubbles'){
   bubbles.forEach((o,i)=>{
    const age=timeAfter-i*.048,life=1.10+seed(i+3)*.48;if(age<0||age>life+.24)return;
    const u=clamp(age/life),a=i*2.399,spread=(.08+u)*2.9,r=(c.id==='koromon'?.30:.24)+Math.pow(seed(i),1.8)*.69;
    const p=launch[0].clone().add(vec(Math.sin(a)*spread,(.45+Math.cos(a)*1.2)*u+2.4*u*u,.25+9.6*u));
    if(age<life){o.visible=true;o.position.copy(p);o.scale.set(r*(1+.13*Math.sin(time*8+i)),r*(1-.08*Math.sin(time*8+i)),r);o.material.uniforms.opacity.value=.98*(1-smooth(.93,1,u));o.material.uniforms.color.value.set(s.color);}
    else{const pop=(age-life)/.24;wave(p,r*(1+pop*.85),.60*(1-pop),s.color);for(let j=0;j<5;j++){const d=direction(i*5+j);const q=p.clone().addScaledVector(d,r*(.7+pop*1.5));embers.add(q,.09,.09,s.color,(1-pop)*.8);}}
   });
   if(timeAfter>-.2&&timeAfter<1.35)spark(origin,.64,s.color,.16*power);
  }else if(s.kind==='fire'){
   const big=c.id==='greymon',base=big?1.6:.88,travel=big?1.03:.90,distance=big?17:14.0,u=clamp(timeAfter/travel),f=flight(u);
   const center=launch[0].clone().add(vec(0,.35*f,distance*f)),radius=base*(.76+.24*smooth(0,.18,timeAfter));
   if(timeAfter<0&&timeAfter>-.65){const charge=smooth(-.65,0,timeAfter);spark(origin,base*(1+charge*1.7),0xff8d28,charge*.72);spark(origin,base*.85,0xfff1b0,charge*.9);for(let i=0;i<12;i++){const a=i*2.399+time*2,d=(1-(time*1.5+seed(i))%1)*base*1.5;embers.add(origin.clone().add(vec(Math.cos(a)*d,Math.sin(a)*d,.2)),base*.10,base*.10,0xffa338,charge*.8);}}
   if(timeAfter>=0&&timeAfter<.32){const v=timeAfter/.32;shock(origin.clone().add(vec(0,0,.7+v*1.5)),base*(.7+v*2),.7*(1-v),0xffc873,time*9);spark(origin,base*(1.5+v*3),0xffad3e,.65*(1-v));}
   if(timeAfter>=0&&timeAfter<travel){
    const core=energy(center,radius,time,1,true);core.scale.z*=1.16;spark(center,radius*4.1,0xff8a21,.48);
    const length=Math.min(distance*f+radius*.4,base*6.4);
    tail.visible=true;tail.position.copy(center).add(vec(0,0,-radius*.35));tail.scale.set(base,base,Math.max(.04,length));tail.material.uniforms.time.value=time;tail.material.uniforms.opacity.value=1;
    for(let i=0;i<54;i++){const lag=seed(i+6),a=i*2.399+time*.6,w=base*(.12+lag*.72),p=center.clone().add(vec(Math.cos(a)*w,Math.sin(a)*w,-length*lag));flames.add(p,base*(.45+.65*(1-lag)),base*(.55+.7*(1-lag)),i%3?0xffa429:0xf16922,(1-lag)*.60,a,seed(i)*7+time*2);}
    for(let i=0;i<30;i++){const q=(seed(i)+time*.7)%1,a=i*2.399,d=radius*(.7+q*.5),p=center.clone().add(vec(Math.cos(a)*d,Math.sin(a)*d,-length*q));streaks.add(p,p.clone().add(vec(0,0,-base*(.4+q))),base*.045,0xffb539,(1-q)*.9);}
   }
   // Spent flame keeps drifting and cooling after the projectile has passed.
   for(let i=0;i<24;i++){const emitted=(i/24)*travel,age=timeAfter-emitted;if(age<.08||age>.82||emitted>travel-.1)continue;const v=flight(emitted/travel),a=i*2.399,q=age/.82,p=launch[0].clone().add(vec(Math.cos(a)*base*.36,Math.sin(a)*base*.35+q*base*.65,distance*v));puff(p,base*(.5+q*1.5),0xa98867,(1-q)*.15,a,seed(i)*8+q);}
   impact(launch[0].clone().add(vec(0,.35,distance)),timeAfter-travel,base*1.35,s.color);
  }else if(s.kind==='missiles'){
   const portPoints=chestPoints(c),open=smooth(.55,1.45,time)*(1-smooth(2.75,3.5,time));
   ports.forEach((o,i)=>{o.visible=open>.001;o.position.copy(portPoints[i]);o.scale.setScalar(open);o.quaternion.copy(anchor(c).chest.getWorldQuaternion(new T.Quaternion())).premultiply(c.rig.getWorldQuaternion(new T.Quaternion()).invert());});
   for(let i=0;i<2;i++){
    const age=timeAfter-i*.12,travel=1.16,u=clamp(age/travel),side=i===0?1:-1;
    const path=q=>launch[i].clone().add(vec(side*2.3*Math.sin(Math.PI*q),.90*Math.sin(Math.PI*q),16*q)),p=path(flight(u));
    if(age>-.32&&age<0){const a=smooth(-.32,0,age);spark(portPoints[i],1.5,0xffb431,a*.7);spark(portPoints[i],.64,0xffeab1,a);}
    if(age>=0&&age<.3){const a=age/.3;spark(portPoints[i],2.4*(1+a),0xffc65c,.85*(1-a));shock(portPoints[i].clone().add(vec(0,0,.4+a)),.9+a*2,.6*(1-a),0xffc686,age*9);}
    if(age>=0&&age<travel){
     const o=missiles[i];o.visible=true;o.position.copy(p);o.scale.setScalar(1.65);const dir=vec(side*2.3*Math.PI*Math.cos(Math.PI*flight(u)),.9*Math.PI*Math.cos(Math.PI*flight(u)),16).normalize();o.quaternion.setFromUnitVectors(vec(0,0,1),dir);
     spark(p.clone().addScaledVector(dir,-1.6),2.0,0xffb733,.92);spark(p.clone().addScaledVector(dir,-2.6),1.7,0xff6926,.80);
     streaks.add(p.clone().addScaledVector(dir,-1),p.clone().addScaledVector(dir,-4.4),.7,0xffac38,.86);
    }
    for(let j=0;j<52;j++){
     const emitted=j/52*travel,lag=age-emitted;if(lag<0||lag>1.05)continue;
     const q=flight(emitted/travel),a=j*2.399,p0=path(q),dir=vec(side*2.3*Math.PI*Math.cos(Math.PI*q),.9*Math.PI*Math.cos(Math.PI*q),16).normalize();p0.addScaledVector(dir,-1.2).add(vec(Math.cos(a)*lag*.48,lag*.5+Math.sin(a)*lag*.32,0));
     const fade=1-smooth(.12,1.05,lag);puff(p0,.55+lag*1.65,j%2?0xb1afa6:0x817d78,fade*.52,a,seed(j+i*30)*8+lag*.5);
     if(lag<.20)spark(p0,.55+lag*1.8,0xff982c,(1-lag/.20)*.8);
    }
    impact(path(1),age-travel,1.50,s.color);
   }
  }else{
   const radius=4.10*smooth(.68,2.8,time),travel=1.02,u=clamp(timeAfter/travel),p=origin.clone(),target=vec(0,11,21);
   if(timeAfter>=0)p.lerp(target,flight(u));
   if(time>.68&&timeAfter<travel){
    energy(p,Math.max(.02,radius)*(1+.012*Math.sin(time*13)),time);spark(p,Math.max(.02,radius*3.5),0xffb42d,.37);
    // Short flowing filaments cling to the sphere instead of rigid orbital rings.
    for(let i=0;i<7;i++){
     const tilt=new T.Quaternion().setFromEuler(new T.Euler(i*.81,i*.53+time*.12,i*.47)),start=time*(i%2?-.80:1)+i*1.9;let previous=null;
     for(let j=0;j<=22;j++){const a=start+j/22*(.9+seed(i)*1.6),r=radius*(1.025+.015*Math.sin(a*7+time*8)),v=vec(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*2+time)*radius*.06).applyQuaternion(tilt).add(p);if(previous)streaks.add(v,previous,radius*.026,0xffda6c,Math.sin(Math.PI*j/23)*.82);previous=v;}
    }
    if(timeAfter<0){
     for(let i=0;i<24;i++){
      const cycle=(time*.72+seed(i))%1,a=i*2.399,alpha=Math.sin(Math.PI*cycle)*power*.9,at=q=>{const distance=radius+.25+(1-q)*(5.5+seed(i+8)*3);return vec(Math.cos(a+q*.55)*distance,Math.sin(a*.71)*distance*.72,Math.sin(a+q*.55)*distance*.65).add(origin);};
      const head=at(cycle);embers.add(head,.18+.13*cycle,.18+.13*cycle,0xffc247,alpha);
      for(let j=0;j<4;j++){const q=cycle-j*.022;if(q<0)continue;streaks.add(at(q),at(Math.max(0,q-.023)),.055,0xffd166,alpha*(1-j/5));}
     }
    }else{
     const axis=target.clone().sub(origin).normalize();
     for(let i=0;i<65;i++){const lag=seed(i),a=i*2.399,tail=Math.min(p.distanceTo(origin),lag*11),r=radius*(.3+.7*lag),v=p.clone().addScaledVector(axis,-tail).add(vec(Math.cos(a)*r,Math.sin(a)*r,0));spark(v,(1-lag)*1.9+.15,0xffbc32,.5*(1-lag));streaks.add(v,v.clone().addScaledVector(axis,-.6-lag*1.8),.09,0xffb331,.78*(1-lag));}
    }
   }
   impact(target,timeAfter-travel,3.2,s.color,'gaia');
   if(timeAfter>=0&&timeAfter<.55){const v=timeAfter/.55;shock(origin.clone().add(vec(0,0,v*1.3)),3.6+v*4,.72*(1-v),0xffdc8d,time*4);}
   const groundPower=power*(1-smooth(s.release,s.release+.7,time));
   if(groundPower>.001){shock(vec(0,.07,0),6.8+.3*Math.sin(time*4),.34*groundPower,0xdbaa49,time*3,-Math.PI/2);const cycle=(time*.8)%1;shock(vec(0,.09,0),5+cycle*4.5,.30*groundPower*Math.sin(Math.PI*cycle),0xe9b952,time*2,-Math.PI/2);}
  }
  batches.forEach(b=>b.end());
  group.updateMatrixWorld(true);light.position.copy(group.localToWorld(origin.clone()));light.color.set(s.color);light.intensity=c.style==='figurine'?power*3:0;
  const particles=glow.count+smoke.count+flames.count+embers.count,active=all.filter(o=>o.visible).length+particles+streaks.count;group.visible=active>0;
  state={visible:group.visible,active,phase:time<s.release?'charge':time<s.end?'release':'recover',kind:s.kind,origin:group.localToWorld(origin.clone()).toArray(),projectiles:missiles.filter(o=>o.visible).length,particles,streaks:streaks.count};
 }
 return {group,update,get state(){return state;}};
}
