import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {GLTFExporter} from '../vendor/GLTFExporter.js';
import {FORMS} from './evolution-config.js';
import {loadCharacter} from './evolution-character.js';
import {createRoarGust} from './roar-gust.js';
import {createSignatureEffects} from './signature-effects.js';
import {SIGNATURES,signaturePhase} from './signature-config.js';

const $=s=>document.querySelector(s),host=$('#canvas');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#f2efe6');const camera=new T.PerspectiveCamera(35,1,.01,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.56;
scene.add(new T.HemisphereLight(0xfffbec,0xa1a6b0,1.65));const key=new T.DirectionalLight(0xfff7e7,2);key.position.set(-3,9,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-4,near:.5,far:22});key.shadow.normalBias=.018;scene.add(key);const rim=new T.DirectionalLight(0xe4efff,1.5);rim.position.set(4,5,-4);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.y=-.018;floor.receiveShadow=true;scene.add(floor);const disc=new T.Mesh(new T.CircleGeometry(3.25,128),new T.MeshBasicMaterial({color:0xe4e2d8,transparent:true,opacity:.30,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.y=-.023;scene.add(disc);
const ring=new T.Mesh(new T.TorusGeometry(.9,.012,8,96),new T.MeshBasicMaterial({color:0xc5a76d,transparent:true,opacity:.5,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
const roarGust=createRoarGust(scene);
const signatureEffects=createSignatureEffects(scene);
let index=-1,character=null,model=null,current='idle',elapsed=0,idleTime=0,paused=false,manual=null,forced=false,transition=null,transitionTime=0,loading=false,exporting=false,style='anime',wire=false,lastView='angle',auto=false,autoElapsed=0,requestId=0,bounds=null;
const cache=new Map();
let entranceSpecial=false,framing=0;
$('#journey').innerHTML=FORMS.map((f,i)=>`<button class="form-card" data-form="${i}" aria-pressed="false"><span class="tiny"><span>${String(i+1).padStart(2,'0')}</span><span class="order-total">/ 06</span></span><strong>${f.name}</strong><span class="level">${f.stage}</span></button>`).join('');
function updateStatus(){if(index<0)return;const f=FORMS[index],s=SIGNATURES[f.id],names={idle:f.id==='wargreymon'?'备战待机':'放松待机',wave:f.actions[0],roar:f.actions[1],step:f.actions[2],entrance:'登场 · 即将释放'+s.name,nod:'回应你',special:s.name+' · '+signaturePhase(f.id,elapsed)};const label=loading?'正在准备形态…':paused?'已暂停 · 可旋转观察':manual!==null?'手动控制嘴巴':names[current];if($('#status').textContent!==label)$('#status').textContent=label;document.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('active',b.dataset.action===current));$('#special-progress').style.transform=`scaleX(${current==='special'?Math.min(1,elapsed/s.duration):0})`;}
function play(action){if(!character||loading||exporting||!character.duration[action])return;transition=character.capturePose();transitionTime=0;current=action;elapsed=0;autoElapsed=0;entranceSpecial=action==='entrance';manual=null;forced=false;paused=false;$('#pause').textContent='暂停动作';$('#mouth').value=0;updateStatus();}
function updateFraming(){
 if(!character)return;const s=SIGNATURES[character.id],next=current==='special'?T.MathUtils.smoothstep(elapsed,0,.75)*(1-T.MathUtils.smoothstep(elapsed,s.end,s.duration)):0;
 const boost=s.kind==='gaia'?.32:s.kind==='bubbles'?.08:.18,offset=new T.Vector3(0,s.kind==='gaia'?.56:0,0);
 if(Math.abs(next-framing)<1e-6)return;
 const delta=camera.position.clone().sub(controls.target).multiplyScalar((1+boost*next)/(1+boost*framing));
 controls.target.addScaledVector(offset,next-framing);camera.position.copy(controls.target).add(delta);framing=next;
}
function view(name){
 lastView=name;if(!bounds)return;const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());center.y-=size.y*.035;
 const directions={front:[0,.045,1],side:[1,.06,0],back:[0,.05,-1],angle:[.36,.11,1]},dir=new T.Vector3(...directions[name]).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),dir).normalize(),up=new T.Vector3().crossVectors(dir,right),tan=Math.tan(T.MathUtils.degToRad(camera.fov*.5));
 let distance=6.8;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).sub(center);distance=Math.max(distance,p.dot(dir)+Math.max(Math.abs(p.dot(right))/(tan*camera.aspect*.82),Math.abs(p.dot(up))/(tan*.72)));}
 controls.target.copy(center);camera.position.copy(center).addScaledVector(dir,distance);controls.minDistance=distance*.4;controls.maxDistance=distance*2.5;framing=0;updateFraming();controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
}
async function select(which,{entrance=true}={}){
 if(exporting)return;const n=typeof which==='string'?FORMS.findIndex(f=>f.id===which):which;if(n<0||n>=FORMS.length)return;
 const req=++requestId;loading=true;entranceSpecial=false;signatureEffects.update(null,'idle',0,false);const f=FORMS[n];$('#loading').hidden=false;$('#loading-text').textContent=`正在准备${f.name}…`;$('#error').hidden=true;await new Promise(r=>setTimeout(r,20));
 try{
  if(!cache.has(f.id))cache.set(f.id,await loadCharacter(f.id,window.EVOLUTION_ASSETS[f.id]));const c=cache.get(f.id);if(req!==requestId)return;
  if(model)model.visible=false;character=c;model=c.rig;index=n;c.setStyle(style);c.setWire(wire);c.poseAt(0,'idle',0);model.scale.setScalar(f.id==='agumon'?.14:f.height/20);model.position.set(0,0,0);model.visible=true;scene.add(model);model.updateMatrixWorld(true);c.body.computeBoundingBox();let box=new T.Box3().setFromObject(model);model.position.y=.007-box.min.y;model.updateMatrixWorld(true);bounds=new T.Box3().setFromObject(model);view(lastView);
  document.documentElement.style.setProperty('--accent',f.color);$('#name').textContent=f.name;$('#english').textContent=$('#stage-en').textContent=f.en;$('#stage').textContent=f.stage;$('#index').textContent=String(n+1).padStart(2,'0')+' / 06';$('#stage-number').textContent=String(n+1).padStart(2,'0');$('#description').textContent=f.description;$('#reference').src=window.EVOLUTION_ASSETS[f.id].reference;$('#reference').alt=f.name+'造型参考';$('#mouth-control').hidden=!f.mouth;
  ['wave','roar','step'].forEach((a,i)=>$(`[data-action="${a}"]`).textContent=f.actions[i]);$('#special-label').textContent='释放 · '+SIGNATURES[f.id].name;document.querySelectorAll('[data-form]').forEach(b=>{const active=Number(b.dataset.form)===n;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('#previous').disabled=n===0;$('#next').disabled=$('#evolve').disabled=n===5;$('#evolve').textContent=n===5?'已到达究极体':`进化至${FORMS[n+1].name} →`;
  const journey=$('#journey'),card=$(`[data-form="${n}"]`);journey.scrollLeft+=card.getBoundingClientRect().left-journey.getBoundingClientRect().left-(journey.clientWidth-card.clientWidth)/2;
  loading=false;$('#loading').hidden=true;forced=false;paused=false;manual=null;transition=null;idleTime=0;elapsed=0;autoElapsed=0;current=entrance?'entrance':'idle';entranceSpecial=entrance;$('#mouth').value=0;$('#pause').textContent='暂停动作';character.poseAt(0,current);view(lastView);updateStatus();$('#curtain').classList.remove('evolving');void $('#curtain').offsetWidth;$('#curtain').classList.add('evolving');renderer.render(scene,camera);return character;
 }catch(error){loading=false;$('#loading').hidden=true;$('#error').textContent='这个形态暂时未能载入，请重新选择。'+error.message;$('#error').hidden=false;console.error(error);throw error;}
}
document.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{auto=false;updateAuto();select(Number(b.dataset.form));});document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>play(b.dataset.action));
$('#previous').onclick=()=>select(index-1);$('#next').onclick=$('#evolve').onclick=()=>select(index+1);
function updateAuto(){$('#autoplay').setAttribute('aria-pressed',String(auto));$('#autoplay').textContent=auto?'停止连续观看':'连续观看进化';}
$('#autoplay').onclick=()=>{auto=!auto;updateAuto();autoElapsed=0;if(auto)select(0);};
$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'继续动作':'暂停动作';updateStatus();};
$('#mouth').oninput=e=>{if(!character)return;transition=null;entranceSpecial=false;manual=Number(e.target.value)/100;current='idle';character.poseAt(idleTime,current,manual);updateStatus();};
document.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{style=b.dataset.style;character?.setStyle(style);document.querySelectorAll('[data-style]').forEach(x=>x.classList.toggle('active',x===b));});
$('#wire').onclick=()=>{wire=!wire;character?.setWire(wire);$('#wire').setAttribute('aria-pressed',String(wire));};
let down=null;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||!character)return;const r=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.x)/r.width*2-1,1-(e.clientY-r.y)/r.height*2),camera);if(ray.intersectObject(character.body,false).length)play('nod');});
window.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(e.key.toLowerCase()==='f')play('special');if(e.target.matches('button'))return;if(e.code==='Space'){e.preventDefault();$('#pause').click();}if(e.key>='1'&&e.key<='6')select(Number(e.key)-1);if(e.key==='ArrowRight')select(index+1);if(e.key==='ArrowLeft')select(index-1);});
async function exportModel(){
 if(!character||loading)return;exporting=true;const c=character,m=model,oldParent=m.parent,position=m.position.clone(),scale=m.scale.clone(),savedPose=c.capturePose();c.poseAt(0,'idle',0);oldParent.remove(m);m.scale.setScalar(1);m.position.set(0,0,0);m.updateMatrixWorld(true);const exportScene=new T.Scene();exportScene.name=FORMS[index].en;exportScene.userData={...m.userData};const children=[...m.children];for(const child of children)exportScene.add(child);exportScene.updateMatrixWorld(true);
 try{return await new GLTFExporter().parseAsync(exportScene,{binary:true,animations:c.clips,onlyVisible:true});}finally{for(const child of children)m.add(child);m.scale.copy(scale);m.position.copy(position);oldParent.add(m);c.blendFrom(savedPose,0);exporting=false;}
}
$('#download').onclick=async()=>{const button=$('#download');button.disabled=true;button.textContent='正在打包…';try{const data=await exportModel();if(data){const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'})),a=document.createElement('a');a.href=url;a.download=`${FORMS[index].id}-${style}-animated.glb`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}finally{button.disabled=false;button.textContent='下载当前动画模型';}};
function resize(){renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();view(lastView);}new ResizeObserver(resize).observe(host);resize();
function tick(dt){
 if(character&&!paused&&!exporting&&!forced&&!loading){elapsed+=dt;idleTime+=dt;autoElapsed+=dt;if(current!=='idle'&&elapsed>character.duration[current]){transition=character.capturePose();transitionTime=0;current=current==='entrance'&&entranceSpecial?'special':'idle';entranceSpecial=false;elapsed=0;updateStatus();}character.poseAt(current==='idle'?idleTime:elapsed,current,manual);if(transition){transitionTime+=dt;character.blendFrom(transition,Math.min(1,transitionTime/.32));if(transitionTime>=.32)transition=null;}if(auto&&current==='idle'&&elapsed>2.0){autoElapsed=0;if(index<5)select(index+1);else{auto=false;updateAuto();}}}
 ring.visible=!loading&&current==='entrance'&&elapsed>1.04&&elapsed<1.8;ring.position.y=.01;if(ring.visible){const t=(elapsed-1.04)/.76;ring.scale.setScalar(.8+t*2);ring.material.opacity=.35*(1-t);}roarGust.update(character,current,elapsed,!loading&&!exporting&&manual===null);signatureEffects.update(character,current,elapsed,!loading&&!exporting&&manual===null);updateFraming();if(current==='special')updateStatus();
}
let previous=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.06);previous=now;tick(dt);controls.update();renderer.render(scene,camera);});
window.evolutionLab={ready:false,T,forms:FORMS,signatures:SIGNATURES,scene,renderer,camera,select,view,play,exportModel,advance:dt=>tick(Math.min(dt,.06)),effects:{roar:roarGust,signature:signatureEffects},get character(){return character;},get model(){return model;},get state(){return {index,id:FORMS[index]?.id,action:current,elapsed,paused,manual,loading,style,auto,entranceSpecial};},setPose(action,t,mouth=null){forced=true;entranceSpecial=false;transition=null;current=action;elapsed=t;manual=mouth;character.poseAt(t,action,mouth);roarGust.update(character,action,t,mouth===null);signatureEffects.update(character,action,t,mouth===null);updateFraming();controls.update();updateStatus();renderer.render(scene,camera);}};
const initial=new URLSearchParams(location.search).get('form')||'botamon';await select(FORMS.some(f=>f.id===initial)?initial:'botamon');window.evolutionLab.ready=true;
