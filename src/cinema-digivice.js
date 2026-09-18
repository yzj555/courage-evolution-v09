import * as T from 'three';
import {drawDigimoji,DEVICE_INSCRIPTION} from './cinema-digimoji.js';
import {smooth} from './cinema-config.js';
import {createDataLightMaterial} from './cinema-data-light.js';

// Original Adventure casing proportions and controls, checked against the
// 1999 anime close-up: https://i.imgur.com/fADaNTu.jpg
// Screen close-up: https://media.tenor.com/BuiOhRTFpEsAAAAM/digimon-digivolution.gif
// Front art is drawn locally; the beveled shell, antenna and buttons have depth.
function bodyPath(p){
 p.moveTo(272,132);p.quadraticCurveTo(251,132,238,153);p.lineTo(220,181);
 p.quadraticCurveTo(205,201,187,216);p.lineTo(146,244);p.quadraticCurveTo(125,258,120,281);
 p.lineTo(105,323);p.quadraticCurveTo(98,340,102,364);p.lineTo(122,437);
 p.quadraticCurveTo(130,461,146,477);p.lineTo(155,545);p.quadraticCurveTo(157,573,182,580);
 p.lineTo(224,590);p.quadraticCurveTo(239,594,251,608);p.quadraticCurveTo(260,619,279,619);
 p.lineTo(361,619);p.quadraticCurveTo(380,619,389,608);p.quadraticCurveTo(401,594,416,590);
 p.lineTo(458,580);p.quadraticCurveTo(483,573,485,545);p.lineTo(494,477);
 p.quadraticCurveTo(510,461,518,437);p.lineTo(538,364);p.quadraticCurveTo(542,340,535,323);
 p.lineTo(520,281);p.quadraticCurveTo(515,258,494,244);p.lineTo(453,216);
 p.quadraticCurveTo(435,201,420,181);p.lineTo(402,153);p.quadraticCurveTo(389,132,368,132);p.closePath();
}
function strokePath(g,d,color,width){g.strokeStyle=color;g.lineWidth=width;g.stroke(new Path2D(d));}

export function createDigiviceTexture(activated=false){
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1520;
 const g=canvas.getContext('2d');g.scale(2,2);g.lineJoin='round';g.lineCap='round';
 // Cel-shaded lip and recessed seams, with a broad pearl-white front face.
 g.beginPath();bodyPath(g);g.fillStyle=activated?'#c7792f':'#87ccc6';g.fill();g.strokeStyle=activated?'#634324':'#263d45';g.lineWidth=5;g.stroke();
 g.save();g.clip();g.translate(320,358);g.scale(.966,.965);g.translate(-320,-364);
 g.beginPath();bodyPath(g);g.fillStyle=activated?'#f7ac52':'#d7eee9';g.fill();g.strokeStyle=activated?'#a6642c':'#719fa2';g.lineWidth=3;g.stroke();g.restore();
 const faceLight=g.createLinearGradient(180,170,480,550);faceLight.addColorStop(0,activated?'#ffcd7c':'#f1faf0');faceLight.addColorStop(.50,activated?'#f8aa48':'#e3f5eb');faceLight.addColorStop(1,activated?'#dc8939':'#c5e9e5');
 g.save();g.translate(320,348);g.scale(.938,.930);g.translate(-320,-363);g.beginPath();bodyPath(g);g.fillStyle=faceLight;g.fill();g.restore();
 strokePath(g,'M296 134V170 M344 134V170 M227 566V590 M253 567V609 M387 567V609 M413 566V590','#526e75',2.5);
 strokePath(g,'M304 134V164 M336 134V164 M235 567V596 M405 567V596','#f7fff5',3);
 // Two small switches on each side, rather than four invented blue fins.
 for(const s of [-1,1])for(const y of [317,391]){
  g.save();g.translate(320,y);g.scale(s,1);
  const p=new Path2D('M-208 -15L-175 -19L-170 11L-200 16Z');
  g.fillStyle='#b1d9d7';g.fill(p);g.strokeStyle='#304f5b';g.lineWidth=3;g.stroke(p);
  strokePath(g,'M-204 -11L-179 -14L-176 6','#f0fff6',3);g.restore();
 }
 // Circular ring, square green LCD, and the repeated Digital Monster inscription.
 g.fillStyle='#769fa2';g.beginPath();g.arc(320,369,170,0,Math.PI*2);g.fill();
 g.strokeStyle='#294d56';g.lineWidth=3;g.stroke();
 g.fillStyle='#bfdcd5';g.beginPath();g.arc(320,363,162,0,Math.PI*2);g.fill();
 g.strokeStyle='#edfbec';g.lineWidth=2;g.stroke();
 [...DEVICE_INSCRIPTION].forEach((kana,i)=>{
  const a=-Math.PI/2+(i+.5)/DEVICE_INSCRIPTION.length*Math.PI*2;
  g.save();g.translate(320+Math.cos(a)*142,363+Math.sin(a)*142);g.rotate(a+Math.PI/2);
  drawDigimoji(g,kana,-20,-20,40,'#486660');g.restore();
 });
 g.fillStyle='#173a34';g.beginPath();g.roundRect(205,248,230,230,10);g.fill();
 g.strokeStyle='#749a8c';g.lineWidth=3;g.stroke();
 g.fillStyle='#77a784';g.beginPath();g.roundRect(213,256,214,214,5);g.fill();
 strokePath(g,'M215 465V258H423','#c0dac0',2);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}

