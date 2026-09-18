import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {FORMS} from './evolution-config.js';
import {SCENES,BEATS,smooth,pulse,beatAt,evolutionProgress,evolutionTime} from './cinema-config.js';
import {createCinemaActor,createMorphCloud} from './cinema-actors.js';
import {createCinemaEffects} from './cinema-film-effects.js';
import {createSignatureEffects} from './signature-effects.js';
import {signaturePhase} from './signature-config.js';
import {createCinemaPost} from './cinema-post.js';
import {createCinemaAudio} from './cinema-audio.js';

const $=s=>document.querySelector(s),forms=Object.fromEntries(FORMS.map(f=>[f.id,f])),host=$('#canvas');
const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),software=debug?/swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):false;
renderer.setPixelRatio(software?.8:Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;host.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.05,180),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=false;controls.enabled=true;controls.maxPolarAngle=Math.PI*.62;controls.minDistance=2;controls.maxDistance=65;
scene.add(new T.HemisphereLight(0xfff1db,0x274879,2));const key=new T.DirectionalLight(0xffe6c7,3);key.position.set(-3,7,6);scene.add(key);const rim=new T.DirectionalLight(0x77bfff,2);rim.position.set(5,4,-3);scene.add(rim);
const effects=createCinemaEffects(scene),signature=createSignatureEffects(scene),morph=createMorphCloud(),post=createCinemaPost(renderer,{antialias:!software}),audio=createCinemaAudio();scene.add(morph.mesh);
const cache=new Map(),warmed=new Set();let config=SCENES[2],actors=null,intermediates=[],elapsed=0,playing=false,loading=false,speed=1,playlist=false,requestId=0,ready=false,lastPhase='',fxValues={},living=false,lifeTime=0;
$('#scenes').innerHTML=SCENES.map((s,i)=>`<button class="scene-card" data-scene="${s.id}" aria-pressed="false"><span class="card-no">0${i+1}</span><span><strong>${s.label}</strong><span class="route">${forms[s.from].name} → ${forms[s.to].name}</span></span><span class="card-duration">${s.duration.toFixed(1)}s</span></button>`).join('');
$('#beats').innerHTML=BEATS.map(b=>`<span class="beat" data-beat="${b.label}">${b.label}</span>`).join('')+'<span class="beat" data-beat="大招">大招</span><span class="local-note">本地演出 · 进化后自动释放大招</span>';

