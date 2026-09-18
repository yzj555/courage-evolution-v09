import * as T from 'three';
import {refineSkin,softenShoulderWeights} from './subdivide-skin.js';
import {installMotion} from './game-motion.js';
export function createCharacter(source,blinkTexture){
 source.updateMatrixWorld(true);let original;source.traverse(o=>{if(o.isSkinnedMesh)original=o});
 const rig=new T.Group();rig.name='Agumon';const nativeBones=original.skeleton.bones,oldBones=[nativeBones.find(b=>b.name==='J_root'),...nativeBones.filter(b=>b.name!=='J_root')],bones={},joints=[],rest=[],spec={},offset=.116329;
 const sourceGeometry=original.geometry,geo=sourceGeometry.clone();const ps=geo.attributes.position,v=new T.Vector3();
 for(let i=0;i<ps.count;i++){v.fromBufferAttribute(sourceGeometry.attributes.position,i);original.applyBoneTransform(i,v);v.applyMatrix4(original.matrixWorld).multiplyScalar(100);v.y+=offset;ps.setXYZ(i,...v.toArray());}
 const indexMap=nativeBones.map(b=>oldBones.indexOf(b));for(let i=0;i<geo.attributes.skinIndex.array.length;i++)geo.attributes.skinIndex.array[i]=geo.attributes.skinWeight.array[i]>0?indexMap[geo.attributes.skinIndex.array[i]]:0;
 for(const old of oldBones){const b=new T.Bone();b.name=old.name;b.position.copy(old.getWorldPosition(new T.Vector3()).multiplyScalar(100));b.position.y+=offset;bones[b.name]=b;spec[b.name]=b.position.clone();joints.push(b);}
 for(let i=0;i<oldBones.length;i++){const b=joints[i],parent=bones[oldBones[i].parent.name];if(parent){b.position.sub(spec[parent.name]);parent.add(b);}else rig.add(b);rest.push({position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()});}
 rig.updateMatrixWorld(true);const skeleton=new T.Skeleton(joints);skeleton.calculateInverses();
 const texture=original.material.map;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
 blinkTexture.colorSpace=T.SRGBColorSpace;blinkTexture.wrapS=texture.wrapS;blinkTexture.wrapT=texture.wrapT;blinkTexture.repeat.copy(texture.repeat);blinkTexture.offset.copy(texture.offset);blinkTexture.anisotropy=8;
 const refined=refineSkin(geo,2);softenShoulderWeights(refined,joints.length);const skin=new T.MeshStandardMaterial({map:texture,color:0xffffff,roughness:.68,metalness:0,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.06});
 const body=new T.SkinnedMesh(refined,skin);body.name='Agumon_Linkz_Refined';rig.add(body);body.bind(skeleton,new T.Matrix4());body.frustumCulled=false;body.castShadow=true;
 const anime=new T.MeshBasicMaterial({map:texture,color:0xffffff,toneMapped:false});let style='anime',wire=false;
 function setStyle(s){style=s;body.material=s==='anime'?anime:skin;body.material.wireframe=wire;}
 function setWire(s){wire=s;body.material.wireframe=s;}
 function setBlink(value){const map=value?blinkTexture:texture;skin.map=map;skin.emissiveMap=map;anime.map=map;}
 const result={rig,body,bones,joints,rest,spec,skeleton,setStyle,setWire,setBlink,get style(){return style;}};
 rig.userData={source:'Digimon Linkz / Cyber Sleuth; community conversion by Theigno',sourceURL:'https://withthewill.net/threads/3d-models-from-digimon-linkz-and-by-extension-cyber-sleuth-and-next-0rder.15915/',changes:'Subdivision with skin-weight interpolation, normalized skeleton, custom animation and local viewer.',scope:'Game model adaptation; not a 1:1 reproduction of the 1999 animation.'};
 installMotion(result);setStyle('anime');return result;
}