export function addDigiviceDepth(device){
 const shape=new T.Shape(),pos=(x,y)=>[(x-320)/640,(380-y)/640];
 bodyPath({moveTo:(x,y)=>shape.moveTo(...pos(x,y)),lineTo:(x,y)=>shape.lineTo(...pos(x,y)),quadraticCurveTo:(x,y,a,b)=>shape.quadraticCurveTo(...pos(x,y),...pos(a,b)),closePath:()=>shape.closePath()});
 const geo=new T.ExtrudeGeometry(shape,{depth:.105,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.006,bevelThickness:.006,curveSegments:14});geo.translate(0,0,-.117);
 const shell=new T.Mesh(geo,new T.MeshBasicMaterial({color:0x74b5b2,side:T.DoubleSide}));shell.name='Digivice_Beveled_Shell';shell.renderOrder=29;device.add(shell);
 const seam=new T.LineSegments(new T.EdgesGeometry(geo,35),new T.LineBasicMaterial({color:0x274551,transparent:true,opacity:.76}));seam.renderOrder=29;device.add(seam);
 const antenna=new T.Mesh(new T.CylinderGeometry(.022,.025,.125,6),new T.MeshBasicMaterial({color:0x384551}));
 antenna.position.set(...pos(454,151),-.052);antenna.rotation.z=-.38;antenna.name='Digivice_Antenna';antenna.renderOrder=29;device.add(antenna);
 const tip=new T.Mesh(new T.CylinderGeometry(.019,.022,.013,6),new T.MeshBasicMaterial({color:0x637480}));tip.position.y=.062;antenna.add(tip);tip.renderOrder=29;
 for(const [index,[x,y,r]] of [[320,188,28],[247,536,26],[393,536,26]].entries()){
  const button=new T.Group();button.name='Digivice_Button_'+index;button.position.set(...pos(x,y),.002);device.add(button);
  const rim=new T.Mesh(new T.CylinderGeometry(r/640,r/640,.018,48),new T.MeshBasicMaterial({color:0x21384e}));rim.rotation.x=Math.PI/2;rim.position.z=.009;rim.renderOrder=31;button.add(rim);
  const cap=new T.Mesh(new T.SphereGeometry(1,32,12),new T.MeshBasicMaterial({color:0x526ead}));cap.scale.set((r-4)/640,(r-4)/640,.010);cap.position.z=.020;cap.renderOrder=32;button.add(cap);
  const inset=new T.Mesh(new T.TorusGeometry((r-12)/640,.0024,6,40),new T.MeshBasicMaterial({color:0x2b456c}));inset.position.z=.030;inset.renderOrder=33;button.add(inset);
  const shine=new T.Mesh(new T.TorusGeometry((r-6)/640,.0018,6,20,Math.PI*.65),new T.MeshBasicMaterial({color:0x9bb2d9}));shine.rotation.z=Math.PI*.3;shine.position.z=.026;shine.renderOrder=33;button.add(shine);
 }
 device.userData={design:'Adventure 1999 Digivice',inscription:DEVICE_INSCRIPTION,screen:{x:0,y:-17,halfSize:104},controls:3};
 // Keep casing and controls in the same transparent render queue as the face,
 // so the halo behind the device cannot tint or cover the blue buttons.
 device.traverse(part=>{if(part.material){part.material.fog=false;part.material.toneMapped=false;part.material.transparent=true;}});
 return device;
}

export function createDigiviceEmission(device){
 const count=32,spacing=.040,screenLength=193/640,geometry=new T.BoxGeometry(.162,.026,.011),alpha=new Float32Array(count);
 geometry.setAttribute('aStripOpacity',new T.InstancedBufferAttribute(alpha,1));
 const material=createDataLightMaterial();
 const mesh=new T.InstancedMesh(geometry,material,count);mesh.name='Data_Strips_Emitted_From_LCD';mesh.renderOrder=35;mesh.frustumCulled=false;
 mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);device.add(mesh);
 const object=new T.Object3D(),origin=new T.Vector3(0,-77/640,.014);let state={active:false};
 function update(time,charge,push,scale){
  const power=smooth(.12,.70,time),launch=smooth(.66,.94,time),fadeOut=1-smooth(1.84,2.0,time);mesh.visible=power>.001&&fadeOut>.001;
  if(!mesh.visible){state={active:false};return;}
  // One strip batch owns both the LCD rows and the launched stream. Every row
  // follows the same spacing and phase across the upper screen edge; there is
  // no second, unrelated pattern in the screen shader.
  const travel=time*.43,front=screenLength+Math.max(0,time-.66)*.85,maxDistance=Math.min(.88,1.72/scale);
  let screenBars=0,emittedBars=0;
  for(let i=0;i<count;i++){
   const q=(i*spacing+travel)%(count*spacing),outside=Math.max(0,q-screenLength);
   object.position.copy(origin);object.position.y+=q;
   object.position.z+=Math.min(outside,maxDistance)*.68*smooth(0,.10,outside);
   object.rotation.set(0,0,0);object.scale.set(1,1,1);object.updateMatrix();mesh.setMatrixAt(i,object.matrix);
   const end=1-smooth(front-.04,front+.02,q),release=q>screenLength?launch:1;
   alpha[i]=power*fadeOut*release*end*(1-smooth(screenLength+.65,screenLength+.87,q));
   if(alpha[i]>.02){if(q<=screenLength)screenBars++;else emittedBars++;}
  }
  mesh.instanceMatrix.needsUpdate=true;geometry.attributes.aStripOpacity.needsUpdate=true;
  state={active:true,power,origin:origin.toArray(),maxDistance,visibleBars:screenBars+emittedBars,screenBars,emittedBars,spacing,travel,screenLength,direction:'up',push};
 }
 return {mesh,update,get state(){return state;}};
}
