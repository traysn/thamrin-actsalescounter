import {respond,fail,admin,permanentManagerToken} from '../lib/server.js';
export default async function handler(req,res){
 if(req.method!=='GET')return respond(res,405,{error:'Method tidak didukung'});
 if(!await admin(req))return respond(res,403,{error:'Hanya Admin'});
 try{
  const origin=`https://${req.headers['x-forwarded-host']||req.headers.host}`;
  const url=`${origin}/?supervisor=${encodeURIComponent(permanentManagerToken())}`;
  res.setHeader('Cache-Control','no-store');return respond(res,200,{url});
 }catch(e){fail(res,e)}
}
