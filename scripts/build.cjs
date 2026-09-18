const fs=require('fs'),path=require('path'),crypto=require('crypto'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),assetRoot=path.join(root,'assets');
const check=process.argv.includes('--check');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function inside(base,relative){
 const file=path.resolve(base,relative),rel=path.relative(base,file);
 if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw new Error('Path is outside this project: '+relative);
 return file;
}
function loadAssets(){
 const index=JSON.parse(fs.readFileSync(path.join(assetRoot,'index.json'),'utf8')),assets={};
 for(const [id,fields] of Object.entries(index)){
  assets[id]={};
  for(const [name,entry] of Object.entries(fields)){
   const bytes=fs.readFileSync(inside(assetRoot,entry.file));
   assets[id][name]=entry.encoding==='utf8'?bytes.toString('utf8'):`data:${entry.mime};base64,${bytes.toString('base64')}`;
  }
 }
 return JSON.stringify(assets);
}
(async()=>{
 const assets=loadAssets(),pages=[['cinema','cinema.html'],['evolution','evolution-v13.html']],results=[];
 for(const [entry,filename] of pages){
  const build=await esbuild.build({absWorkingDir:root,entryPoints:[`src/${entry}-viewer.js`],alias:{three:path.join(root,'vendor/three.module.js')},bundle:true,format:'esm',minify:true,write:false,metafile:true});
  // Resolve every source from this directory; a parent workspace is unnecessary.
  for(const input of Object.keys(build.metafile.inputs))inside(root,input);
  const template=fs.readFileSync(path.join(root,`src/${entry}-template.html`),'utf8');
  const html=template.replace('__ASSETS__',()=>assets).replace('__SCRIPT__',()=>build.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
  const bytes=Buffer.from(html),target=path.join(root,'dist',filename);
  if(check){
   if(!fs.existsSync(target)||!fs.readFileSync(target).equals(bytes))throw new Error(`${filename} differs from its sources. Run npm run build to refresh it.`);
  }else{
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  }
  results.push({file:'dist/'+filename,bytes:bytes.length,sha256:hash(bytes),inputs:Object.keys(build.metafile.inputs).length});
 }
 console.log(JSON.stringify({mode:check?'verified':'built',esbuild:esbuild.version,pages:results},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
