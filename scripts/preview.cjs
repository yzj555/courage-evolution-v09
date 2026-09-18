const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../dist'),port=Number(process.argv[2]||4183);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Port must be between 1 and 65535.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.json':'application/json; charset=utf-8'};
const server=http.createServer((request,response)=>{
 let file;
 try{
  const url=new URL(request.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname)==='/'?'/cinema.html':decodeURIComponent(url.pathname);
  file=path.resolve(root,'.'+name);
  const relative=path.relative(root,file);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)){response.writeHead(403);response.end('Forbidden');return;}
 }catch{response.writeHead(400);response.end('Invalid URL');return;}
 fs.stat(file,(error,stat)=>{
  if(error||!stat.isFile()){response.writeHead(404);response.end('Not found');return;}
  response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
  if(request.method==='HEAD'){response.end();return;}
  fs.createReadStream(file).on('error',()=>response.destroy()).pipe(response);
 });
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is busy. Use node scripts/preview.cjs 4184 to choose another port.`:e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/cinema.html`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
