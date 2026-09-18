import * as T from 'three';
const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));

// Solve each arm in model space; the weapon follows the forearm as a rigid unit.
// Avoid concentrating a whole-arm turn at the wrist of the hard-surface gauntlet.
function arm(c,i,offset,pole,palmWeight=0){
 const r=c.cfg,b=c.bones,rig=c.rig,shoulder=b[r.arms[i]],elbow=b[r.elbows[i]],hand=b[r.hands[i]];
 rig.updateMatrixWorld(true);
 const rq=rig.getWorldQuaternion(new T.Quaternion()),inv=rig.matrixWorld.clone().invert();
 const origin=shoulder.getWorldPosition(new T.Vector3()).applyMatrix4(inv),direction=offset.clone().normalize();
 const l1=elbow.position.length(),l2=hand.position.length(),d=Math.min(offset.length(),l1+l2-.08);
 const target=origin.clone().addScaledVector(direction,d);
 pole.addScaledVector(direction,-pole.dot(direction)).normalize();
 const along=(l1*l1-l2*l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along));
 const mid=origin.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
 const upper=new T.Quaternion().setFromUnitVectors(elbow.position.clone().normalize(),mid.clone().sub(origin).normalize().applyQuaternion(rq));
 shoulder.quaternion.copy(shoulder.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(upper));
 rig.updateMatrixWorld(true);
 const restAxis=hand.position.clone().normalize(),axis=target.sub(mid).normalize().applyQuaternion(rq);
 const lower=new T.Quaternion().setFromUnitVectors(restAxis,axis);
 if(palmWeight>0){
  // Source palms point inward across the sloping rest forearms. Roll the
  // complete forearm and weapon together; the cuff-to-hand bind stays intact.
  const inward=new T.Vector3(i===0?-1:1,0,0);
  const palm=inward.clone().projectOnPlane(restAxis).normalize().applyQuaternion(lower);
  const facing=inward.clone().setY(.15).applyQuaternion(rq).projectOnPlane(axis).normalize();
  const angle=Math.atan2(axis.dot(palm.clone().cross(facing)),palm.dot(facing));
  lower.premultiply(new T.Quaternion().setFromAxisAngle(axis,angle*palmWeight));
 }
 elbow.quaternion.copy(shoulder.getWorldQuaternion(new T.Quaternion()).invert().multiply(lower));hand.quaternion.identity();
}

