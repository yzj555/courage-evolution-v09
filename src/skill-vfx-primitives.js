import * as T from 'three';

const noise=`
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise3(p)*.57+noise3(p*2.03+7.)*.28+noise3(p*4.07+13.)*.15;}`;

export function plasmaMaterial(mode='gaia'){
 return new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{time:{value:0},opacity:{value:1},fire:{value:mode==='fire'?1:0}},
  vertexShader:`varying vec3 p;varying vec3 n;varying vec3 eye;uniform float time;uniform float fire;${noise}
  void main(){p=position;n=normalize(normalMatrix*normal);float flutter=fbm(position*4.+vec3(0,time*1.8,-time*2.4))-.5;
  vec3 shape=position*(1.+flutter*mix(.025,.18,fire));vec4 v=modelViewMatrix*vec4(shape,1.);eye=normalize(-v.xyz);gl_Position=projectionMatrix*v;}`,
  fragmentShader:`varying vec3 p;varying vec3 n;varying vec3 eye;uniform float time;uniform float opacity;uniform float fire;${noise}
  void main(){float facing=abs(dot(normalize(n),normalize(eye))),rim=pow(1.-facing,1.6);
  vec3 flow=p*mix(3.2,4.8,fire)+vec3(time*.30,-time*.75,-time*(.6+fire*1.9));
  float turbulence=fbm(flow+vec3(fbm(flow+4.))*1.6),detail=fbm(flow*2.2-time*.2);
  float filament=pow(1.-abs(sin(turbulence*17.+p.y*4.-time*2.0)),12.);
  float hot=clamp(.66+facing*.40+(turbulence-.5)*.72+filament*.23-rim*.42,0.,1.);
  vec3 ember=vec3(.95,.13,.018),orange=vec3(1.,.49,.045),gold=vec3(1.,.82,.22),white=vec3(1.,.993,.88);
  vec3 c=mix(ember,orange,smoothstep(.05,.45,hot));c=mix(c,gold,smoothstep(.36,.74,hot));c=mix(c,white,smoothstep(.68,.96,hot));
  c=mix(c,vec3(1.,.97,.62),filament*(1.-fire*.65)*.66);float edge=mix(1.,smoothstep(.17,.38,turbulence+facing*.40),fire);
  gl_FragColor=vec4(c,opacity*edge*(.93+.07*detail));}`
 });
}

export function flameTail(){
 const vertices=[],indices=[],rings=32,sides=28;
 for(let j=0;j<=rings;j++){const t=j/rings,r=Math.pow(1-t,.8)*(.77+.25*Math.sin(t*4));for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2;vertices.push(Math.cos(a)*r,Math.sin(a)*r,-t);if(j<rings&&i<sides){const k=j*(sides+1)+i;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,
  uniforms:{time:{value:0},opacity:{value:1}},
  vertexShader:`varying vec3 p;varying vec3 n;varying vec3 eye;uniform float time;${noise}
  void main(){p=position;float t=-p.z,a=atan(p.y,p.x);vec3 v=p;float curl=sin(a*3.+t*15.-time*10.)*.16+sin(a*7.-t*20.+time*8.)*.08;v.xy*=1.+curl;
  v.x+=sin(t*10.-time*9.)*t*.22;v.y+=cos(t*8.-time*7.)*t*.19;vec4 q=modelViewMatrix*vec4(v,1.);n=normalize(normalMatrix*normal);eye=normalize(-q.xyz);gl_Position=projectionMatrix*q;}`,
  fragmentShader:`varying vec3 p;varying vec3 n;varying vec3 eye;uniform float time;uniform float opacity;${noise}
  void main(){float t=-p.z,facing=abs(dot(normalize(n),normalize(eye)));vec3 flow=p*vec3(4.,4.,10.)+vec3(0.,0.,time*5.);float f=fbm(flow+vec3(fbm(flow+4.))*1.2);
  float heat=clamp((1.-t)*.42+f*.63+facing*.13,0.,1.);vec3 c=mix(vec3(.94,.075,.006),vec3(1.,.51,.036),smoothstep(.16,.56,heat));c=mix(c,vec3(1.,.96,.50),smoothstep(.54,.86,heat));
  float a=smoothstep(.15,.54,f+(1.-t)*.3)*(.86-t*.44)*(1.-smoothstep(.85,1.,t));if(a<.02)discard;gl_FragColor=vec4(c,a*opacity);}`
 });
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;return mesh;
}

