import {SIGNATURES} from './signature-config.js';
export const RESONANCE={duration:2.0,fullView:1.15,settle:.32,chargeStart:.12,chargeEnd:1.28,pulses:[.46,1.04,1.43]};
export const CREST_RESONANCE={tagDuration:2.5,deviceDuration:2.25,pulses:[.75,1.40,2.08],cut:[2.28,2.48,2.52,2.70]};
export const DATA_PASSAGE={start:.075,end:.20,extra:.65};
export const SCENES = [
 {id:'botamon-koromon',from:'botamon',to:'koromon',label:'幼年成长',kind:'growth',duration:8.8,fromHeight:1.65,toHeight:2.2,color:0xf6c3dd,accent:'#efb8d0',word:'成长',subtitle:'小小的生命，开始改变。'},
 {id:'koromon-agumon',from:'koromon',to:'agumon',label:'成长进化',kind:'growth',duration:10.2,fromHeight:2.0,toHeight:3.1,color:0xffc579,accent:'#f5c57d',word:'进化',subtitle:'新的轮廓，在光中苏醒。'},
 {id:'agumon-greymon',from:'agumon',to:'greymon',label:'进化',kind:'normal',duration:14.0,fromHeight:2.8,toHeight:5.5,color:0xffa84a,accent:'#ffbd71',word:'进化',subtitle:'回应勇气，唤醒更强的自己。'},
 {id:'greymon-metalgreymon',from:'greymon',to:'metalgreymon',label:'超进化',kind:'super',duration:16.2,fromHeight:4.6,toHeight:5.4,color:0xffc75b,accent:'#efc96f',word:'超进化',subtitle:'勇气的纹章，点亮钢铁之翼。'},
 {id:'agumon-wargreymon',from:'agumon',to:'wargreymon',label:'跃迁进化',kind:'warp',duration:18.2,fromHeight:2.8,toHeight:4.35,color:0xffd77d,accent:'#ffe1a0',word:'跃迁进化',subtitle:'穿越光芒，抵达勇气的终点。'}
];

for(const [i,s] of SCENES.entries()){
 s.evolutionBase=[6.6,7.4,11.0,13.0,16.0][i];
 s.crestDuration=s.kind==='super'||s.kind==='warp'?CREST_RESONANCE.tagDuration:0;
 s.resonanceDuration=s.kind==='growth'?0:s.crestDuration?CREST_RESONANCE.tagDuration+CREST_RESONANCE.deviceDuration:RESONANCE.duration;
 s.resonanceExtra=s.resonanceDuration?s.resonanceDuration-s.evolutionBase*.075:0;
 s.tunnelExtra=s.resonanceDuration?DATA_PASSAGE.extra:0;
 s.tunnelDuration=s.resonanceDuration?s.evolutionBase*(DATA_PASSAGE.end-DATA_PASSAGE.start)+s.tunnelExtra:0;
 s.evolutionDuration=s.evolutionBase+s.resonanceExtra+s.tunnelExtra;s.attackStart=s.evolutionDuration-.24;
 s.signature=SIGNATURES[s.to];s.duration=s.attackStart+s.signature.duration+1.4;
}
export const JAPANESE={botamon:'ボタモン',koromon:'コロモン',agumon:'アグモン',greymon:'グレイモン',metalgreymon:'メタルグレイモン',wargreymon:'ウォーグレイモン'};

export const BEATS = [
 {at:0,label:'共鸣'}, {at:.14,label:'蓄光'}, {at:.34,label:'进化'}, {at:.64,label:'成形'}, {at:.80,label:'亮相'}
];
export const clamp=x=>Math.max(0,Math.min(1,x));
// Device and passage have independent clocks; later transformation and attacks
// keep their speed. The inverse mapping also makes every seek deterministic.
export function evolutionProgress(s,time){
 if(s.resonanceDuration){
  if(time<s.resonanceDuration)return clamp(time/s.resonanceDuration*DATA_PASSAGE.start);
  if(time<s.resonanceDuration+s.tunnelDuration)return DATA_PASSAGE.start+(time-s.resonanceDuration)/s.tunnelDuration*(DATA_PASSAGE.end-DATA_PASSAGE.start);
 }
 return clamp((time-s.resonanceExtra-s.tunnelExtra)/s.evolutionBase);
}
export function evolutionTime(s,p){
 if(s.resonanceDuration){
  if(p<DATA_PASSAGE.start)return p/DATA_PASSAGE.start*s.resonanceDuration;
  if(p<DATA_PASSAGE.end)return s.resonanceDuration+(p-DATA_PASSAGE.start)/(DATA_PASSAGE.end-DATA_PASSAGE.start)*s.tunnelDuration;
 }
 return p*s.evolutionBase+s.resonanceExtra+s.tunnelExtra;
}
export const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
export const pulse=(x,a,b,c,d)=>smooth(a,b,x)*(1-smooth(c,d,x));
export const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453123;return n-Math.floor(n);};
export function beatAt(progress){return BEATS.filter(b=>progress>=b.at).at(-1)||BEATS[0];}
