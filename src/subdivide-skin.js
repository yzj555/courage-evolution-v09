import * as T from 'three';
import {mergeVertices,toCreasedNormals} from '../vendor/BufferGeometryUtils.js';

// Share the position topology across UV seams, but interpolate each UV island separately.
// Skinning follows the same stencil as positions, preserving the source rig at joints.
export function refineSkin(source,iterations=2,options={}){
 let geometry=source.index?source.toNonIndexed():source.clone();
 for(let iteration=0;iteration<iterations;iteration++){
  const p=geometry.attributes.position,uv=geometry.attributes.uv,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
  const vertices=[],lookup=new Map(),ids=[],edges=new Map();
  for(let i=0;i<p.count;i++){
   const a=[p.getX(i),p.getY(i),p.getZ(i)],key=a.map(v=>Math.round(v*1e5)).join(',');let id=lookup.get(key);
   if(id===undefined){id=vertices.length;lookup.set(key,id);const weights=new Map();for(let j=0;j<4;j++){const w=sw.array[i*4+j];if(w>0)weights.set(si.array[i*4+j],w);}vertices.push({p:a,weights,adj:new Set(),boundary:new Set()});}ids.push(id);
  }
  function edge(a,b,c){const key=a<b?a+','+b:b+','+a;let e=edges.get(key);if(!e){e={a,b,opposite:[]};edges.set(key,e);}e.opposite.push(c);vertices[a].adj.add(b);vertices[b].adj.add(a);return e;}
  for(let i=0;i<ids.length;i+=3){const [a,b,c]=ids.slice(i,i+3);edge(a,b,c);edge(b,c,a);edge(c,a,b);}
  for(const e of edges.values())if(e.opposite.length!==2){vertices[e.a].boundary.add(e.b);vertices[e.b].boundary.add(e.a);}
  if(options.creaseAngle){
   const v=new T.Vector3(),w=new T.Vector3(),u=new T.Vector3();
   for(const e of edges.values())if(e.opposite.length===2){
    const a=vertices[e.a].p,b=vertices[e.b].p;
    const n=e.opposite.map(c=>new T.Vector3().crossVectors(v.fromArray(b).sub(w.fromArray(a)),u.fromArray(vertices[c].p).sub(w.fromArray(a))).normalize());
    if(-n[0].dot(n[1])<Math.cos(options.creaseAngle)){e.crease=true;vertices[e.a].boundary.add(e.b);vertices[e.b].boundary.add(e.a);}
   }
  }
  const blend=options.blend??.65;
  function stencil(terms){const pos=[0,0,0],w=new Map();for(const [id,k] of terms){const v=vertices[id];for(let j=0;j<3;j++)pos[j]+=v.p[j]*k;for(const [b,weight] of v.weights)w.set(b,(w.get(b)||0)+weight*k);}const pairs=[...w].sort((a,b)=>b[1]-a[1]).slice(0,4);while(pairs.length<4)pairs.push([0,0]);const sum=pairs.reduce((s,x)=>s+x[1],0);return {p:pos,si:pairs.map(x=>x[0]),sw:pairs.map(x=>x[1]/sum)};}
  const old=vertices.map((v,i)=>{
   const neighbors=[...v.adj],boundary=[...v.boundary];
   if(boundary.length)return stencil([[i,1]]); // Keep mouth edges and tiny tooth tips crisp.
   const beta=neighbors.length===3?3/16:3/(8*neighbors.length);
   return stencil([[i,1-blend*beta*neighbors.length],...neighbors.map(n=>[n,blend*beta])]);
  });
  for(const e of edges.values())e.result=e.opposite.length===2&&!e.crease?stencil([[e.a,.5-blend*.125],[e.b,.5-blend*.125],...e.opposite.map(i=>[i,blend*.125])]):stencil([[e.a,.5],[e.b,.5]]);
  const out={position:[],uv:[],skinIndex:[],skinWeight:[]};
  function record(vertex,coord){out.position.push(...vertex.p);out.uv.push(...coord);out.skinIndex.push(...vertex.si);out.skinWeight.push(...vertex.sw);}
  for(let i=0;i<ids.length;i+=3){const [a,b,c]=ids.slice(i,i+3),ab=edges.get(a<b?a+','+b:b+','+a).result,bc=edges.get(b<c?b+','+c:c+','+b).result,ca=edges.get(c<a?c+','+a:a+','+c).result;
   const A=[uv.getX(i),uv.getY(i)],B=[uv.getX(i+1),uv.getY(i+1)],C=[uv.getX(i+2),uv.getY(i+2)],avg=(a,b)=>a.map((v,j)=>(v+b[j])/2),AB=avg(A,B),BC=avg(B,C),CA=avg(C,A);
   for(const [v,t] of [[old[a],A],[ab,AB],[ca,CA],[ab,AB],[old[b],B],[bc,BC],[ca,CA],[bc,BC],[old[c],C],[ab,AB],[bc,BC],[ca,CA]])record(v,t);
  }
  geometry.dispose();geometry=new T.BufferGeometry();for(const key of ['position','uv','skinIndex','skinWeight'])geometry.setAttribute(key,key==='skinIndex'?new T.Uint16BufferAttribute(out[key],4):new T.Float32BufferAttribute(out[key],key==='position'?3:key==='uv'?2:4));
 }
 if(options.creaseAngle)geometry=toCreasedNormals(geometry,options.creaseAngle);else smoothNormals(geometry);return mergeVertices(geometry,1e-5);
}

