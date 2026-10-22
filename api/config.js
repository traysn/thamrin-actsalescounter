import {respond} from '../lib/server.js';
export default function handler(req,res){if(req.method!=='GET')return respond(res,405,{error:'Method tidak didukung'});respond(res,200,{url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY});}