// One draw call per layer, rather than hundreds of individual sprites.
// Offsets are billboarded in view space; sizes retain the character's scale.
export function particleBatch(capacity,kind='glow'){
 const g=new T.InstancedBufferGeometry(),plane=new T.PlaneGeometry(1,1);g.index=plane.index;g.setAttribute('position',plane.attributes.position);g.setAttribute('uv',plane.attributes.uv);
 const arrays={center:new Float32Array(capacity*3),extent:new Float32Array(capacity*2),tint:new Float32Array(capacity*4),params:new Float32Array(capacity*2)};
 for(const [name,size] of [['center',3],['extent',2],['tint',4],['params',2]])g.setAttribute(name,new T.InstancedBufferAttribute(arrays[name],size).setUsage(T.DynamicDrawUsage));
 const fragments={
  glow:`float r=length(q);float a=exp(-r*r*5.0)*(1.-smoothstep(.74,1.,r));vec3 c=mix(vColor.rgb,vec3(1.,.99,.86),exp(-r*r*18.)*.87);gl_FragColor=vec4(c,a*vColor.a);`,
  smoke:`float r=length(q);vec3 flow=vec3(q*3.7,vSeed);float f=fbm(flow+vec3(fbm(flow+2.))*1.1),edge=r+(f-.5)*.36;float density=smoothstep(.17,.65,f+.48-r*.53);float a=(1.-smoothstep(.64,1.,edge))*density;float shade=fbm(flow+vec3(-.3,.65,.25));vec3 c=vColor.rgb*(.62+shade*.72);gl_FragColor=vec4(c,a*vColor.a);`,
  flame:`float r=length(q);vec3 flow=vec3(q*3.,vSeed);float f=fbm(flow+vec3(fbm(flow+2.))*1.4);float density=clamp((1.-r)*1.5+f*.7-.38,0.,1.);vec3 c=mix(vColor.rgb,vec3(1.,.96,.65),smoothstep(.22,.80,density));float a=smoothstep(.05,.46,density)*(1.-smoothstep(.80,1.,r));gl_FragColor=vec4(c,a*vColor.a);`,
  ember:`float r=length(q),star=pow(max(0.,1.-abs(q.x)),11.)*pow(max(0.,1.-abs(q.y)),2.)+pow(max(0.,1.-abs(q.y)),11.)*pow(max(0.,1.-abs(q.x)),2.);float a=max(exp(-r*r*15.),star*.72)*(1.-smoothstep(.8,1.,r));gl_FragColor=vec4(mix(vColor.rgb,vec3(1.,.98,.78),exp(-r*r*24.)),a*vColor.a);`
 };
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,
  vertexShader:`attribute vec3 center;attribute vec2 extent;attribute vec4 tint;attribute vec2 params;varying vec2 vUV;varying vec4 vColor;varying float vSeed;
   void main(){vUV=uv;vColor=tint;vSeed=params.y;float c=cos(params.x),s=sin(params.x);vec2 p=position.xy*extent;p=mat2(c,-s,s,c)*p;float scale=length(modelMatrix[0].xyz);vec4 v=modelViewMatrix*vec4(center,1.);v.xy+=p*scale;gl_Position=projectionMatrix*v;}`,
  fragmentShader:`varying vec2 vUV;varying vec4 vColor;varying float vSeed;${noise}void main(){vec2 q=vUV*2.-1.;${fragments[kind]}if(gl_FragColor.a<.003)discard;}`
 });
 const mesh=new T.Mesh(g,material);mesh.frustumCulled=false;mesh.name='VFX_'+kind;let count=0;const color=new T.Color();
 return {mesh,begin(){count=0;},add(p,x,y,tint,alpha,rotation=0,random=0){if(count>=capacity||alpha<=.002||x<=0||y<=0)return;const i=count++;p.toArray(arrays.center,i*3);arrays.extent.set([x,y],i*2);color.set(tint);arrays.tint.set([color.r,color.g,color.b,Math.min(1,alpha)],i*4);arrays.params.set([rotation,random],i*2);},end(){g.instanceCount=count;mesh.visible=count>0;for(const name of Object.keys(arrays))g.attributes[name].needsUpdate=true;},get count(){return count;}};
}