function resetCamera(){
 if(!actors)return;
 // One fixed overview covers the evolving bodies. Playback never owns the
 // camera: only entering a new scene or this explicit reset establishes a view.
 const cast=[actors.from,actors.to,...intermediates],h=Math.max(...cast.map(a=>a.height)),gaia=config.signature.kind==='gaia';
 const radius=Math.max(...cast.map(a=>Math.hypot(a.dimensions.x,a.dimensions.z)*.5));
 const top=h*(gaia?1.52:1.15),narrow=camera.aspect<1;
 const target=new T.Vector3(0,top*(narrow?.34:.43),0),dir=new T.Vector3(Math.sin(.66),.10,Math.cos(.66)).normalize();
 const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),dir).normalize(),up=new T.Vector3().crossVectors(dir,right),tan=Math.tan(T.MathUtils.degToRad(camera.fov*.5));
 let distance=h*1.6;
 for(let i=0;i<32;i++)for(const y of [0,top]){
  const a=i*Math.PI/16,v=new T.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius).sub(target),vertical=v.dot(up);
  distance=Math.max(distance,v.dot(dir)+Math.max(Math.abs(v.dot(right))/(tan*camera.aspect*.84),Math.abs(vertical)/(tan*(vertical<0?(narrow?.43:.63):.82))));
 }
 camera.position.copy(target).addScaledVector(dir,distance*1.04);camera.zoom=1;camera.updateProjectionMatrix();
 controls.target.copy(target);controls.minDistance=h*.35;controls.maxDistance=Math.min(camera.far*.75,distance*3);
 camera.lookAt(target);
 if(!controls.update()&&!loading)frame();
}
function syncUI(p){
 $('#timeline').value=elapsed;$('#time').textContent=`${elapsed.toFixed(1).padStart(4,'0')} / ${config.duration.toFixed(1)}`;
 $('#play').textContent=playing?'Ⅱ 暂停演出':elapsed>=config.duration?'▶ 再看一次':elapsed>0?'▶ 继续播放':'▶ 播放进化';
 const specialTime=elapsed-config.attackStart,isSpecial=specialTime>=0&&specialTime<=config.signature.duration;
 const phase= specialTime>=0?{label:living?'待机':isSpecial?'大招':'收势',at:1.1}:beatAt(p);
 const status=isSpecial?config.signature.name+' · '+signaturePhase(config.to,specialTime):effects.resonance.state.visible?(effects.resonance.state.stage||phase.label):phase.label;
 if(status!==lastPhase){$('#phase-label').textContent=status;document.querySelectorAll('[data-beat]').forEach(b=>{b.classList.toggle('active',b.dataset.beat===phase.label);b.classList.toggle('done',(BEATS.find(x=>x.label===b.dataset.beat)?.at??1.1)<phase.at);});lastPhase=status;}
 const word=pulse(p,.215,.27,.365,.425);$('#evolution-word').style.opacity=word;$('#evolution-word').style.transform=`translateY(${(1-word)*9}px)`;
 const source=config.kind==='growth'?pulse(p,.125,.17,.26,.32):pulse(p,.202,.23,.29,.35),target=smooth(.82,.885,p),f=target>.001?forms[config.to]:forms[config.from],alpha=Math.max(source,target);
 $('#caption-name').textContent=isSpecial?config.signature.name:f.name;$('#caption-en').textContent=isSpecial?f.name+' / SIGNATURE MOVE':f.en;$('#caption-level').textContent=isSpecial?`${f.stage} · ${signaturePhase(config.to,specialTime)}`:target>.001?`${f.stage} · ${config.label}完成`:f.stage;
 $('#caption').style.opacity=alpha;$('#caption').style.transform=`translateY(${(1-alpha)*14}px)`;
}
function frame(warm=false){
 if(!actors||(loading&&!warm))return;const p=evolutionProgress(config,elapsed),specialTime=elapsed-config.attackStart;
 const spin=.06+Math.PI*2*smooth(.305,.76,p);for(const actor of [actors.from,actors.to,...intermediates])actor.c.rig.visible=false;
 if(specialTime>=0){
  if(specialTime<=config.signature.duration)actors.to.special(specialTime,.06);else actors.to.idle(specialTime-config.signature.duration+lifeTime,.06);
 }else if(config.kind==='warp'){
  if(p<.345){actors.from.pose(elapsed,p,'source',spin);if(p<.20)actors.from.c.rig.visible=false;}
  else if(p<.445)intermediates[0].hologram(elapsed,.25+(p-.345)*11);
  else if(p>=.475&&p<.548)intermediates[1].hologram(elapsed,.65+(p-.475)*9);
  else if(p>=.558)actors.to.pose(elapsed,p,'target',.06+Math.PI*2*(1-smooth(.558,.65,p)));
 }else{
  if(p<.445){actors.from.pose(elapsed,p,'source',spin);if(config.kind!=='growth'&&p<.20)actors.from.c.rig.visible=false;}
  if(p>=.475)actors.to.pose(elapsed,p,'target',spin);
 }
 morph.update(p,elapsed,spin,config.kind==='growth'||config.kind==='normal');
 fxValues=effects.update(elapsed+lifeTime,p,camera,specialTime>=0&&specialTime<config.signature.end?1:0)||{};
 signature.update(actors.to.c,'special',Math.max(0,specialTime),specialTime>=0&&specialTime<=config.signature.duration);
 syncUI(p);post.render(scene,camera,{...fxValues,time:elapsed+lifeTime});
}
function pause(){playing=false;living=false;audio.stop();frame();}
function play(){if(loading||!actors)return;if(elapsed>=config.duration)elapsed=0;living=false;lifeTime=0;playing=true;audio.stop();frame();previous=performance.now();}
function replay(){if(loading)return;elapsed=0;living=false;lifeTime=0;playing=true;audio.stop();frame();previous=performance.now();}
function seek(time){if(loading)return;elapsed=Math.max(0,Math.min(config.duration,Number(time)||0));living=false;lifeTime=0;audio.stop();frame();}
function releaseSpecial(){if(loading||!actors)return;elapsed=config.attackStart;living=false;lifeTime=0;playing=true;audio.stop();frame();previous=performance.now();}
function setPlaylist(value){playlist=value;$('#playlist').setAttribute('aria-pressed',String(value));$('#playlist').textContent=value?'停止连播':'连播全部';}
async function getActor(id){if(!cache.has(id))cache.set(id,createCinemaActor(id,window.EVOLUTION_ASSETS[id]).then(actor=>{scene.add(actor.c.rig);actor.c.rig.visible=false;return actor;}).catch(e=>{cache.delete(id);throw e;}));return cache.get(id);}
async function select(id,{autoplay=true,keepPlaylist=false}={}){
 const next=SCENES.find(s=>s.id===id);if(!next)throw new Error('Unknown evolution scene: '+id);
 const request=++requestId;loading=true;playing=false;living=false;ready=false;audio.stop();if(!keepPlaylist)setPlaylist(false);
 $('#loading').hidden=false;$('#loading-text').textContent=`正在准备 ${forms[next.to].name} 的进化与大招…`;$('#error').hidden=true;$('#play').disabled=$('#replay').disabled=$('#special').disabled=$('#camera-reset').disabled=true;controls.enabled=false;
 try{
  const [from,to,...middle]=await Promise.all([getActor(next.from),getActor(next.to),...(next.kind==='warp'?['greymon','metalgreymon'].map(getActor):[])]);if(request!==requestId)return;
  if(actors)for(const a of [actors.from,actors.to,...intermediates])a.c.rig.visible=false;
  actors={from,to};intermediates=middle;config=next;from.configure(next.fromHeight,next.color,next.kind);to.configure(next.toHeight,next.color,next.kind);intermediates.forEach((a,i)=>a.configure(i?4.8:4.3,next.color,'warp'));morph.configure(from,to,next);effects.configure(next);
  elapsed=0;lifeTime=0;resetCamera();
  $('#scene-index').textContent=`0${SCENES.indexOf(next)+1} / 05 · ${next.label}`;$('#scene-title').textContent=`${forms[next.from].name} → ${forms[next.to].name}`;$('#scene-subtitle').textContent=next.subtitle;$('#evolution-word').textContent=next.word+'！';
  $('#timeline').max=next.duration;document.documentElement.style.setProperty('--accent',next.accent);document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===id)));
  $('#special').title=`释放${next.signature.name} · F`;
  // Upload each body's skin buffers and compile every effect behind the
  // loading cover. The first crest-to-character cut must never do this work.
  if(!warmed.has(id)){
   const moments=[0,.04,.10,.24,.38,.51,.62,.86].map(p=>evolutionTime(next,p));
   if(next.crestDuration)moments.push(2.08,next.crestDuration+.7);
   moments.push(next.attackStart+Math.min(2.2,next.signature.release-.1),next.attackStart+next.signature.release+.35,next.attackStart+next.signature.end-.15);
   for(const time of moments){if(request!==requestId)return;elapsed=time;frame(true);await renderer.compileAsync(scene,camera);await new Promise(requestAnimationFrame);}
   if(request!==requestId)return;warmed.add(id);
  }
  elapsed=0;loading=false;ready=true;playing=autoplay;lastPhase='';controls.enabled=true;$('#loading').hidden=true;$('#play').disabled=$('#replay').disabled=$('#special').disabled=$('#camera-reset').disabled=false;frame();previous=performance.now();
  return config;
 }catch(e){if(request!==requestId)return;loading=false;$('#loading').hidden=true;$('#error').hidden=false;$('#error').textContent='场景未能载入，请重新选择片段。'+e.message;console.error(e);throw e;}
}
function advance(dt){
 if(loading||!actors)return;
 if(playing){elapsed=Math.min(config.duration,elapsed+Math.max(0,dt)*speed);audio.update(elapsed,config,playing,speed);if(elapsed>=config.duration){playing=false;living=true;audio.stop();if(playlist){const n=SCENES.indexOf(config)+1;if(n<SCENES.length){select(SCENES[n].id,{keepPlaylist:true});return;}else setPlaylist(false);}}}
 else if(living)lifeTime+=Math.max(0,dt);
 frame();
}
$('#play').onclick=()=>playing?pause():play();$('#replay').onclick=replay;$('#special').onclick=releaseSpecial;$('#timeline').oninput=e=>{const requested=e.target.value;pause();seek(requested);};$('#speed').onchange=e=>{speed=Number(e.target.value);audio.stop();};
$('#camera-reset').onclick=()=>resetCamera();
$('#sound').onclick=async()=>{try{const enabled=await audio.toggle();$('#sound').setAttribute('aria-pressed',String(enabled));$('#sound').textContent=enabled?'音效：开':'音效：关';}catch(e){$('#sound').textContent='音效不可用';console.warn(e);}};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#player').requestFullscreen();}catch{}};
$('#playlist').onclick=()=>{if(playlist)setPlaylist(false);else{setPlaylist(true);select(SCENES[0].id,{keepPlaylist:true});}};
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>select(b.dataset.scene));
window.addEventListener('keydown',e=>{if(e.target.matches('input,select,button')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();playing?pause():play();}if(e.key.toLowerCase()==='r')replay();if(e.key.toLowerCase()==='f')releaseSpecial();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
controls.addEventListener('change',()=>{if(actors&&!loading)frame();});
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());post.resize(size.x,size.y);morph.uniforms.size.value=renderer.getPixelRatio()*.16;frame();}
new ResizeObserver(resize).observe(host);resize();
// The timeline uses wall time: a slow frame must not stretch an 18-second
// sequence into a minute, nor put synthesized audio ahead of the animation.
let previous=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.max(0,(now-previous)/1000);previous=now;if((playing||living)&&!loading)advance(dt);});
window.evolutionCinema={T,renderer,scene,camera,controls,post,effects,morph,signature,audio,select,play,pause,replay,seek,releaseSpecial,advance,resetCamera,scenes:SCENES,evolutionTime,evolutionProgress,get ready(){return ready;},get actors(){return actors;},get intermediates(){return intermediates;},get state(){return {id:config.id,time:elapsed,duration:config.duration,evolutionDuration:config.evolutionDuration,resonanceDuration:config.resonanceDuration,progress:evolutionProgress(config,elapsed),attackStart:config.attackStart,signature:config.signature.name,playing,living,lifeTime,loading,freeCamera:true,speed,playlist,phase:elapsed>=config.attackStart?(living?'待机':'大招'):beatAt(evolutionProgress(config,elapsed)).label};}};
const initial=new URLSearchParams(location.search).get('scene'),autoplay=new URLSearchParams(location.search).get('autoplay')!=='0'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
await select(SCENES.some(s=>s.id===initial)?initial:SCENES[2].id,{autoplay});
