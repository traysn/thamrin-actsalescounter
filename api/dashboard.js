import {db,respond,fail,authorize,validDate,today} from '../lib/server.js';
export default async function handler(req,res){if(req.method!=='GET')return respond(res,405,{error:'Method tidak didukung'});if(!await authorize(req))return respond(res,403,{error:'Akses ditolak'});try{
 const s=db(),date=req.query.date||today();if(!validDate(date))return respond(res,400,{error:'Tanggal tidak valid'});
 // Roster snapshot for selected date: if absent, create from current master. Past dates without a pre-existing snapshot are estimates.
 let {data:roster,error:re}=await s.from('daily_roster').select('*').eq('roster_date',date);if(re)throw re;
 if(!roster.length&&date===today()){
 const {data:emps,error:ee}=await s.from('sales_counters').select('*').ilike('employment_status','active').eq('po_count',0);if(ee)throw ee;
 if(emps.length){const payload=emps.map(x=>({roster_date:date,sales_counter_id:x.id,sales_id_snapshot:x.sales_id,name_snapshot:x.full_name,branch_snapshot:x.branch,amd_snapshot:x.amd}));const {error:ie}=await s.from('daily_roster').upsert(payload,{onConflict:'roster_date,sales_counter_id'});if(ie)throw ie;roster=(await s.from('daily_roster').select('*').eq('roster_date',date)).data||[]}
 }
 const {data:reports,error:rr}=await s.from('activity_reports').select('id,sales_counter_id,entered_name,entered_branch,whatsapp,activity_date,submitted_at,match_status,activity_details(id,activity_type,answers,leads,prospects,hot_prospects,po,activity_photos(id))').eq('activity_date',date).order('submitted_at',{ascending:false}).limit(3000);if(rr)throw rr;
 const ids=new Set(reports.filter(x=>x.match_status==='matched'&&x.sales_counter_id).map(x=>x.sales_counter_id));
 respond(res,200,{date,roster:roster.map(x=>({...x,has_report:ids.has(x.sales_counter_id)})),reports,estimated:date!==today()&&!roster.length});
 }catch(e){fail(res,e)}}