// World-space segments project their true direction into the camera plane.
export function streakBatch(capacity){
 const g=new T.InstancedBufferGeometry(),plane=new T.PlaneGeometry(1,1);g.index=plane.index;g.setAttribute('position',plane.attributes.position);g.setAttribute('uv',plane.attributes.uv);
 const a={head:new Float32Array(capacity*3),tail:new Float32Array(capacity*3),tint:new Float32Array(capacity*4),width:new Float32Array(capacity)};
 for(const [n,size] of [['head',3],['tail',3],['tint',4],['width',1]])g.setAttribute(n,new T.InstancedBufferAttribute(a[n],size).setUsage(T.DynamicDrawUsage));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,
  vertexShader:`attribute vec3 head;attribute vec3 tail;attribute vec4 tint;attribute float width;varying vec2 vUV;varying vec4 vColor;
  void main(){vUV=uv;vColor=tint;vec4 h=modelViewMatrix*vec4(head,1.),t=modelViewMatrix*vec4(tail,1.);vec2 d=h.xy-t.xy;float len=max(length(d),.00001);vec2 across=vec2(-d.y,d.x)/len;vec4 p=mix(t,h,uv.y);p.xy+=across*position.x*width*length(modelMatrix[0].xyz);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`varying vec2 vUV;varying vec4 vColor;void main(){float edge=abs(vUV.x*2.-1.),body=pow(1.-edge,1.8)*sin(vUV.y*3.14159);gl_FragColor=vec4(mix(vColor.rgb,vec3(1.,.99,.85),pow(1.-edge,8.)*.8),body*vColor.a);}`
 });
 const mesh=new T.Mesh(g,material);mesh.frustumCulled=false;mesh.name='VFX_streaks';let count=0;const color=new T.Color();
 return {mesh,begin(){count=0;},add(head,tail,width,tint,alpha){if(count>=capacity||alpha<.003)return;const i=count++;head.toArray(a.head,i*3);tail.toArray(a.tail,i*3);a.width[i]=width;color.set(tint);a.tint.set([color.r,color.g,color.b,alpha],i*4);},end(){g.instanceCount=count;mesh.visible=count>0;for(const n of Object.keys(a))g.attributes[n].needsUpdate=true;},get count(){return count;}};
}

export function shockMaterial(){return new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,
 uniforms:{opacity:{value:1},phase:{value:0},color:{value:new T.Color(0xffd077)}},
 vertexShader:`varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 p;uniform float opacity;uniform float phase;uniform vec3 color;void main(){float r=length(p),a=atan(p.y,p.x),front=.84+.010*sin(a*7.+phase)+.006*sin(a*13.-phase*.7);float band=exp(-pow((r-front)/.017,2.));float wake=exp(-pow((r-front+.06)/.065,2.))*.13;float arc=.50+.50*sin(a*4.+phase)*sin(a*4.+phase);gl_FragColor=vec4(mix(color,vec3(1.,.97,.83),band*.55),(band+wake)*arc*opacity);}`
});}
