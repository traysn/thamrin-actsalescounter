import {respond,admin} from '../lib/server.js';
export default async function handler(req,res){
 if(req.method!=='GET')return respond(res,405,{error:'Method tidak didukung'});
 if(!await admin(req))return respond(res,403,{error:'Hanya Admin'});
 return respond(res,200,{url:'https://'+(req.headers['x-forwarded-host']||req.headers.host)+'/manager.html'});
}
