import * as T from 'three';
const smooth=(a,b,v)=>{const t=T.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
export function installMotion(c){
 const {rig,bones:b,joints,rest,spec}=c;const duration={idle:7,wave:4.2,roar:3.4,step:5,entrance:4.8,nod:2.6};
 const restArmZ={l:-1.02,r:1.08};
 function reset(){joints.forEach((o,i)=>{o.position.copy(rest[i].position);o.quaternion.copy(rest[i].quaternion);o.scale.copy(rest[i].scale)});c.setBlink(false);}
 function rot(name,x=0,y=0,z=0){b[name].rotation.set(x,y,z);}
 function leg(id,target,pitch=0){
  const hip=b['J_leg_'+id],knee=b['J_knee_'+id],foot=b['J_foot_'+id];
  rig.updateMatrixWorld(true);const inv=rig.matrixWorld.clone().invert(),hipPos=hip.getWorldPosition(new T.Vector3()).applyMatrix4(inv),delta=target.clone().sub(hipPos),d=delta.length();
  const l1=knee.position.length(),l2=foot.position.length(),dist=Math.min(d,l1+l2-.005),direction=delta.normalize(),forward=new T.Vector3(0,0,1).addScaledVector(direction,-direction.z).normalize();
  const along=(l1*l1-l2*l2+dist*dist)/(2*dist),bend=Math.sqrt(Math.max(0,l1*l1-along*along));const kneePos=hipPos.clone().addScaledVector(direction,along).addScaledVector(forward,bend);
  const parentQ=hip.parent.getWorldQuaternion(new T.Quaternion()),rigQ=rig.getWorldQuaternion(new T.Quaternion());
  const upperWorld=new T.Quaternion().setFromUnitVectors(knee.position.clone().normalize(),kneePos.clone().sub(hipPos).normalize().applyQuaternion(rigQ));hip.quaternion.copy(parentQ.invert().multiply(upperWorld));
  rig.updateMatrixWorld(true);const hipQ=hip.getWorldQuaternion(new T.Quaternion()),lowerWorld=new T.Quaternion().setFromUnitVectors(foot.position.clone().normalize(),target.clone().sub(kneePos).normalize().applyQuaternion(rigQ));knee.quaternion.copy(hipQ.invert().multiply(lowerWorld));
  rig.updateMatrixWorld(true);const footOrientation=rigQ.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),pitch));foot.quaternion.copy(knee.getWorldQuaternion(new T.Quaternion()).invert().multiply(footOrientation));
 }
 function greeting(amount,phase,sway=.13){
  const lerp=T.MathUtils.lerp;
  rot('J_arm_l',lerp(.08,-.18,amount),lerp(.16,.06,amount),lerp(restArmZ.l,.24,amount));
  // Share the turn with the forearm to avoid concentrating the full twist at the wrist.
  rot('J_elbow_l',lerp(-.08,.06,amount),lerp(-.86,-.08,amount),lerp(-.18,.52,amount));
  b.J_elbow_l.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.4*amount));
  rot('J_hand_l',.12,.09,-.13);
  if(amount<=0)return;
  rig.updateMatrixWorld(true);
  // In the source rig +X follows the fingers and -Y is the palm surface.
  // Keep the palm facing the character's front (+Z), independent of the orbit camera.
  const angle=1.07+sway*Math.sin(phase),fingers=new T.Vector3(Math.cos(angle),Math.sin(angle),0),palmBack=new T.Vector3(0,0,-1),across=new T.Vector3().crossVectors(fingers,palmBack);
  const target=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(fingers,palmBack,across));
  target.premultiply(rig.getWorldQuaternion(new T.Quaternion()));
  target.premultiply(b.J_hand_l.parent.getWorldQuaternion(new T.Quaternion()).invert());
  b.J_hand_l.quaternion.slerp(target.normalize(),amount);
 }
 function poseAt(t,action='idle',manual=null){
  reset();const phaseIdle=t*2*Math.PI/7,breath=Math.sin(phaseIdle*2),drift=Math.sin(phaseIdle);const feet={l:spec.J_foot_l.clone(),r:spec.J_foot_r.clone()},footPitch={l:0,r:0};
  b.J_center.position.y+=.024*breath;b.J_spine02.scale.set(1+.006*breath,1+.003*breath,1+.009*breath);
  rot('J_neck',.007*breath,.026*drift,.008*drift);rot('J_head',-.008*breath,.012*Math.sin(phaseIdle),.01*Math.sin(phaseIdle));
  // Relaxed rest: rounded elbows, forearms held a little forward, unequal wrist angles.
  // The elbow and wrist follow the breath with a slight delay instead of moving as rods.
  const follow=Math.sin(phaseIdle*2-.4),settle=Math.sin(phaseIdle*2-.7);
  rot('J_arm_l',.08,.16,restArmZ.l+.014*breath);rot('J_arm_r',-.04,-.12,restArmZ.r-.013*breath);
  rot('J_elbow_l',-.08,-.86+.025*follow,-.18);rot('J_elbow_r',-.10,.78-.022*follow,.16);
  rot('J_hand_l',.12+.012*settle,.09,-.13);rot('J_hand_r',.10-.010*settle,-.10,.10);
  rot('J_tail',.016*Math.sin(phaseIdle*2),.075*Math.sin(phaseIdle),.009*Math.sin(phaseIdle*2));let mouth=.018+.006*(breath+1);
  if(action==='wave'){
   const e=pulse(t,.15,.95,3.0,4.15);b.J_center.position.x+=.11*e;rot('J_spine02',-.02*e,0,-.025*e);rot('J_head',-.035*e,-.08*e,-.07*e);
   greeting(e,(t-.98)*Math.PI*2/1.08);mouth+=.045*e;
  }else if(action==='roar'){
   const inhale=pulse(t,.05,.6,.85,1.15),call=pulse(t,.8,1.18,1.98,2.65),recover=pulse(t,2.05,2.45,2.65,3.3);
   b.J_center.position.y-=.19*inhale+.06*call;rot('J_spine02',.035*inhale-.045*call,0,0);rot('J_head',.035*inhale-.11*call,.028*call,0);rot('J_neck',-.04*call,0,0);
   rot('J_arm_l',.08-.16*call,.16,restArmZ.l+.12*call);rot('J_arm_r',-.04-.04*call,-.12,restArmZ.r-.12*call);mouth=.008+.39*call+.035*recover;
  }else if(action==='step'){
   let support=0,swing=0,followSwing=0,load=0,landing=0;
   // The leg swing leads this small in-place step; only a little weight shift
   // reaches the pelvis. Counter-rotation through the back steadies the head.
   for(let i=0;i<4;i++){
    const start=.30+i*.94,id=i%2===0?'l':'r',side=id==='l'?1:-1;
    const weight=pulse(t,start-.24,start+.03,start+.72,start+.98);support-=side*weight;load+=weight;
    const u=T.MathUtils.clamp((t-start-.12)/.64,0,1),lift=16*u*u*(1-u)*(1-u);
    feet[id].y+=.48*lift;feet[id].z+=.24*lift*(1-.3*u);
    footPitch[id]+=.085*lift*(1-2*u);swing+=side*lift;
    const delayed=T.MathUtils.clamp((t-start-.19)/.64,0,1);followSwing+=side*16*delayed*delayed*(1-delayed)*(1-delayed);
    b['J_toe_'+id].rotation.x-=.018*lift;
    landing+=pulse(t,start+.68,start+.77,start+.81,start+.96);
   }
   b.J_center.position.x+=.10*support;b.J_center.position.y-=.012*breath+.022*load+.010*landing;
   rot('J_center',0,0,-.003*support);rot('J_spine01',0,.009*swing,.021*support);
   rot('J_spine02',0,-.016*swing,-.006*support);
   rot('J_neck',.003*breath,.004*swing,-.012*support);
   rot('J_head',.004*landing,.003*followSwing,.002*followSwing);
   rot('J_arm_l',.08,.16+.070*swing,restArmZ.l+.004*load);rot('J_arm_r',-.04,-.12+.070*swing,restArmZ.r-.004*load);
   b.J_elbow_l.rotation.y+=.035*followSwing;b.J_elbow_r.rotation.y+=.035*followSwing;
  }else if(action==='entrance'){
   const crouch=pulse(t,0,.24,.3,.57),flight=pulse(t,.35,.56,.90,1.10),landing=pulse(t,1.03,1.17,1.25,1.63),hop=t>.43&&t<1.09?Math.sin((t-.43)/.66*Math.PI)*1.0:0;
   b.J_root.position.y+=hop;b.J_center.position.y-=.40*crouch+.47*landing;rot('J_head',.05*crouch+.075*landing,0,0);rot('J_arm_l',.08-.14*flight,.16,restArmZ.l+.16*flight);rot('J_arm_r',-.04-.02*flight,-.12,restArmZ.r-.16*flight);for(const f of Object.values(feet))f.y+=hop;
   const approach=-3.8*(1-smooth(.43,1.09,t));b.J_root.position.z+=approach;for(const f of Object.values(feet))f.z+=approach;
   const greet=pulse(t,1.65,2.25,3.8,4.72);if(greet>0)greeting(greet,(t-2.25)*Math.PI*2/1.12,.11);rot('J_head',-.015,0,-.05*greet);mouth+=.04*greet;
  }else if(action==='nod'){
   const e=pulse(t,0,.3,1.9,2.55);rot('J_head',.085*Math.sin(t*5)*e,-.025*e,0);mouth+=.025*e;
  }
  b.J_joe.rotation.x=manual===null?mouth:manual*.42;
  const blinkPhase=t%7;c.setBlink((blinkPhase>2.35&&blinkPhase<2.49)||(blinkPhase>5.8&&blinkPhase<5.94));
  leg('l',feet.l,footPitch.l);leg('r',feet.r,footPitch.r);rig.updateMatrixWorld(true);c.skeleton.update();
 }
 function capturePose(){return joints.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));}
 function blendFrom(p,amount){const t=smooth(0,1,amount);joints.forEach((b,i)=>{b.position.lerpVectors(p[i].p,b.position,t);b.quaternion.slerpQuaternions(p[i].q,b.quaternion,t);b.scale.lerpVectors(p[i].s,b.scale,t)});rig.updateMatrixWorld(true);c.skeleton.update();}
 function makeClips(){return Object.entries(duration).map(([action,time])=>{const times=[],samples=joints.map(()=>({p:[],q:[],s:[]}));for(let k=0;k<=Math.ceil(time*30);k++){const t=Math.min(time,k/30);times.push(t);poseAt(t,action);joints.forEach((b,i)=>{samples[i].p.push(...b.position.toArray());samples[i].q.push(...b.quaternion.toArray());samples[i].s.push(...b.scale.toArray());});}const tracks=[];joints.forEach((b,i)=>{tracks.push(new T.VectorKeyframeTrack(b.name+'.position',times,samples[i].p),new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,samples[i].q),new T.VectorKeyframeTrack(b.name+'.scale',times,samples[i].s));});return new T.AnimationClip(action[0].toUpperCase()+action.slice(1),time,tracks);});}
 Object.assign(c,{duration,reset,poseAt,capturePose,blendFrom});c.clips=makeClips();poseAt(0,'idle');
}
