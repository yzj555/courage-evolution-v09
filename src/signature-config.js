// Timings are shared by the skeletal animation, VFX and playback controls.
export const SIGNATURES={
 botamon:{name:'酸性泡泡',kind:'bubbles',duration:4.6,release:1.10,end:3.65,color:0xc3df82,source:'botamon'},
 koromon:{name:'泡泡',kind:'bubbles',duration:4.8,release:1.15,end:3.85,color:0xe6b5d6,source:'koromon'},
 agumon:{name:'小型火焰',kind:'fire',duration:4.5,release:1.40,end:3.15,color:0xffa128,source:'agumon'},
 greymon:{name:'超级火焰',kind:'fire',duration:5.2,release:1.70,end:3.90,color:0xff782c,source:'greymon-first'},
 metalgreymon:{name:'究极破坏炮',kind:'missiles',duration:5.6,release:1.85,end:4.25,color:0xff9748,source:'metalgreymon-v'},
 wargreymon:{name:'盖亚能量炮',kind:'gaia',duration:6.6,release:3.25,end:5.15,color:0xffcb54,source:'wargreymon'}
};
export function signaturePhase(id,time){const s=SIGNATURES[id];return time<s.release?'蓄力':time<s.end?'释放':'收势';}
