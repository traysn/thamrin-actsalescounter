import {db,respond,fail,admin,supervisor} from '../lib/server.js';
import {randomUUID} from 'node:crypto';
export default async function handler(req,res){try{const s=db();if(req.method==='POST'){
 const {detailId,reportId,data,mime}=req.body||{};if(!/^[a-f0-9-]{36}$/i.test(detailId||'')||!/^[a-f0-9-]{36}$/i.test(reportId||'')||!['image/jpeg','image/png','image/webp'].includes(mime))return respond(res,400,{error:'Foto tidak valid'});
 if(typeof data!=='string'||data.length>7_000_000)return respond(res,400,{error:'Ukuran foto terlalu besar (maksimal 5MB)'});
 const {data:detail,error:de}=await s.from('activity_details').select('id,report_id,activity_type').eq('id',detailId).eq('report_id',reportId).maybeSingle();if(de||!detail)return respond(res,404,{error:'Aktivitas tidak ditemukan'});
 const count=await s.from('activity_photos').select('id',{count:'exact',head:true}).eq('detail_id',detailId);if((count.count||0)>=8)return respond(res,400,{error:'Maksimal 8 foto per aktivitas'});
 const buf=Buffer.from(data,'base64');if(buf.length>5*1024*1024)return respond(res,400,{error:'Foto lebih dari 5MB'});
 const photoId=randomUUID();
 const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg',path=`${reportId}/${detailId}/${photoId}.${ext}`;
 const {error:up}=await s.storage.from('activity-photos').upload(path,buf,{contentType:mime,upsert:false});if(up)throw up;
 const {error:ins}=await s.from('activity_photos').insert({detail_id:detailId,storage_path:path});if(ins)throw ins;
 const drive=await copyToDrive(s,{reportId,photoId,activity:detail.activity_type,data,mime});
 return respond(res,200,{ok:true,drive});
 }
 if(req.method==='GET'){
 if(!await admin(req)&&!await supervisor(req))return respond(res,403,{error:'Akses ditolak'});
 const id=req.query.id;if(!/^[a-f0-9-]{36}$/i.test(id||''))return respond(res,400,{error:'ID tidak valid'});
 const {data:r,error:e}=await s.from('activity_photos').select('storage_path').eq('id',id).single();if(e||!r)return respond(res,404,{error:'Foto tidak ditemukan'});
 const {data:signed,error:se}=await s.storage.from('activity-photos').createSignedUrl(r.storage_path,120);if(se)throw se;return respond(res,200,{url:signed.signedUrl});
 }
 respond(res,405,{error:'Method tidak didukung'});
 }catch(e){fail(res,e)}}

async function copyToDrive(s,input) {
 const url=process.env.GOOGLE_DRIVE_WEBAPP_URL,secret=process.env.GOOGLE_DRIVE_UPLOAD_SECRET;
 if(!url&&!secret)return {status:'disabled'};
 try {
  if(!url||!secret||secret.length<32)throw Error('Konfigurasi Drive belum lengkap');
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))throw Error('URL Apps Script tidak valid');
  const {data:report,error}=await s.from('activity_reports').select('entered_name,entered_branch,activity_date').eq('id',input.reportId).single();
  if(error||!report)throw Error('Laporan tidak ditemukan');
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'follow',signal:AbortSignal.timeout(25000),body:JSON.stringify({secret,photoId:input.photoId,date:report.activity_date,branch:report.entered_branch,name:report.entered_name,activity:input.activity,mime:input.mime,data:input.data})});
  const result=await response.json();if(!response.ok||!result.ok||!result.fileId)throw Error('Drive menolak upload');
  return {status:'saved'};
 }catch(error){console.error('Salinan Drive gagal',input.photoId,error.name);return {status:'failed'};}
}
