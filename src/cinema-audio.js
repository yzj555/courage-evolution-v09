import {evolutionProgress,RESONANCE,CREST_RESONANCE} from './cinema-config.js';
// Optional local synthesis. No music, remote audio, or autoplay requirement.
export function createCinemaAudio(){
 let context=null,master=null,enabled=false,lastTime=-1,voices=[],noise=null;
 function stop(){for(const v of voices){try{v.stop();}catch{}}voices=[];lastTime=-1;}
 async function toggle(){enabled=!enabled;if(enabled){context??=new (window.AudioContext||window.webkitAudioContext)();if(!master){master=context.createGain();master.gain.value=.12;master.connect(context.destination);noise=context.createBuffer(1,context.sampleRate*3,context.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.sin(i*127.1+3)*43758.5%1)*.55;}
   await context.resume();}else stop();return enabled;}
 function tone(freq,duration,type='sine',end=freq,level=.5){const o=context.createOscillator(),g=context.createGain(),t=context.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start();o.stop(t+duration);voices.push(o);o.onended=()=>{o.disconnect();g.disconnect();voices=voices.filter(v=>v!==o);};}
 function whoosh(duration,up=true){const o=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain(),t=context.currentTime;o.buffer=noise;o.loop=true;f.type='bandpass';f.Q.value=.65;f.frequency.setValueAtTime(up?180:1800,t);f.frequency.exponentialRampToValueAtTime(up?4200:90,t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.45,t+duration*.55);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(f);f.connect(g);g.connect(master);o.start();o.stop(t+duration);voices.push(o);o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();voices=voices.filter(v=>v!==o);};}
 function update(time,config,playing,speed=1){if(!enabled||!context)return;if(!playing){if(lastTime>=0)stop();return;}if(lastTime<0){lastTime=time;return;}const duration=config.evolutionBase,p=evolutionProgress(config,time),old=evolutionProgress(config,lastTime);if(time<lastTime){stop();lastTime=time;return;}const crossed=a=>old<a&&p>=a,cue=t=>lastTime<t&&time>=t;
  if(config.resonanceDuration){
   const offset=config.crestDuration||0,stretch=offset?CREST_RESONANCE.deviceDuration/RESONANCE.duration:1;
   if(offset){
    CREST_RESONANCE.pulses.forEach((at,i)=>{if(cue(at)){const freq=[440,660,880][i];tone(freq,.55/speed,'sine',freq*1.03,.20+i*.05);tone(freq*1.5,.60/speed,'sine',freq*1.5,.10);}});
    if(cue(CREST_RESONANCE.cut[0]))whoosh(.48/speed);
   }
   RESONANCE.pulses.forEach((at,i)=>{if(cue(offset+at*stretch)){const freq=[660,880,1100][i],level=[.22,.28,.34][i];tone(freq,.40/speed,'sine',freq*1.5,level);tone(freq*.5,.50/speed,'sine',freq*.75,level*.4);}});
   if(cue(offset+(RESONANCE.fullView+.08)*stretch))whoosh(1.0*stretch/speed);
   if(cue(config.resonanceDuration+.08))whoosh(config.tunnelDuration*.84/speed);
  }else{if(crossed(.015))tone(880,.23,'sine',1320,.4);if(crossed(.055))tone(1320,.35,'sine',1760,.32);}
  if(crossed(.22)){tone(100,2.1/speed,'sine',420,.34);whoosh(duration*.25/speed);}
  if(crossed(.39)){tone(330,2.3/speed,'triangle',990,.17);tone(495,2.4/speed,'sine',1485,.14);}
  if(crossed(.73))whoosh(.9/speed,false);
  if(crossed(.775)){tone(75,1.8/speed,'sine',32,.75);tone(660,1.7/speed,'sine',660,.28);tone(990,2/speed,'sine',990,.2);tone(1320,2.1/speed,'sine',1320,.16);}
  const s=config.signature,begin=config.attackStart;
  if(cue(begin+.12)){if(s.kind==='bubbles')tone(460,.65/speed,'sine',1100,.3);else{tone(s.kind==='gaia'?95:140,s.release/speed,'sine',s.kind==='gaia'?620:380,.38);whoosh(Math.max(.5,s.release-.2)/speed);}}
  if(cue(begin+s.release)){if(s.kind==='bubbles'){tone(950,.22/speed,'sine',410,.34);tone(1200,.35/speed,'sine',650,.21);}else{whoosh(1.05/speed,false);tone(s.kind==='missiles'?105:65,1.25/speed,'triangle',32,.63);}}
  if(s.kind!=='bubbles'&&cue(begin+s.end-.3)){tone(52,1.1/speed,'sine',24,.7);whoosh(.65/speed,false);}
  lastTime=time;
 }
 return {toggle,stop,update,get enabled(){return enabled;},get activeVoices(){return voices.length;}};
}