export function smoothNormals(g){
 g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,groups=new Map();
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');let group=groups.get(key);if(!group){group={indices:[],normal:new T.Vector3()};groups.set(key,group);}group.indices.push(i);group.normal.add(new T.Vector3().fromBufferAttribute(n,i));}
 for(const group of groups.values()){group.normal.normalize();for(const i of group.indices)n.setXYZ(i,...group.normal.toArray());}n.needsUpdate=true;
}

export function softenShoulderWeights(g,boneCount){
 const p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ix=g.index.array,vertices=[],lookup=new Map(),ids=[];
 const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 for(let i=0;i<p.count;i++){
  const pos=[p.getX(i),p.getY(i),p.getZ(i)],key=pos.map(x=>Math.round(x*1e5)).join(',');let id=lookup.get(key);
  if(id===undefined){id=vertices.length;lookup.set(key,id);const w=new Float32Array(boneCount);for(let j=0;j<4;j++)w[si.array[i*4+j]]+=sw.array[i*4+j];const x=Math.abs(pos[0]),y=pos[1];vertices.push({pos,w,adj:new Set(),mask:smooth(1.15,1.7,x)*(1-smooth(3.9,4.9,x))*smooth(8.7,9.5,y)*(1-smooth(12.65,13.6,y))});}ids.push(id);
 }
 for(let k=0;k<ix.length;k+=3)for(let j=0;j<3;j++){const a=ids[ix[k+j]],b=ids[ix[k+(j+1)%3]];if(a!==b){vertices[a].adj.add(b);vertices[b].adj.add(a);}}
 const active=vertices.filter(v=>v.mask>.001);
 for(let pass=0;pass<18;pass++){
  const updates=active.map(v=>{const w=new Float32Array(boneCount);let sum=0;for(const n of v.adj){const q=vertices[n],d=Math.max(.02,Math.hypot(...q.pos.map((p,j)=>p-v.pos[j]))),f=1/d;sum+=f;for(let k=0;k<boneCount;k++)w[k]+=q.w[k]*f;}for(let k=0;k<boneCount;k++)w[k]=T.MathUtils.lerp(v.w[k],w[k]/sum,.55*v.mask);return w});active.forEach((v,i)=>v.w=updates[i]);
 }
 for(let i=0;i<p.count;i++){const pairs=Array.from(vertices[ids[i]].w,(w,j)=>[j,w]).sort((a,b)=>b[1]-a[1]).slice(0,4),total=pairs.reduce((s,p)=>s+p[1],0);for(let j=0;j<4;j++){si.array[i*4+j]=pairs[j][1]>0?pairs[j][0]:0;sw.array[i*4+j]=pairs[j][1]/total;}}
 si.needsUpdate=sw.needsUpdate=true;
}
