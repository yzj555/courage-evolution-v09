import * as T from 'three';
import {SIGNATURES} from './signature-config.js';
import {poseWarrior} from './warrior-motion.js';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
export function installEvolutionMotion(c){
 const {bones:b,joints,rest,spec,rig,cfg:r,id}=c;
 const duration={idle:7,wave:4.2,roar:3.6,step:5,entrance:4.8,nod:2.6,special:SIGNATURES[id].duration};
 const stanceFeet=r.feet?.map((n,i)=>{
  const p=spec[n].clone();if(c.proportions){const side=i===0?1:-1;p.x+=side*(id==='metalgreymon'?.62:.72);p.z+=i===0?.48:-.32;}else if(id==='wargreymon'){p.x+=(i===0?1:-1)*.34;p.z+=i===0?.68:-.62;}return p;
 });
 const rot=(name,x=0,y=0,z=0)=>{if(name&&b[name])b[name].rotation.set(x,y,z);};
 const add=(name,x=0,y=0,z=0)=>{if(name&&b[name]){b[name].rotation.x+=x;b[name].rotation.y+=y;b[name].rotation.z+=z;}};
 const reset=()=>{joints.forEach((o,i)=>{o.position.copy(rest[i].position);o.quaternion.copy(rest[i].quaternion);o.scale.copy(rest[i].scale);});c.setBlink(false);};
 function leg(i,target,pitch=0){
  const hip=b[r.hips[i]],knee=b[r.knees[i]],foot=b[r.feet[i]];rig.updateMatrixWorld(true);
  const inv=rig.matrixWorld.clone().invert(),origin=hip.getWorldPosition(new T.Vector3()).applyMatrix4(inv),delta=target.clone().sub(origin),direction=delta.clone().normalize();
  const l1=knee.position.length(),l2=foot.position.length(),d=T.MathUtils.clamp(delta.length(),Math.abs(l1-l2)+.001,l1+l2-.004);
  const forward=new T.Vector3(c.proportions?(i===0?.36:-.36):0,0,1);forward.addScaledVector(direction,-forward.dot(direction)).normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along));
  const mid=origin.clone().addScaledVector(direction,along).addScaledVector(forward,bend),rigQ=rig.getWorldQuaternion(new T.Quaternion());
  const upper=new T.Quaternion().setFromUnitVectors(knee.position.clone().normalize(),mid.clone().sub(origin).normalize().applyQuaternion(rigQ));hip.quaternion.copy(hip.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(upper));
  rig.updateMatrixWorld(true);const lower=new T.Quaternion().setFromUnitVectors(foot.position.clone().normalize(),target.clone().sub(mid).normalize().applyQuaternion(rigQ));knee.quaternion.copy(hip.getWorldQuaternion(new T.Quaternion()).invert().multiply(lower));
  const footQ=new T.Quaternion().setFromEuler(new T.Euler(pitch,c.proportions?(i===0?.17:-.20):id==='wargreymon'?(i===0?.08:-.16):0,0,'YXZ'));
  rig.updateMatrixWorld(true);foot.quaternion.copy(knee.getWorldQuaternion(new T.Quaternion()).invert().multiply(rigQ.clone().multiply(footQ)));
 }
 function forelimb(i,breath){
  const shoulder=b[r.arms[i]],elbow=b[r.elbows[i]],hand=b[r.hands[i]],side=i===0?1:-1,mechanical=id==='metalgreymon'&&i===0;
  rig.updateMatrixWorld(true);const rigQ=rig.getWorldQuaternion(new T.Quaternion()),inv=rig.matrixWorld.clone().invert();
  const origin=shoulder.getWorldPosition(new T.Vector3()).applyMatrix4(inv),l1=elbow.position.length(),l2=hand.position.length(),length=l1+l2;
  const biological=id==='metalgreymon'&&i===1;
  const spread=mechanical?.62:biological?.60:i===0?.55:.58,drop=mechanical?.39:biological?.46:i===0?.26:.32,reach=mechanical?.58:biological?.35:i===0?.46:.42;
  const target=origin.clone().add(new T.Vector3(side*length*spread,-length*drop+.015*breath,length*reach));
  const pole=mechanical?new T.Vector3(side,-.10,-.65):new T.Vector3(side*.9,-.55,-.22);
  // Lower the complete mechanical arm together by another 4.6 degrees,
  // retaining its elbow bend, outward flare and the separate blade-tip curl.
  if(mechanical){const lower=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-.08);target.sub(origin).applyQuaternion(lower).add(origin);pole.applyQuaternion(lower);}
  const delta=target.clone().sub(origin),direction=delta.clone().normalize(),d=delta.length();
  pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along));
  const mid=origin.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
  const upper=new T.Quaternion().setFromUnitVectors(elbow.position.clone().normalize(),mid.clone().sub(origin).normalize().applyQuaternion(rigQ));
  shoulder.quaternion.copy(shoulder.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(upper));
  rig.updateMatrixWorld(true);const lower=new T.Quaternion().setFromUnitVectors(hand.position.clone().normalize(),target.clone().sub(mid).normalize().applyQuaternion(rigQ));
  elbow.quaternion.copy(shoulder.getWorldQuaternion(new T.Quaternion()).invert().multiply(lower));
  // Keep the original cuff-to-claw orientation. Rebuilding a separate global
  // wrist frame introduces a roll mismatch and separates the hard surfaces.
  if(mechanical){hand.quaternion.identity();return;}
  const finger=new T.Vector3(side*(biological?.57:.46),biological?-.25:i===0?-.13:-.23,.85).normalize().multiplyScalar(side);
  const back=new T.Vector3(0,1,0).addScaledVector(finger,-finger.y).normalize(),across=new T.Vector3().crossVectors(finger,back);
  const orientation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(finger,back,across));
  rig.updateMatrixWorld(true);hand.quaternion.copy(elbow.getWorldQuaternion(new T.Quaternion()).invert().multiply(rigQ.clone().multiply(orientation)));
 }
 function armRest(breath){
  if(c.proportions){forelimb(0,breath);forelimb(1,breath);}
  else if(id==='wargreymon'){
   rot(r.arms[0],-.10,.015,-.045);rot(r.arms[1],-.08,-.015,.035);
   rot(r.elbows[0],-.20,-.05,-.035);rot(r.elbows[1],-.16,.04,.03);rot(r.hands[0],.065);rot(r.hands[1],.05);
  }
 }
 function greet(e,t){
  if(r.baby){r.ears.forEach((n,i)=>add(n,.05*e*Math.sin(t*3-i),0,(i?1:-1)*.10*e+.07*e*Math.sin(t*4-i)));return;}
  if(id==='greymon'){
   add(r.arms[0],-.10*e,-.14*e,.22*e);add(r.elbows[0],.02*e,-.15*e,.08*e);
   add(r.hands[0],.08*e*Math.sin(t*3.2),.06*e,.05*e*Math.sin(t*3.2));
  }else if(id==='metalgreymon'){
   add(r.arms[0],-.14*e,-.15*e,.29*e);add(r.elbows[0],.02*e,-.18*e,.08*e);
  }else{
   add(r.arms[0],-.22*e,.08*e,.34*e);add(r.elbows[0],-.42*e,0,-.12*e);add(r.hands[0],.1*e*Math.sin(t*3));
  }
 }
 function groundBaby(hop){
  rig.updateMatrixWorld(true);c.skeleton.update();let floor=Infinity;const p=c.body.geometry.attributes.position,v=new T.Vector3();
  for(const i of c.groundVertices){v.fromBufferAttribute(p,i);c.body.applyBoneTransform(i,v);floor=Math.min(floor,v.y);}
  b[r.root].position.y+=c.groundY+hop-floor;
 }
 function poseAt(t,action='idle',manual=null){
  reset();const phase=t*2*Math.PI/7,breath=Math.sin(phase*2),sway=Math.sin(phase);let mouth=.025,hop=0;
  const feet=stanceFeet?.map(p=>p.clone()),pitch=[0,0];
  if(r.baby){
   const body=b[id==='koromon'?r.root:r.center];body.scale.set(1+.006*breath,1-.008*breath,1+.004*breath);
   add(r.head,.004*breath,.018*sway,.01*sway);
   r.ears.forEach((n,i)=>{
    add(n,.02*Math.sin(phase*2-i*.5),.012*Math.sin(phase-i),.025*Math.sin(phase*2-i*.7));
    add(n+'_follow0',.03*Math.sin(phase*2-i*.5-.45),0,.035*Math.sin(phase*2-.5-i));
    add(n+'_follow1',.04*Math.sin(phase*2-i*.5-.9),0,.045*Math.sin(phase*2-.9-i));
   });
  }else{
   if(c.proportions){
    const d=c.proportions;b[r.center].position.y-=d.crouch+.13;b[r.center].position.x+=id==='greymon'?-.10:.06;
    add(r.center,d.pelvisPitch);add(r.waist,d.waistPitch);add(r.chest,d.chestPitch);add(r.head,d.headPitch);
    // The tail counterbalances the inclined trunk; the feet are solved below.
    add(r.tail[0],-d.pelvisPitch);
   }
   b[r.center].position.y+=-.045+.018*breath;add(r.chest,.003*breath,.008*sway,0);add(r.head,-.006*breath,.022*sway,.004*sway);armRest(breath);
   r.tail?.forEach((n,i)=>{
    const rise=id==='metalgreymon'?[-.02,.07,.13,.16,.18,.18]:[-.04,.06,.15,.20,.22];
    const curve=id==='metalgreymon'?[.025,.07,.10,.08,-.07,-.10]:[-.04,-.10,-.13,-.09,.08];
    add(n,(c.proportions?rise[i]:0)+(c.proportions?.014:.006)*Math.sin(phase*2-i*.6),(c.proportions?curve[i]:0)+(c.proportions?.035:.025)*Math.sin(phase-i*.55),0);
   });
   r.wings?.forEach((n,i)=>add(n,-.26+.006*breath,(i%2?1:-1)*(.72+.016*Math.sin(phase-i*.12)),.005*breath));
  }
  if(action==='wave'&&id!=='wargreymon')greet(pulse(t,.12,.9,2.95,4.1),t);
  if(action==='nod'){const e=pulse(t,0,.3,1.9,2.5);add(r.head,.055*Math.sin(t*4.3)*e,-.025*e);}
  if(action==='roar'&&id!=='wargreymon'){
   const e=pulse(t,.25,1.0,2.0,3.4),inhale=pulse(t,0,.5,.8,1.15);mouth+=.26*e;
   if(r.baby){b[r.center].scale.multiply(new T.Vector3(1+.025*e,1-.025*inhale,1+.025*e));greet(.45*e,t);}
   else{
    b[r.center].position.y-=.08*inhale;add(r.head,-.055*e);add(r.chest,-.018*e);add(r.arms[0],-.06*e,0,.06*e);add(r.arms[1],-.06*e,0,-.06*e);
    if(c.proportions){b[r.center].position.y-=.10*inhale;add(r.head,-.025*e);add(r.tail[0],-.035*inhale,.025*e);}
    r.wings?.forEach((n,i)=>add(n,.02*e,(i%2?1:-1)*.30*e,0));
    r.shields?.forEach((n,i)=>add(n,0,(i?1:-1)*.40*e,0));
    if(id==='wargreymon'){add(r.arms[0],-.12*e,-.08*e,.12*e);add(r.arms[1],-.12*e,.08*e,-.12*e);add(r.elbows[0],-.28*e);add(r.elbows[1],-.28*e);}
   }
  }
  if(action==='step'&&id!=='wargreymon'){
   if(r.baby){
    let squash=0;for(let i=0;i<3;i++){const start=.35+i*1.24,u=T.MathUtils.clamp((t-start-.20)/.72,0,1);hop+=1.15*16*u*u*(1-u)*(1-u);squash+=pulse(t,start,start+.16,start+.20,start+.37)+pulse(t,start+.86,start+1.0,start+1.02,start+1.18);}
    b[r.center].scale.multiply(new T.Vector3(1+.035*squash,1-.045*squash,1+.025*squash));greet(.25,t);
   }else{
    let support=0,swing=0,load=0;for(let i=0;i<4;i++){
     const start=.30+i*.94,j=i%2,sign=j===0?1:-1,weight=pulse(t,start-.24,start+.03,start+.72,start+.98);support-=sign*weight;load+=weight;
     const u=T.MathUtils.clamp((t-start-.12)/.64,0,1),lift=16*u*u*(1-u)*(1-u);feet[j].y+=(id==='greymon'?.32:.38)*lift;feet[j].z+=.18*lift;pitch[j]+=.065*lift*(1-2*u);swing+=sign*lift;
    }
    b[r.center].position.x+=.075*support;b[r.center].position.y-=.014*load;
    add(r.chest,0,-.012*swing,.016*support);add(r.head,0,-.006*swing,-.016*support);add(r.arms[0],id==='wargreymon'?.04*swing:0,.045*swing);add(r.arms[1],id==='wargreymon'?-.04*swing:0,.045*swing);
   }
  }
  if(action==='entrance'&&id!=='wargreymon'){
   const flight=t>.36&&t<1.08?Math.sin((t-.36)/.72*Math.PI):0,landing=pulse(t,1.03,1.16,1.23,1.62),approach=-4*(1-smooth(.36,1.08,t));
   hop=(r.baby?1.7:id==='wargreymon'?.7:1.0)*flight;b[r.root].position.z+=approach;
   if(r.baby)b[r.center].scale.multiply(new T.Vector3(1+.055*landing,1-.08*landing,1+.045*landing));
   else{b[r.root].position.y+=hop;b[r.center].position.y-=.28*landing;feet.forEach(f=>{f.y+=hop;f.z+=approach;});}
   greet(.8*pulse(t,1.72,2.35,3.3,4.65),t);
  }
  if(action==='special'&&id!=='wargreymon'){
   const s=SIGNATURES[id],load=pulse(t,.08,s.release-.25,s.release-.1,s.release+.35),fire=pulse(t,s.release-.22,s.release+.08,s.end-.65,s.end),recoil=pulse(t,s.release,s.release+.17,s.release+.35,s.release+.82);
   if(r.baby){
    b[r.center].scale.multiply(new T.Vector3(1+.030*load-.010*fire,1-.025*load+.018*fire,1+.035*load));
    add(r.head,-.016*load+.024*recoil);mouth+=.31*fire;greet(.5*fire,t);
   }else{
    b[r.center].position.y-=.16*load+.055*recoil;add(r.chest,-.035*load+.045*recoil);add(r.head,.025*load-.035*fire+.018*recoil);
    mouth+=id==='greymon'?.33*fire:.16*fire;
    add(r.arms[0],-.035*load,0,.035*fire);add(r.arms[1],-.035*load,0,-.035*fire);
    r.tail?.forEach((n,i)=>add(n,.018*recoil*Math.cos(i*.5),.02*load));
    r.wings?.forEach((n,i)=>add(n,.02*fire,(i%2?1:-1)*.22*load));
   }
  }
  if(id==='wargreymon')poseWarrior(c,t,action,feet,pitch);
  if(manual!==null)mouth=manual*.32;
  if(r.jaw)add(r.jaw,id==='koromon'?-mouth*.65:mouth);
  if(r.baby)groundBaby(hop);else{leg(0,feet[0],pitch[0]);leg(1,feet[1],pitch[1]);}
  const blink=t%7;c.setBlink((blink>2.35&&blink<2.49)||(blink>5.8&&blink<5.94));rig.updateMatrixWorld(true);c.skeleton.update();
 }
 const capturePose=()=>joints.map(o=>({p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
 function blendFrom(p,amount){const t=smooth(0,1,amount);joints.forEach((b,i)=>{b.position.lerpVectors(p[i].p,b.position,t);b.quaternion.slerpQuaternions(p[i].q,b.quaternion,t);b.scale.lerpVectors(p[i].s,b.scale,t);});rig.updateMatrixWorld(true);c.skeleton.update();}
 function makeClips(){return Object.entries(duration).map(([action,length])=>{const times=[],samples=joints.map(()=>({p:[],q:[],s:[]}));for(let k=0;k<=Math.ceil(length*30);k++){const t=Math.min(length,k/30);times.push(t);poseAt(t,action);joints.forEach((b,i)=>{samples[i].p.push(...b.position.toArray());samples[i].q.push(...b.quaternion.toArray());samples[i].s.push(...b.scale.toArray());});}const tracks=[];joints.forEach((b,i)=>{tracks.push(new T.VectorKeyframeTrack(b.name+'.position',times,samples[i].p),new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,samples[i].q),new T.VectorKeyframeTrack(b.name+'.scale',times,samples[i].s));});return new T.AnimationClip(action[0].toUpperCase()+action.slice(1),length,tracks);});}
 Object.assign(c,{duration,stanceFeet,reset,poseAt,capturePose,blendFrom});c.clips=makeClips();poseAt(0,'idle');
}
