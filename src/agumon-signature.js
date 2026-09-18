import * as T from 'three';
import {SIGNATURES} from './signature-config.js';

// Extend the accepted Motion 4 character without changing its original six clips.
export function addAgumonSignature(c){
 c.id='agumon';c.cfg={root:'J_root',center:'J_center',chest:'J_spine02',head:'J_head',jaw:'J_joe',arms:['J_arm_l','J_arm_r'],elbows:['J_elbow_l','J_elbow_r'],hands:['J_hand_l','J_hand_r']};
 const basePose=c.poseAt,lerp=T.MathUtils.lerp,smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
 const duration=SIGNATURES.agumon.duration;
 c.duration={...c.duration,special:duration};
 c.poseAt=(t,action='idle',manual=null)=>{
  if(action!=='special')return basePose(t,action,manual);
  // Retiming the settled roar preserves the existing IK and contact with the floor.
  const k=t<1.4?lerp(0,1.2,smooth(0,1.4,t)):t<2.1?lerp(1.2,1.95,smooth(1.4,2.1,t)):lerp(1.95,3.4,smooth(2.1,duration,t));
  basePose(k,'roar',manual);
  const recoil=smooth(1.40,1.56,t)*(1-smooth(1.7,2.05,t));
  c.bones.J_spine02.rotation.x+=.025*recoil;c.bones.J_head.rotation.x+=.018*recoil;
  c.rig.updateMatrixWorld(true);c.skeleton.update();
 };
 const times=[],samples=c.joints.map(()=>({p:[],q:[],s:[]}));
 for(let k=0;k<=duration*30;k++){
  const t=k/30;times.push(t);c.poseAt(t,'special');
  c.joints.forEach((b,i)=>{samples[i].p.push(...b.position.toArray());samples[i].q.push(...b.quaternion.toArray());samples[i].s.push(...b.scale.toArray());});
 }
 const tracks=[];c.joints.forEach((b,i)=>tracks.push(new T.VectorKeyframeTrack(b.name+'.position',times,samples[i].p),new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,samples[i].q),new T.VectorKeyframeTrack(b.name+'.scale',times,samples[i].s)));
 c.clips=[...c.clips,new T.AnimationClip('Special',duration,tracks)];c.poseAt(0,'idle');return c;
}
