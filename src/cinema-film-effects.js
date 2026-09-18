import * as T from 'three';
import {smooth,pulse,random,RESONANCE,CREST_RESONANCE} from './cinema-config.js';
import {particleBatch,streakBatch,shockMaterial} from './skill-vfx-primitives.js';
import {createResonance} from './cinema-resonance.js';
import {createDataTunnel} from './cinema-data-tunnel.js';
import {createDigimojiAtlas,DIGIMOJI_GRID,DIGIMOJI_KANA} from './cinema-digimoji.js';
import {createDigiviceTexture} from './cinema-digivice.js';
import {DATA_LIGHT} from './cinema-data-light.js';

export function createCinemaEffects(scene){
 const root=new T.Group();root.name='Original_Film_Evolution_Space';scene.add(root);
 const glyphs=createDigimojiAtlas();
 const background=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
  uniforms:{time:{value:0},progress:{value:0},mode:{value:1},aspect:{value:1},glyphs:{value:glyphs},glyphGrid:{value:DIGIMOJI_GRID},glyphCount:{value:DIGIMOJI_KANA.length},attack:{value:0},crestShot:{value:0},crestLight:{value:0}},
  vertexShader:'varying vec2 vUV;void main(){vUV=uv;gl_Position=vec4(position.xy,.999,1.);}',
  fragmentShader:`varying vec2 vUV;uniform float time,progress,mode,aspect,attack,glyphGrid,glyphCount,crestShot,crestLight;uniform sampler2D glyphs;
   float hash(vec2 x){return fract(sin(dot(x,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
   void main(){vec2 q=(vUV-.5)*vec2(aspect,1.);float r=length(q),a=atan(q.y,q.x),p=progress;
    float intro=(1.-smoothstep(.172,.195,p))*step(.5,mode);
    float depth=-log(max(r,.013))*2.25-time*1.2,angle=a/6.283185*18.+time*.45;
    vec2 tile=vec2(fract(angle),fract(depth));float cell=mod(floor(angle)+floor(depth)*5.,glyphCount);
    vec2 cellUV=vec2(mod(cell,glyphGrid),glyphGrid-1.-floor(cell/glyphGrid));
    float symbol=texture2D(glyphs,(cellUV+tile)/glyphGrid).a;
    float tunnel=symbol*(.14+.35*smoothstep(.01,.45,r))*(1.-smoothstep(.65,1.25,r));vec3 c=vec3(.001,.006,.014);
    if(mode<.5)c=vec3(.038,.013,.045)*(1.-r*.5)+vec3(.23,.15,.23)*exp(-r*r*12.)*.25;
    else if(mode<1.5)c=vec3(.002,.009,.026)+vec3(.008,.06,.12)*exp(-r*r*4.)+vec3(.06,.20,.35)*tunnel*.30;
    else if(mode<2.5){float scroll=-log(max(r,.014))*3.-time*.42;float radial=pow(.5+.5*sin(a*32.+time*.1),70.),circle=pow(.5+.5*sin(scroll*6.283185),55.);c=vec3(.001,.006,.045)+vec3(.015,.10,.46)*(radial*.35+circle*.25)+vec3(.045,.23,.65)*exp(-r*r*10.)*.55;}
    else{vec2 flow=q*3.+vec2(time*.10,-time*.20);float cloud=noise(flow)*.53+noise(flow*2.1+3.)*.30+noise(flow*4.7)*.17;
     c=mix(vec3(.035,.001,.014),vec3(.80,.065,.002),smoothstep(.20,.79,cloud));
     vec2 cells=q*vec2(20.,25.)+vec2(time*.9,-time*1.4),uv=fract(cells);float block=hash(floor(cells)),edge=smoothstep(.03,.12,uv.x)*(1.-smoothstep(.86,.98,uv.x))*smoothstep(.03,.12,uv.y)*(1.-smoothstep(.86,.98,uv.y));
     c+=vec3(.37,.095,.003)*edge*smoothstep(.65,1.,block)*(.3+cloud*.7);c+=vec3(.13,.036,.001)*exp(-r*r*7.);c*=1.-attack*.45;}
    float entering=smoothstep(.067,.094,p);vec3 digital=mix(vec3(.001,.014,.004),vec3(.001,.005,.004),entering);
    vec2 passage=q-vec2(0.,.295);digital+=vec3(.011,.052,.025)*exp(-dot(passage,passage)*13.)*entering;c=mix(c,digital,intro);
    vec3 crestSpace=vec3(.010,.004,.002)+vec3(.08,.025,.003)*exp(-r*r*7.)*(.25+crestLight*.70);c=mix(c,crestSpace,crestShot);
    float rays=pow(max(0.,.5+.5*sin(a*54.+r*5.-time*1.2)),30.);c+=vec3(.10,.17,.3)*attack*rays*.17;c*=1.-smoothstep(.3,1.2,r)*.6;gl_FragColor=vec4(c,1.);
   }`}));background.frustumCulled=false;background.renderOrder=-100;root.add(background);
 const resonance=createResonance(createDigiviceTexture(),createDigiviceTexture(true)),{device,badge}=resonance;root.add(resonance.root);
 const dataTunnel=createDataTunnel(glyphs);root.add(dataTunnel.root);
 const disc=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  uniforms:{color:{value:new T.Color(0x73dfff)},power:{value:0},time:{value:0}},
  vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 p;uniform vec3 color;uniform float power,time;void main(){float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x),rim=exp(-pow((r-.83)/.018,2.)),ring=exp(-pow((r-.92)/.01,2.)),star=pow(.5+.5*sin(a*8.+time*.25),7.)*exp(-r*r*5.),core=exp(-r*r*8.);gl_FragColor=vec4(mix(color,vec3(1.),core*.8),(rim*.56+ring*.32+core*.6+star*.1)*power);}'}));disc.rotation.x=-Math.PI/2;disc.position.y=.012;root.add(disc);
 const beam=new T.Mesh(new T.CylinderGeometry(1,1,1,40,1,true),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  uniforms:{time:{value:0},power:{value:0},color:{value:new T.Color(0x68bfff)}},
  vertexShader:'varying vec2 vUV;void main(){vUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUV;uniform float time,power;uniform vec3 color;void main(){float vertical=pow(max(0.,.5+.5*sin(vUV.x*125.6637)),90.),scan=pow(max(0.,.5+.5*sin(vUV.y*40.-time*6.)),45.),cap=pow(max(0.,sin(vUV.y*3.14159)),.4);gl_FragColor=vec4(color,cap*power*(vertical*.35+scan*.015));}'}));root.add(beam);
 const particles=particleBatch(210,'ember'),halos=particleBatch(6,'glow'),streaks=streakBatch(150);for(const b of [particles,halos,streaks]){root.add(b.mesh);b.mesh.material.blending=T.AdditiveBlending;}
 const shocks=[];for(let i=0;i<3;i++){const r=new T.Mesh(new T.RingGeometry(.37,1.05,100),shockMaterial());r.rotation.x=-Math.PI/2;r.position.y=.01+i*.005;r.material.blending=T.AdditiveBlending;root.add(r);shocks.push(r);}
 const tmp=new T.Vector3(),tail=new T.Vector3();let cfg=null;
 function configure(config){cfg=config;const color=config.kind==='warp'?0xffbb37:config.kind==='growth'?config.color:0x82d9ff;disc.material.uniforms.color.value.set(color);beam.material.uniforms.color.value.set(color);for(const r of shocks)r.material.uniforms.color.value.set(color);}
 function update(time,p,camera,attack=0){
  if(!cfg)return {};const warp=cfg.kind==='warp',superEvo=cfg.kind==='super',growth=cfg.kind==='growth',h=cfg.toHeight,active=pulse(p,.20,.32,.72,.84),mode=growth?0:warp?3:superEvo?2:1;
  const u=background.material.uniforms;u.time.value=time;u.progress.value=p;u.mode.value=mode;u.aspect.value=camera.aspect;u.attack.value=attack;
  resonance.update(cfg,time,camera);
  u.crestShot.value=cfg.crestDuration?1-smooth(CREST_RESONANCE.tagDuration-.08,CREST_RESONANCE.tagDuration+.20,time):0;
  u.crestLight.value=resonance.state.tag?.charge||0;
  dataTunnel.update(cfg,p,camera);
  disc.visible=p>=.20;disc.scale.setScalar(h*(.57+active*.12));disc.material.uniforms.power.value=.12+active*1.4+attack*.14;disc.material.uniforms.time.value=time;
  beam.visible=!warp&&active>.001;beam.scale.set(h*.46,h*1.55,h*.46);beam.position.y=h*.67;beam.material.uniforms.time.value=time;beam.material.uniforms.power.value=active*(superEvo?1:.45);
  particles.begin();halos.begin();streaks.begin();const color=warp?0xffcd61:growth?cfg.color:0x82dfff;
  for(let i=0;i<105;i++){const v=(random(i+7)+time*.20)%1,a=i*2.399,r=h*(.22+random(i+54)*.43);tmp.set(Math.cos(a)*r,v*h*1.6,Math.sin(a)*r);const size=h*(.009+random(i+321)*.017);particles.add(tmp,size,size,color,active*Math.sin(v*Math.PI)*.7,i,random(i));}
  if(warp)for(let i=0;i<56;i++){const a=i*2.399,r=h*(.20+random(i+23)*.8),y=((time*.8+random(i))%1)*h*3-h*.5;tmp.set(Math.cos(a)*r,y,Math.sin(a)*r);tail.copy(tmp);tail.y-=h*(.45+random(i+13));streaks.add(tmp,tail,h*.015,0xffce52,active*.4);}
  const landing=pulse(p,.822,.84,.89,.97);for(let i=0;i<42;i++){const a=i*2.399,v=smooth(.83,.96,p),r=h*(.30+v*.9);tmp.set(Math.cos(a)*r,.08+random(i)*v*h*.45,Math.sin(a)*r);tail.copy(tmp).multiplyScalar(.87);streaks.add(tmp,tail,h*.01,color,landing*.7);}
  tmp.set(0,h*.45,0);halos.add(tmp,h*1.6,h*1.6,color,active*(warp?.06:.08));particles.end();halos.end();streaks.end();
  for(let i=0;i<3;i++){const v=(p-.832-i*.018)/.13,r=shocks[i];r.visible=v>0&&v<1;r.scale.setScalar(h*(.32+Math.max(0,v)*.88));r.material.uniforms.opacity.value=Math.max(0,1-v)*.62;r.material.uniforms.phase.value=time;}
  const deviceTime=(time-(cfg.crestDuration||0))/(cfg.crestDuration?CREST_RESONANCE.deviceDuration:RESONANCE.duration);
  const screenCut=growth?0:cfg.crestDuration?pulse(deviceTime,.83,.99,1.04,1.21)*.90:pulse(p,.062,.074,.078,.093)*.90;
  const handoff=growth?0:pulse(p,.166,.183,.193,.216)*.96,morphFlash=pulse(p,.429,.447,.464,.487)*(warp?.68:.80),warpCut=warp?pulse(p,.532,.548,.557,.574)*.62:0;
  const tunnelOpacity=dataTunnel.state.opacity||0,rush=(dataTunnel.state.progress||0)*tunnelOpacity;
  const emittedPower=resonance.state.emission?.power||0,dataGlow=Math.max(tunnelOpacity,emittedPower);
  return {flash:Math.max(screenCut,handoff,morphFlash,warpCut,resonance.state.flash||0),bloom:.10+active*.22+dataGlow*DATA_LIGHT.bloom,rush};
 }
 return {root,configure,update,background,resonance,dataTunnel,device,badge,disc,beam,particles,halos,streaks,shocks,get introVisible(){return resonance.state.visible;}};
}
