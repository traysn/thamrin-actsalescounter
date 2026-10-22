import {db,respond,fail,clean,validDate,today,unwrap} from '../lib/server.js';
const TYPES=['follow_up_ro','live_social_media','komunitas_gathering','fleet_corporate_visit','showroom_event','iklan_berbayar'];
export default async function handler(req,res){if(req.method!=='POST')return respond(res,405,{error:'Method tidak didukung'});try{
 const b=req.body||{},name=clean(b.name),branch=clean(b.branch),wa=clean(b.whatsapp).replace(/[^0-9]/g,''),date=clean(b.date),items=b.activities;
 if(name.length<3||name.length>150||!branch||branch.length>150||!/^62\d{8,13}$/.test(wa)||!validDate(date)||!Array.isArray(items)||!items.length||items.length>6)return respond(res,400,{error:'Periksa nama, cabang, nomor WhatsApp, tanggal dan aktivitas.'});
 const now=today();if(date>now||Math.abs((Date.parse(date)-Date.parse(now))/86400000)>31)return respond(res,400,{error:'Tanggal aktivitas maksimal 31 hari ke belakang dan tidak boleh di masa depan.'});
 if(new Set(items.map(x=>x.type)).size!==items.length||items.some(x=>!TYPES.includes(x.type)||typeof x.answers!=='object'||!x.answers||JSON.stringify(x.answers).length>12000))return respond(res,400,{error:'Detail aktivitas tidak valid.'});
 const s=db();const {data:matches,error:me}=await s.from('sales_counters').select('id,full_name,branch,employment_status,po_count').eq('branch',branch).ilike('full_name',name);if(me)throw me;
 const matched=matches?.length===1?matches[0]:null;const {data:r,error:re}=await s.from('activity_reports').insert({sales_counter_id:matched?.id||null,entered_name:name,entered_branch:branch,whatsapp:wa,activity_date:date,match_status:matched?'matched':'pending'}).select('id').single();if(re)throw re;
 const details=items.map(x=>({report_id:r.id,activity_type:x.type,answers:x.answers,leads:Math.max(0,Number(x.leads)||0),prospects:Math.max(0,Number(x.prospects)||0),hot_prospects:Math.max(0,Number(x.hot_prospects)||0),po:Math.max(0,Number(x.po)||0)}));
 const {data:d,error:de}=await s.from('activity_details').insert(details).select('id,activity_type');if(de){await s.from('activity_reports').delete().eq('id',r.id);throw de}
 respond(res,200,{ok:true,reportId:r.id,matched:!!matched,details:d});
 }catch(e){fail(res,e)}}
