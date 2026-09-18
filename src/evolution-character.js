import * as T from 'three';
import {ColladaLoader} from '../vendor/loaders/ColladaLoader.js';
import {createCharacter} from './game-character.js';
import {refineSkin} from './subdivide-skin.js';
import {RIGS} from './evolution-config.js';
import {installEvolutionMotion} from './evolution-motion.js';
import {addAgumonSignature} from './agumon-signature.js';
import {refineWarriorShoulders} from './warrior-skin.js';
import {refineDinosaurProportions,curveMechanicalClawTips} from './dinosaur-proportions.js';

export async function loadCharacter(id,asset){
 const xml=new DOMParser().parseFromString(asset.dae,'text/xml');
 const root=xml.querySelector('node[type="JOINT"]');for(const s of xml.querySelectorAll('instance_controller skeleton'))s.textContent='#'+root.id;
 const names=Object.fromEntries([...xml.querySelectorAll('node[type="JOINT"]')].map(n=>[n.getAttribute('sid'),n.getAttribute('name')]));
 const manager=new T.LoadingManager();manager.setURLModifier(()=>asset.texture);
 let finish;const loaded=new Promise(r=>finish=r);manager.onLoad=finish;
 const source=new ColladaLoader(manager).parse(new XMLSerializer().serializeToString(xml),'');await loaded;
 source.scene.traverse(o=>{if(o.isBone)o.name=names[o.name]||o.name;});
 const blink=await new T.TextureLoader().loadAsync(asset.blink);
 if(id==='agumon')return addAgumonSignature(createCharacter(source.scene,blink));
 return createEvolutionCharacter(id,source.scene,blink);
}

function addEarSegments(g,bones,joints,spec,rig){
 const p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
 for(const earName of ['J_mimiL','J_mimiR']){
  const old=joints.indexOf(bones[earName]),base=spec[earName],tipZ=Math.min(...Array.from({length:p.count},(_,i)=>{let weight=0;for(let j=0;j<4;j++)if(si.array[i*4+j]===old)weight+=sw.array[i*4+j];return weight>.35?p.getZ(i):base.z;}));
  const segments=[.38,.73].map((u,i)=>{
   const point=new T.Vector3(),weight=[0];for(let k=0;k<p.count;k++)for(let j=0;j<4;j++)if(si.array[k*4+j]===old&&sw.array[k*4+j]>.1){const f=(base.z-p.getZ(k))/(base.z-tipZ),w=Math.max(0,1-Math.abs(f-u)/.22)*sw.array[k*4+j];point.addScaledVector(new T.Vector3().fromBufferAttribute(p,k),w);weight[0]+=w;}
   point.divideScalar(weight[0]||1);const bone=new T.Bone();bone.name=earName+'_follow'+i;bones[bone.name]=bone;spec[bone.name]=point;return bone;
  });
  segments[0].position.copy(spec[segments[0].name]).sub(base);bones[earName].add(segments[0]);segments[1].position.copy(spec[segments[1].name]).sub(spec[segments[0].name]);segments[0].add(segments[1]);const indices=[old,joints.length,joints.length+1];joints.push(...segments);
  for(let i=0;i<p.count;i++){
   const weights=new Map();for(let j=0;j<4;j++){const index=si.array[i*4+j],w=sw.array[i*4+j];if(!w)continue;if(index!==old){weights.set(index,(weights.get(index)||0)+w);continue;}
    const u=T.MathUtils.clamp((base.z-p.getZ(i))/(base.z-tipZ),0,1),split=u<.38?0:1,lo=split===0?0:.38,hi=split===0?.38:.73,f=T.MathUtils.smoothstep(u,lo,hi);for(const [index,a] of [[indices[split],1-f],[indices[split+1],f]])weights.set(index,(weights.get(index)||0)+w*a);
   }
   const pairs=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4);while(pairs.length<4)pairs.push([0,0]);const total=pairs.reduce((a,b)=>a+b[1],0);for(let j=0;j<4;j++){si.array[i*4+j]=pairs[j][0];sw.array[i*4+j]=pairs[j][1]/total;}
  }
 }
 rig.updateMatrixWorld(true);
}

