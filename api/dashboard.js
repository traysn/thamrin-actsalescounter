import {db,respond,fail,authorize,validDate,today} from '../lib/server.js';
export default async function handler(req,res){
 if(req.method!=='GET')return respond(res,405,{error:'Method tidak didukung'});
 const isPrivileged=await authorize(req); // WhatsApp dan jawaban form tersedia di dashboard biasa; foto dan roster tetap dibatasi.
 try{
  const start=req.query.start||req.query.date||today(),end=req.query.end||start;
  if(!validDate(start)||!validDate(end)||end<start)return respond(res,400,{error:'Rentang tanggal tidak valid'});
  const days=Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1;
  if(days>31)return respond(res,400,{error:'Maksimal 31 hari per pencarian'});
  const s=db();
  // Snapshot historis tidak dibuat dari master saat ini, agar data lama tidak salah.
  let roster=[],reports=[],truncated=false;
  for(let off=0;off<10000;off+=500){const {data,error}=await s.from('daily_roster').select('*').gte('roster_date',start).lte('roster_date',end).order('roster_date').range(off,off+499);if(error)throw error;roster.push(...data);if(data.length<500)break;if(off>=9500)truncated=true}
  for(let off=0;off<10000;off+=250){const {data,error}=await s.from('activity_reports').select('id,sales_counter_id,entered_name,entered_branch,whatsapp,activity_date,submitted_at,match_status,activity_details(id,activity_type,answers,leads,prospects,hot_prospects,po,activity_photos(id))').gte('activity_date',start).lte('activity_date',end).order('submitted_at',{ascending:false}).range(off,off+249);if(error)throw error;reports.push(...data);if(data.length<250)break;if(off>=9750)truncated=true}
  if(isPrivileged&&start===today()&&end===today()&&!roster.length){
   const {data:emps,error}=await s.from('sales_counters').select('*').ilike('employment_status','active').eq('po_count',0);if(error)throw error;
   if(emps.length){const payload=emps.map(x=>({roster_date:start,sales_counter_id:x.id,sales_id_snapshot:x.sales_id,name_snapshot:x.full_name,branch_snapshot:x.branch,amd_snapshot:x.amd,is_required:true}));const {error:e}=await s.from('daily_roster').upsert(payload,{onConflict:'roster_date,sales_counter_id'});if(e)throw e;const result=await s.from('daily_roster').select('*').eq('roster_date',start);if(result.error)throw result.error;roster=result.data}
  }
  const matched=new Set(reports.filter(r=>r.match_status==='matched'&&r.sales_counter_id).map(r=>`${r.activity_date}|${r.sales_counter_id}`));
  const mapped=roster.map(x=>({...x,has_report:matched.has(`${x.roster_date}|${x.sales_counter_id}`)}));
  const safeReports=isPrivileged?reports:reports.map(r=>({...r,activity_details:(r.activity_details||[]).map(d=>({...d,activity_photos:[]}))}));
  res.setHeader('Cache-Control','no-store');respond(res,200,{contactVersion:"WA11",start,end,roster:isPrivileged?mapped:[],reports:safeReports,truncated,estimated:false});
 }catch(e){fail(res,e)}
}
