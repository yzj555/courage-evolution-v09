import * as T from 'three';

// Broaden the source mesh's very narrow shoulder skin transition for an
// overhead pose. Weld coincident vertices for weights only (UVs and hard
// normals stay untouched), then diffuse weights locally along mesh edges.
export function refineWarriorShoulders(g,joints){
 const names=['J_spine02','J_collar_l','J_arm_l','J_armor_l','J_collar_r','J_arm_r','J_armor_r','J_elbow_l','J_elbow_r','J_spine01','J_neck'];
 const count=names.length;
 const ids=names.map(n=>joints.findIndex(b=>b.name===n)),lookup=new Map(ids.map((id,i)=>[id,i]));
 const p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,weld=new Map(),groups=[],vertices=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),key=[x,y,z].map(v=>Math.round(v*10000)).join(',');
  let index=weld.get(key);if(index===undefined){index=groups.length;weld.set(key,index);groups.push({v:[],neighbors:new Set(),w:new Float64Array(count),eligible:true,x,y,z});}
  const o=groups[index];o.v.push(i);vertices[i]=index;
  for(let j=0;j<4;j++){const w=sw.array[i*4+j],bone=lookup.get(si.array[i*4+j]);if(w>.000001){if(bone===undefined)o.eligible=false;else o.w[bone]+=w;}}
 }
 for(const o of groups){for(let j=0;j<count;j++)o.w[j]/=o.v.length;
  const edge=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
  const shoulder=edge(1.0,1.5,Math.abs(o.x))*(1-edge(3.6,4.1,Math.abs(o.x)))*edge(13.3,13.9,o.y)*(1-edge(16.8,17.4,o.y));
  const elbow=edge(3.1,3.6,Math.abs(o.x))*(1-edge(4.5,4.9,Math.abs(o.x)))*edge(11.8,12.3,o.y)*(1-edge(13.2,13.7,o.y));
  o.amount=o.eligible?Math.max(shoulder,elbow)*.70:0;
  // Preserve the centers of the rigid shoulder armor plates.
  if(o.w[3]>.96||o.w[6]>.96)o.amount=0;
 }
 const ix=g.index.array;
 for(let i=0;i<ix.length;i+=3){const tri=[vertices[ix[i]],vertices[ix[i+1]],vertices[ix[i+2]]];for(let j=0;j<3;j++)for(let k=j+1;k<3;k++)if(tri[j]!==tri[k]){groups[tri[j]].neighbors.add(tri[k]);groups[tri[k]].neighbors.add(tri[j]);}}
 const active=groups.filter(o=>o.amount>.001);
 for(let pass=0;pass<64;pass++){
  const next=active.map(o=>{const avg=new Float64Array(count);let total=0;for(const i of o.neighbors){const n=groups[i];if(!n.eligible)continue;total++;for(let j=0;j<count;j++)avg[j]+=n.w[j];}if(!total)return o.w;for(let j=0;j<count;j++)avg[j]=o.w[j]*(1-o.amount)+avg[j]/total*o.amount;return avg;});
  active.forEach((o,i)=>o.w=next[i]);
 }
 for(const o of active){const values=Array.from(o.w,(w,i)=>[ids[i],w<1e-8?0:w]).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=values.reduce((s,v)=>s+v[1],0);for(const i of o.v)for(let j=0;j<4;j++){sw.array[i*4+j]=values[j][1]/sum;si.array[i*4+j]=sw.array[i*4+j]>0?values[j][0]:0;}}
 return {weldedShoulderPoints:active.length,passes:64};
}