export function poseWarrior(c,t,action,feet,pitch){
 const b=c.bones,r=c.cfg,phase=t*Math.PI*2/7,breath=Math.sin(phase*2),shift=Math.sin(phase);
 const rot=(n,x=0,y=0,z=0)=>b[n]?.rotation.set(x,y,z);
 const add=(n,x=0,y=0,z=0)=>{if(b[n]){b[n].rotation.x+=x;b[n].rotation.y+=y;b[n].rotation.z+=z;}};
 b[r.center].position.y-=.55;b[r.center].position.x+=-.14+.030*shift;
 rot(r.center,.015,-.10,0);rot(r.waist,.025,.035,.006*shift);
 rot(r.chest,-.04+.009*breath,.17+.015*shift,-.009*shift);
 rot(r.neck,-.035,-.055,0);rot(r.head,.055,-.05+.04*shift,0);
 // Articulated breathing keeps the armor rigid and the IK hierarchy free of shear.
 b[r.chest].scale.setScalar(1);
 r.shields.forEach((n,i)=>rot(n,0,(i?1:-1)*(.11+.014*Math.sin(phase*2-.35)),0));
 // Delayed forearm settling gives the armor weight without floating the torso.
 const follow=Math.sin(phase*2-.45);
 const targets=[new T.Vector3(2.05,-2.40+.035*follow,3.25),new T.Vector3(-2.05,-4.30+.030*follow,1.80)];
 const poles=[new T.Vector3(.55,-.45,-.65),new T.Vector3(-.70,-.50,-.65)];let palmWeight=0;
 if(action==='nod'){const e=pulse(t,.12,.45,1.85,2.5);add(r.head,.065*Math.sin(t*4.3)*e,-.035*e);}
 if(action==='wave'){
  const wind=pulse(t,.12,.75,1.03,1.42),slash=pulse(t,1.02,1.32,1.60,2.28),recover=pulse(t,1.35,1.7,2.15,3.6);
  add(r.waist,0,-.11*wind+.10*slash);add(r.chest,.025*slash,-.22*wind+.24*slash);add(r.head,0,.12*wind-.12*slash);
  targets[0].lerp(new T.Vector3(2.4,-2.6,2.2),wind).lerp(new T.Vector3(.45,-1.5,4.6),slash);
  targets[1].lerp(new T.Vector3(-1.8,-2.2,3.5),.65*recover);b[r.center].position.y-=.10*wind+.07*slash;
 }
 if(action==='roar'){
  const prepare=pulse(t,.1,.8,1.9,3.3),settle=pulse(t,.15,.65,1.7,3.25);
  b[r.center].position.y-=.28*settle;add(r.chest,-.06*prepare,-.09*prepare);add(r.head,-.025*prepare,.08*prepare);
  targets[0].lerp(new T.Vector3(1.5,-1.85,3.6),prepare);targets[1].lerp(new T.Vector3(-1.6,-2.0,3.7),prepare);
  r.shields.forEach((n,i)=>add(n,0,(i?1:-1)*.42*prepare));
 }
 if(action==='step'){
  // Two measured ready-stance steps; each foot returns while the other supports.
  for(let i=0;i<2;i++){
   const start=.3+i*1.9,u=T.MathUtils.clamp((t-start-.2)/1.12,0,1),lift=16*u*u*(1-u)*(1-u),weight=pulse(t,start-.15,start+.15,start+1.25,start+1.62),side=i===0?1:-1;
   feet[i].y+=.38*lift;feet[i].z+=.38*lift;pitch[i]=.07*lift*(1-2*u);
   b[r.center].position.x-=side*.055*weight;b[r.center].position.y-=.035*weight;
   add(r.chest,0,side*.025*lift,side*.012*weight);add(r.head,0,-side*.025*lift,-side*.012*weight);
   targets[i].z+=.20*lift;
  }
 }
 if(action==='entrance'){
  const u=T.MathUtils.clamp((t-.24)/.84,0,1),hop=.95*Math.sin(Math.PI*u),approach=-2.5*(1-smooth(.24,1.08,t));
  const landing=pulse(t,1.04,1.19,1.36,1.95),ready=smooth(1.65,2.75,t),air=1-smooth(.80,1.10,t);
  b[r.root].position.z+=approach;b[r.root].position.y+=hop;
  b[r.center].position.y-=.64*landing;add(r.waist,.045*landing);add(r.chest,.08*landing);add(r.head,.08*landing-.025*ready);
  feet.forEach(f=>{f.y+=hop;f.z+=approach;});
  targets[0].lerp(new T.Vector3(2.1,-2.8,3.1),Math.max(air,landing*.8));targets[1].lerp(new T.Vector3(-2.1,-3.8,2.4),Math.max(air,landing*.8));
  r.shields.forEach((n,i)=>add(n,0,(i?1:-1)*(.18*air+.08*landing)));
 }
 if(action==='special'){
  const rise=smooth(.35,1.65,t)*(1-smooth(3.20,3.66,t)),throwing=pulse(t,3.18,3.62,3.95,5.80),load=pulse(t,.12,.65,2.95,3.30);
  palmWeight=smooth(.50,1.55,t)*(1-smooth(3.35,4.30,t));
  b[r.center].position.y-=.22*load+.22*throwing;add(r.waist,-.035*load+.075*throwing,.10*load-.12*throwing);
  add(r.chest,-.09*rise+.11*throwing,-.14*rise-.12*throwing);add(r.head,-.065*rise-.05*throwing,.04*rise+.15*throwing);
  for(let i=0;i<2;i++){
   const side=i===0?1:-1;
   targets[i].lerp(new T.Vector3(side*2.20,4.70,1.4),rise).lerp(new T.Vector3(side*.70,-1.15,4.85),throwing);
   poles[i].lerp(new T.Vector3(side,.05,-.45),rise);
   rot(i===0?'J_collar_l':'J_collar_r',-.08*rise,0,side*.32*rise);
  }
  r.shields.forEach((n,i)=>add(n,0,(i?1:-1)*.24*Math.max(rise,throwing)));
 }
 // The hip plates hinge slightly with the forward thigh instead of cutting into it.
 add('J_yoroi_l',-.085,0,-.045);add('J_yoroi_r',.035,0,.04);
 arm(c,0,targets[0],poles[0],palmWeight);arm(c,1,targets[1],poles[1],palmWeight);
}
