import * as T from 'three';

// Sculpt the bind mesh and its joint locations together. Animation remains at
// unit bone scale, so a bent knee or elbow keeps the revised limb proportions.
export function refineDinosaurProportions(id,geometry,joints,spec,cfg){
 if(id!=='greymon'&&id!=='metalgreymon')return null;
 const metal=id==='metalgreymon';
 const profile={thigh:metal?.83:.94,shin:metal?.76:.81,organicUpper:metal?.98:1.06,organicFore:metal?1.02:1.06,
  pelvisPitch:metal?.38:.34,waistPitch:metal?.07:0,chestPitch:metal?.03:.30,
  headPitch:metal?-.48:-.54,crouch:metal?.65:.78};
 const old=Object.fromEntries(Object.entries(spec).map(([n,p])=>[n,p.clone()]));
 const transforms={},next={},matrix={};
 const diagonal=(x,y,z)=>new T.Matrix3().set(x,0,0,0,y,0,0,0,z);
 const segment=(name,child,length,radius)=>{
  const a=old[child].clone().sub(old[name]).normalize(),d=length-radius;
  return new T.Matrix3().set(radius+d*a.x*a.x,d*a.x*a.y,d*a.x*a.z,
   d*a.y*a.x,radius+d*a.y*a.y,d*a.y*a.z,d*a.z*a.x,d*a.z*a.y,radius+d*a.z*a.z);
 };
 transforms[cfg.root]=diagonal(1,1,1);
 transforms[cfg.center]=diagonal(metal?1.24:1.22,1,metal?1.34:1.30);
 if(cfg.waist)transforms[cfg.waist]=diagonal(1.20,1,1.28);
 transforms[cfg.chest]=diagonal(metal?1.16:1.18,1,1.22);
 transforms[cfg.head]=diagonal(1.04,.95,metal?1.12:1.10);
 for(let i=0;i<2;i++){
  transforms[cfg.hips[i]]=segment(cfg.hips[i],cfg.knees[i],profile.thigh,metal?1.35:1.32);
  transforms[cfg.knees[i]]=segment(cfg.knees[i],cfg.feet[i],profile.shin,metal?1.18:1.16);
  transforms[cfg.feet[i]]=diagonal(1.08,1.02,1.08);
  const mechanical=metal&&i===0;
  transforms[cfg.arms[i]]=segment(cfg.arms[i],cfg.elbows[i],mechanical?.98:profile.organicUpper,metal?(mechanical?1.10:1.18):1.13);
  transforms[cfg.elbows[i]]=segment(cfg.elbows[i],cfg.hands[i],mechanical?.96:profile.organicFore,mechanical?1.10:metal?1.16:1.18);
  // The cuff and claw are one mechanical assembly: use the same bind-space
  // transform at their interface so resizing cannot open a seam between them.
  // Greymon's compact palm and fuller forearm keep the wrist from looking
  // pinched after lengthening the arms. Retain the accepted segment lengths.
  const handScale=metal?1.12:1.00;transforms[cfg.hands[i]]=mechanical?transforms[cfg.elbows[i]].clone():diagonal(handScale,handScale,handScale);
 }
 cfg.tail.forEach((n,i)=>{transforms[n]=segment(n,cfg.tail[i+1]||cfg.tail[i-1],1.04,1.12);});
 const lower=(old[cfg.hips[0]].y-old[cfg.knees[0]].y)*(1-profile.thigh)
  +(old[cfg.knees[0]].y-old[cfg.feet[0]].y)*(1-profile.shin);
 function place(bone){
  const n=bone.name;if(next[n])return;
  const parent=bone.parent?.isBone?bone.parent:null;
  if(parent)place(parent);
  matrix[n]=transforms[n]||(parent?matrix[parent.name]:diagonal(1,1,1));
  next[n]=parent?old[n].clone().sub(old[parent.name]).applyMatrix3(matrix[parent.name]).add(next[parent.name]):old[n].clone();
  if(n===cfg.center)next[n].y-=lower;
  if(n===cfg.head){next[n].z+=metal?.90:.28;if(metal)next[n].y+=.40;}
 }
 joints.forEach(place);
 const p=geometry.attributes.position,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
 const source=new T.Vector3(),result=new T.Vector3(),part=new T.Vector3();let minimum=Infinity;
 for(let i=0;i<p.count;i++){
  source.fromBufferAttribute(p,i);result.set(0,0,0);
  for(let j=0;j<4;j++){
   const w=sw.array[i*4+j];if(!w)continue;
   const n=joints[si.array[i*4+j]].name;
   part.copy(source).sub(old[n]).applyMatrix3(matrix[n]).add(next[n]);result.addScaledVector(part,w);
  }
  p.setXYZ(i,result.x,result.y,result.z);minimum=Math.min(minimum,result.y);
 }
 const lift=.03-minimum;
 for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+lift);
 for(const n of Object.keys(next)){next[n].y+=lift;spec[n].copy(next[n]);}
 for(const bone of joints){bone.position.copy(spec[bone.name]);if(bone.parent?.isBone)bone.position.sub(spec[bone.parent.name]);}
 p.needsUpdate=true;
 return profile;
}

// Bend only the distal blade surfaces, after subdivision has supplied enough
// vertices for a smooth hook. The cuff, wrist and straight claw roots stay put.
export function curveMechanicalClawTips(geometry,joints,spec){
 const p=geometry.attributes.position,n=geometry.attributes.normal,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
 const tipIndex=joints.findIndex(b=>b.name==='J_clawTop'),origin=spec.J_claw000;
 const forward=spec.J_clawTop.clone().sub(origin).normalize();
 // The three blades are spaced along Y in the bind mesh. Curl each in its
 // broad XZ plane, toward the inside of the palm, rather than splaying them.
 const inward=new T.Vector3(0,0,1).addScaledVector(forward,-forward.z).normalize();
 const point=new T.Vector3(),relative=new T.Vector3(),normal=new T.Vector3();let extent=0,bent=0;
 const candidates=[];
 for(let i=0;i<p.count;i++){
  let weight=0;for(let j=0;j<4;j++)if(si.array[i*4+j]===tipIndex)weight+=sw.array[i*4+j];
  if(weight<.999)continue;
  relative.fromBufferAttribute(p,i).sub(origin);const distance=relative.dot(forward);
  candidates.push([i,distance]);extent=Math.max(extent,distance);
 }
 const start=extent*.55,angle=.76,radius=(extent-start)/angle;
 for(const [i,distance] of candidates){
  if(distance<=start)continue;
  point.fromBufferAttribute(p,i);relative.copy(point).sub(origin);
  const theta=(distance-start)/radius,depth=relative.dot(inward)-.08;
  point.addScaledVector(forward,radius*Math.sin(theta)-(distance-start)-depth*Math.sin(theta));
  point.addScaledVector(inward,radius*(1-Math.cos(theta))+depth*(Math.cos(theta)-1));
  p.setXYZ(i,point.x,point.y,point.z);bent++;
  // Apply the inverse-transpose bend Jacobian to existing split normals so
  // the metal's hard edges and the rest of the character keep their shading.
  normal.fromBufferAttribute(n,i);const along=normal.dot(forward),across=normal.dot(inward),stretch=1-depth/radius;
  normal.addScaledVector(forward,along*Math.cos(theta)/stretch-across*Math.sin(theta)-along);
  normal.addScaledVector(inward,along*Math.sin(theta)/stretch+across*Math.cos(theta)-across).normalize();
  n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 p.needsUpdate=n.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return {bentVertices:bent,start,extent,angle};
}
