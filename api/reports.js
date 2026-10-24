import {db,respond,fail,authorize} from '../lib/server.js';
export default async function handler(req,res){
 if(req.method!=='GET')return respond(res,405,{error:'Method tidak didukung'});
 if(!await authorize(req))return respond(res,403,{error:'Akses ditolak'});
 try{
  const s=db();let rows=[];const size=500;const limit=10000;
  for(let start=0;start<limit;start+=size){
   const {data,error}=await s.from('activity_reports').select('id,sales_counter_id,entered_name,entered_branch,whatsapp,activity_date,submitted_at,match_status,activity_details(id,activity_type,answers,leads,prospects,hot_prospects,po,activity_photos(id))').order('submitted_at',{ascending:false}).range(start,start+size-1);
   if(error)throw error;rows.push(...(data||[]));if(!data||data.length<size)break;
  }
  respond(res,200,{reports:rows,truncated:rows.length>=limit});
 }catch(e){fail(res,e)}
}