function createEvolutionCharacter(id,source,blinkTexture){
 source.updateMatrixWorld(true);let original;source.traverse(o=>{if(o.isSkinnedMesh)original=o;});
 const cfg=RIGS[id],rig=new T.Group();rig.name=id;
 const geo=original.geometry.clone(),p=geo.attributes.position,v=new T.Vector3(),box=new T.Box3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);original.applyBoneTransform(i,v);v.applyMatrix4(original.matrixWorld);p.setXYZ(i,v.x,v.y,v.z);box.expandByPoint(v);}
 const factor=20/(box.max.y-box.min.y),offset=-box.min.y*factor+.03;
 for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*factor,p.getY(i)*factor+offset,p.getZ(i)*factor);
 const old=original.skeleton.bones,ordered=[old.find(o=>o.name===cfg.root),...old.filter(o=>o.name!==cfg.root)],joints=[],bones={},spec={};
 if(!ordered[0])throw Error('Missing root for '+id);
 const remap=old.map(o=>ordered.indexOf(o));const si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight;for(let i=0;i<si.array.length;i++)si.array[i]=sw.array[i]>0?remap[si.array[i]]:0;
 for(const oldBone of ordered){const bone=new T.Bone();bone.name=oldBone.name;bone.position.copy(oldBone.getWorldPosition(new T.Vector3()).multiplyScalar(factor));bone.position.y+=offset;bones[bone.name]=bone;spec[bone.name]=bone.position.clone();joints.push(bone);}
 for(let i=0;i<ordered.length;i++){const bone=joints[i],parent=bones[ordered[i].parent.name];if(parent){bone.position.sub(spec[parent.name]);parent.add(bone);}else rig.add(bone);}
 if(id==='koromon')addEarSegments(geo,bones,joints,spec,rig);
 const proportions=refineDinosaurProportions(id,geo,joints,spec,cfg);
 rig.updateMatrixWorld(true);const skeleton=new T.Skeleton(joints);skeleton.calculateInverses();
 const armored=id==='metalgreymon'||id==='wargreymon';
 const refined=refineSkin(geo,2,armored?{blend:.32,creaseAngle:.78}:{});
 const shoulderSkin=id==='wargreymon'?refineWarriorShoulders(refined,joints):null;
 const clawProfile=id==='metalgreymon'?curveMechanicalClawTips(refined,joints,spec):null;
 const texture=original.material.map;for(const map of [texture,blinkTexture]){map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;}blinkTexture.wrapS=texture.wrapS;blinkTexture.wrapT=texture.wrapT;blinkTexture.repeat.copy(texture.repeat);blinkTexture.offset.copy(texture.offset);
 const anime=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false});
 const figurine=new T.MeshStandardMaterial({map:texture,side:T.DoubleSide,roughness:armored?.54:.68,metalness:armored?.14:0,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.055});
 const body=new T.SkinnedMesh(refined,anime);body.name=id+'_Refined';body.bind(skeleton,new T.Matrix4());body.frustumCulled=false;body.castShadow=true;rig.add(body);
 let style='anime',wire=false;
 const rest=joints.map(b=>({position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()}));
 const c={id,cfg,rig,body,bones,joints,spec,rest,skeleton,proportions,clawProfile,shoulderSkin,get style(){return style;},setStyle(s){style=s;body.material=s==='anime'?anime:figurine;body.material.wireframe=wire;},setWire(w){wire=w;body.material.wireframe=w;},setBlink(b){const map=b?blinkTexture:texture;anime.map=figurine.map=figurine.emissiveMap=map;}};
 rig.userData={source:'Digimon Linkz / Cyber Sleuth; community conversion by Theigno',sourceURL:'https://withthewill.net/threads/3d-models-from-digimon-linkz-and-by-extension-cyber-sleuth-and-next-0rder.15915/',scope:'Game model adaptation; not a 1:1 reproduction of the 1999 animation.',changes:'Refined surface, original texture and skinning, custom articulated animation.'};
 // Floor contact is measured after subdivision, using only actual bottom vertices.
 c.groundVertices=[];let minimum=Infinity;const rp=refined.attributes.position;for(let i=0;i<rp.count;i++)minimum=Math.min(minimum,rp.getY(i));for(let i=0;i<rp.count;i++)if(rp.getY(i)<minimum+.25)c.groundVertices.push(i);
 c.groundY=minimum;installEvolutionMotion(c);return c;
}
