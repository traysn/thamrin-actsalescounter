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
  const directory=await loadDailySalesDirectory(s);
  const safeReports=isPrivileged?reports:reports.map(r=>({...r,activity_details:(r.activity_details||[]).map(d=>({...d,activity_photos:[]}))}));
  res.setHeader('Cache-Control','no-store');respond(res,200,{contactVersion:"WA11",salesDirectory:directory.rows,directoryTruncated:directory.truncated,start,end,roster:isPrivileged?mapped:[],reports:safeReports,truncated,estimated:false});
 }catch(e){fail(res,e)}
}

async function loadDailySalesDirectory(s){
 const limit=10000,size=500;let employees=[],history=[],truncated=false;
 for(let offset=0;offset<limit;offset+=size){
  const {data,error}=await s.from('sales_counters').select('id,full_name,branch,employment_status,whatsapp').order('id').range(offset,offset+size-1);if(error)throw error;
  employees.push(...(data||[]));if(!data||data.length<size)break;if(offset+size>=limit)truncated=true;
 }
 const active=employees.filter(p=>['active','aktif'].includes(String(p.employment_status||'').trim().toLowerCase()));
 if(active.length){for(let offset=0;offset<limit;offset+=size){
  const {data,error}=await s.from('activity_reports').select('sales_counter_id,entered_name,entered_branch,whatsapp,submitted_at').order('submitted_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+size-1);if(error)throw error;
  history.push(...(data||[]));if(!data||data.length<size)break;
 }}
 const normalize=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
 const phone=v=>{let s=String(v||'').trim();if(!/^[+\d\s().-]+$/.test(s))return null;s=s.replace(/\D/g,'');if(s.startsWith('0062'))s=s.slice(2);else if(s.startsWith('0'))s='62'+s.slice(1);else if(s.startsWith('8'))s='62'+s;return /^62\d{8,13}$/.test(s)?s:null;};
 const byId=new Map(),byNameBranch=new Map();
 for(const r of history){const number=phone(r.whatsapp);if(!number)continue;
  if(r.sales_counter_id&&!byId.has(r.sales_counter_id))byId.set(r.sales_counter_id,number);
  const key=normalize(r.entered_name)+'|'+normalize(r.entered_branch);if(!byNameBranch.has(key))byNameBranch.set(key,number);
 }
 return {rows:active.map(p=>({id:p.id,name:p.full_name,branch:p.branch,whatsapp:phone(p.whatsapp)||byId.get(p.id)||byNameBranch.get(normalize(p.full_name)+'|'+normalize(p.branch))||null})),truncated};
}
