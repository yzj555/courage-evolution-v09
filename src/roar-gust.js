import * as T from 'three';

// Pressure fronts and thin wind trails share an emitter at the moving mouth.
// All timing comes from the action clock, including pause and manual scrubbing.
export function createRoarGust(scene){
 const group=new T.Group();group.name='Roar_Air_Waves';group.visible=false;scene.add(group);
 const anchors=new WeakMap(),fronts=[],trails=[];
 const shape=new T.RingGeometry(.48,1,96,6),p=shape.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,.20*(1-p.getX(i)**2-p.getY(i)**2));
 const vertexShader=`varying vec2 point;void main(){point=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
 const fragmentShader=`
  varying vec2 point;uniform float phase;uniform float opacity;
  void main(){
   float r=length(point),a=atan(point.y,point.x);
   float ripple=.765+.027*sin(a*5.+phase)+.012*sin(a*11.-phase*.7);
   float d=abs(r-ripple),line=1.-smoothstep(.018,.062,d);
   float haze=(1.-smoothstep(.045,.19,d))*.20;
   float arc=.32+.68*smoothstep(-.6,.45,sin(a*3.+phase*.4));
   float alpha=(line*.82+haze)*arc*opacity;
   if(alpha<.004)discard;
   gl_FragColor=vec4(mix(vec3(.52,.67,.72),vec3(.84,.94,.98),line),alpha);
  }`;
 for(let i=0;i<7;i++){
  const material=new T.ShaderMaterial({vertexShader,fragmentShader,uniforms:{phase:{value:0},opacity:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide});
  const mesh=new T.Mesh(shape,material);mesh.frustumCulled=false;mesh.renderOrder=3;group.add(mesh);fronts.push(mesh);
 }
 const curve=new T.CatmullRomCurve3([new T.Vector3(.28,0,0),new T.Vector3(.65,.12,1.7),new T.Vector3(1.35,-.12,3.6),new T.Vector3(1.95,.03,5.9)]);
 const ribbon=new T.TubeGeometry(curve,28,.026,5,false);
 for(let i=0;i<9;i++){
  const mesh=new T.Mesh(ribbon,new T.MeshBasicMaterial({color:0xecf7f9,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  mesh.frustumCulled=false;mesh.renderOrder=3;group.add(mesh);trails.push(mesh);
 }
 function mouthAnchor(c){
  if(anchors.has(c))return anchors.get(c);
  const jaw=c.bones[c.cfg.jaw],head=c.bones[c.cfg.head],index=c.joints.indexOf(jaw),g=c.body.geometry;
  const pos=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,candidates=[];let front=-Infinity;
  for(let i=0;i<pos.count;i++){
   let w=0;for(let j=0;j<4;j++)if(si.array[i*4+j]===index)w+=sw.array[i*4+j];
   if(w>.55){candidates.push(i);front=Math.max(front,pos.getZ(i));}
  }
  const point=new T.Vector3();let count=0;
  for(const i of candidates)if(pos.getZ(i)>front-.60){point.add(new T.Vector3().fromBufferAttribute(pos,i));count++;}
  if(count)point.divideScalar(count);else point.copy(c.spec[c.cfg.jaw]).add(new T.Vector3(0,0,2));
  point.x=0;point.y+=.18;if(Number.isFinite(front))point.z=front+.10;
  const anchor={jaw,head,lower:point.clone().sub(c.spec[jaw.name]),upper:point.clone().sub(c.spec[head.name])};
  anchors.set(c,anchor);return anchor;
 }
 const a=new T.Vector3(),b=new T.Vector3(),scale=new T.Vector3();
 function update(c,action,time,enabled=true){
  group.visible=!!(enabled&&c?.proportions&&action==='roar'&&time>=.78&&time<3.15);
  if(!group.visible)return;
  const anchor=mouthAnchor(c);c.rig.updateMatrixWorld(true);
  a.copy(anchor.upper).applyMatrix4(anchor.head.matrixWorld);b.copy(anchor.lower).applyMatrix4(anchor.jaw.matrixWorld);
  group.position.copy(a).lerp(b,.52);group.quaternion.copy(anchor.head.getWorldQuaternion(new T.Quaternion()));
  group.scale.setScalar(c.rig.getWorldScale(scale).x);
  let active=0;
  fronts.forEach((mesh,i)=>{
   const age=time-(.78+i*.215),u=age/.92;mesh.visible=u>0&&u<1;if(!mesh.visible)return;
   active++;const radius=.72+3.65*u;
   mesh.position.set(.09*Math.sin(i*2.1)*u,.04*Math.cos(i)*u,.16+8.2*u);
   mesh.scale.set(radius,radius*(.66+.035*Math.sin(i)),radius*.55);mesh.rotation.z=i*.37;
   mesh.material.uniforms.phase.value=i*1.7+time*2.4;
   mesh.material.uniforms.opacity.value=.54*Math.pow(Math.sin(Math.PI*u),.8)*(1-.40*u);
  });
  const envelope=T.MathUtils.smoothstep(time,.78,1.1)*(1-T.MathUtils.smoothstep(time,2.3,2.95));
  trails.forEach((mesh,i)=>{
   const u=((time-.78)*1.22+i*.173)%1;mesh.visible=envelope>0;
   mesh.rotation.z=i*Math.PI*2/9+.1*Math.sin(time*2+i);mesh.position.z=.12+u*3;
   mesh.scale.set(.75+u*.34,.75+u*.34,.35+.42*u);mesh.material.opacity=envelope*.32*Math.sin(u*Math.PI);
  });
  group.userData.activeWaves=active;
 }
 return {group,update,get state(){return {visible:group.visible,activeWaves:group.visible?group.userData.activeWaves||0:0,origin:group.position.toArray(),direction:new T.Vector3(0,0,1).applyQuaternion(group.quaternion).toArray()};}};
}
