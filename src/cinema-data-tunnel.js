import * as T from 'three';
import {clamp,smooth,random} from './cinema-config.js';
import {DIGIMOJI_GRID,DIGIMOJI_KANA} from './cinema-digimoji.js';
import {createDataLightMaterial} from './cinema-data-light.js';

// Camera-space 3D geometry gives each layer its own perspective speed. All
// transforms depend on the timeline, so rewinding never leaves stale trails.
export function createDataTunnel(atlas){
 const root=new T.Group();root.name='Flying_Through_Digital_Code';root.visible=false;
 const sectors=12,count=20*sectors,geometry=new T.PlaneGeometry(.62,.62),glyphIndex=new Float32Array(count),fade=new Float32Array(count);
 // Stable sequences of real kana glyphs, with no procedural stroke generation.
 for(let i=0;i<count;i++)glyphIndex[i]=(i*13+Math.floor(i/sectors)*7)%DIGIMOJI_KANA.length;
 geometry.setAttribute('aGlyph',new T.InstancedBufferAttribute(glyphIndex,1));geometry.setAttribute('aFade',new T.InstancedBufferAttribute(fade,1));
 const glyphMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending,
  uniforms:{atlas:{value:atlas},atlasGrid:{value:DIGIMOJI_GRID},opacity:{value:0}},
  vertexShader:`attribute float aGlyph,aFade;varying vec2 vUV;varying float vGlyph,vFade;void main(){vUV=uv;vGlyph=aGlyph;vFade=aFade;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  // Round the interpolated instance ID before floor/mod: otherwise an ID such
  // as 40 can become 39.999996 and sample a different atlas row on some pixels.
  fragmentShader:`uniform sampler2D atlas;uniform float opacity,atlasGrid;varying vec2 vUV;varying float vGlyph,vFade;void main(){float id=floor(vGlyph+.5);vec2 cell=vec2(mod(id,atlasGrid),atlasGrid-1.-floor(id/atlasGrid));float ink=texture2D(atlas,(cell+vUV)/atlasGrid).a;if(ink<.01)discard;vec3 tint=mix(vec3(.12,.29,.19),vec3(.61,.84,.71),vFade);gl_FragColor=vec4(tint,ink*vFade*opacity*.85);}`
 });
 const glyphs=new T.InstancedMesh(geometry,glyphMaterial,count);glyphs.frustumCulled=false;glyphs.instanceMatrix.setUsage(T.DynamicDrawUsage);glyphs.renderOrder=-70;root.add(glyphs);
 const rungCount=28,rungGeometry=new T.BoxGeometry(1.48,.035,.23),rungAlpha=new Float32Array(rungCount);
 rungGeometry.setAttribute('aStripOpacity',new T.InstancedBufferAttribute(rungAlpha,1));
 const rungs=new T.InstancedMesh(rungGeometry,createDataLightMaterial(),rungCount);
 rungs.frustumCulled=false;rungs.instanceMatrix.setUsage(T.DynamicDrawUsage);rungs.renderOrder=-69;root.add(rungs);
 const lineCount=132,linePositions=new Float32Array(lineCount*6),lineColors=new Float32Array(lineCount*6),lineGeometry=new T.BufferGeometry();
 lineGeometry.setAttribute('position',new T.BufferAttribute(linePositions,3).setUsage(T.DynamicDrawUsage));lineGeometry.setAttribute('color',new T.BufferAttribute(lineColors,3));
 for(let i=0;i<lineCount;i++){const c=new T.Color().setRGB(.18+random(i)*.17,.45+random(i+38)*.45,.25+random(i+18)*.25);c.toArray(lineColors,i*6);c.clone().multiplyScalar(.12).toArray(lineColors,i*6+3);}
 const streaks=new T.LineSegments(lineGeometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));streaks.frustumCulled=false;streaks.renderOrder=-68;root.add(streaks);
 const object=new T.Object3D(),depths=new Float32Array(count);let state={visible:false};
 const upwardTilt=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.19);
 const wrap=(n,length)=>((n%length)+length)%length;
 const funnelRadius=depth=>2.85+.65*Math.pow(1-clamp((depth-2.2)/53),2);
 function update(config,p,camera){
  const opacity=smooth(.068,.084,p)*(1-smooth(.169,.198,p));root.visible=config.kind!=='growth'&&opacity>.001;
  if(!root.visible){state={visible:false};return state;}
  const u=clamp((p-.070)/.125),travel=8*u+42*u*u,roll=Math.sin(u*Math.PI)*.085;
  // Aim the passage above the viewer, following the upward LCD emission.
  // Pitch has no roll: every white bar stays horizontal, with a straight axis.
  root.quaternion.copy(camera.quaternion).multiply(upwardTilt);root.position.copy(camera.position);
  for(let i=0;i<count;i++){
   const layer=Math.floor(i/sectors),sector=i%sectors,depth=2.2+wrap(layer*2.65-travel,53),angle=sector/sectors*Math.PI*2+depth*.075+u*.35+roll;
   const radius=funnelRadius(depth);
   object.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,-depth);
   object.rotation.set(Math.sin(angle)*.12,-Math.cos(angle)*.12,angle-Math.PI/2);
   object.scale.setScalar(.82+random(i+11)*.23);object.updateMatrix();glyphs.setMatrixAt(i,object.matrix);depths[i]=depth;
   fade[i]=smooth(2.2,4.5,depth)*(1-smooth(34,55.2,depth))*(.56+random(i+17)*.32);
  }
  glyphs.instanceMatrix.needsUpdate=true;geometry.attributes.aFade.needsUpdate=true;glyphMaterial.uniforms.opacity.value=opacity;
  for(let i=0;i<rungCount;i++){
   // The light travels ahead and upward; the camera follows it through the code.
   const depth=1.8+wrap(i*1.88+travel*1.15,52.64);
   object.position.set(0,-1.13,-depth);object.rotation.set(0,0,0);
   rungAlpha[i]=smooth(1.8,3.0,depth)*(1-smooth(44,54.4,depth));object.scale.set(1,1,1);object.updateMatrix();rungs.setMatrixAt(i,object.matrix);
  }
  rungs.instanceMatrix.needsUpdate=true;rungGeometry.attributes.aStripOpacity.needsUpdate=true;rungs.material.uniforms.opacity.value=opacity;
  for(let i=0;i<lineCount;i++){
   const depth=1.8+wrap(random(i+181)*51-travel*(1.05+random(i)*.22),51),angle=i*2.399+u*.18+roll,radius=.7+random(i+88)*(funnelRadius(depth)-.7);
   const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius,length=.24+u*(1.0+random(i+91)*2.7);
   linePositions.set([x,y,-depth,x,y,-depth-length],i*6);
  }
  lineGeometry.attributes.position.needsUpdate=true;streaks.material.opacity=opacity*(.15+u*.39);
  state={visible:true,progress:u,travel,roll,opacity,glyphs:count,rungs:rungCount,streaks:lineCount,direction:'up',pitch:.19};return state;
 }
 return {root,glyphs,rungs,streaks,depths,update,get state(){return state;}};
}
