import {db,respond,fail,admin,supervisor} from '../lib/server.js';
import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
const MAX_BYTES=20*1024*1024,BUCKET='activity-photos';
const MIMES=['image/jpeg','image/png','image/webp'];
const validId=v=>/^[a-f0-9-]{36}$/i.test(v||'');
const extension=mime=>mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
function signPhotoTicket(payload){
 const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const signature=createHmac('sha256',process.env.SUPABASE_SECRET_KEY).update('photo-ticket-v1:'+encoded).digest('base64url');
 return encoded+'.'+signature;
}
function readPhotoTicket(value){
 try{
  if(typeof value!=='string'||value.length>2500)return null;
  const parts=value.split('.');if(parts.length!==2)return null;
  const expected=createHmac('sha256',process.env.SUPABASE_SECRET_KEY).update('photo-ticket-v1:'+parts[0]).digest();
  const actual=Buffer.from(parts[1],'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const p=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  if(!Number.isFinite(p.exp)||p.exp<Date.now()||!validId(p.reportId)||!validId(p.detailId)||!validId(p.photoId)||!MIMES.includes(p.mime)||!Number.isInteger(p.size)||p.size<1||p.size>MAX_BYTES)return null;
  const correct=p.reportId+'/'+p.detailId+'/'+p.photoId+'.'+extension(p.mime);
  return p.path===correct?p:null;
 }catch{return null;}
}
async function checkDetail(s,reportId,detailId){
 const result=await s.from('activity_details').select('id,report_id,activity_type').eq('id',detailId).eq('report_id',reportId).maybeSingle();
 if(result.error||!result.data)return null;return result.data;
}
async function photoCount(s,detailId){
 const result=await s.from('activity_photos').select('id',{count:'exact',head:true}).eq('detail_id',detailId);
 if(result.error)throw result.error;return result.count||0;
}
function isImage(buf,mime){
 if(mime==='image/jpeg')return buf.length>=3&&buf[0]===255&&buf[1]===216&&buf[2]===255;
 if(mime==='image/png')return buf.length>=8&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 return buf.length>=12&&buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP';
}
export default async function handler(req,res){
 try{
  const s=db(),storage=s.storage.from(BUCKET);res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'){
   if(!await admin(req)&&!await supervisor(req))return respond(res,403,{error:'Akses ditolak'});
   const id=req.query.id;if(!validId(id))return respond(res,400,{error:'ID tidak valid'});
   const {data:r,error}=await s.from('activity_photos').select('storage_path').eq('id',id).single();
   if(error||!r)return respond(res,404,{error:'Foto tidak ditemukan'});
   const {data,error:se}=await storage.createSignedUrl(r.storage_path,120);if(se)throw se;
   return respond(res,200,{url:data.signedUrl});
  }
  if(req.method!=='POST')return respond(res,405,{error:'Method tidak didukung'});
  const body=req.body||{};
  if(body.action==='prepare'){
   const {reportId,detailId,mime,size}=body;
   if(!validId(reportId)||!validId(detailId)||!MIMES.includes(mime)||!Number.isInteger(size)||size<1||size>MAX_BYTES)return respond(res,400,{error:'Foto harus JPG, PNG, atau WEBP, maksimal 20 MB per foto.'});
   if(!await checkDetail(s,reportId,detailId))return respond(res,404,{error:'Aktivitas tidak ditemukan'});
   if(await photoCount(s,detailId)>=8)return respond(res,400,{error:'Maksimal 8 foto per aktivitas'});
   const photoId=randomUUID(),path=reportId+'/'+detailId+'/'+photoId+'.'+extension(mime);
   const {data,error}=await storage.createSignedUploadUrl(path,{upsert:false});if(error)throw error;
   const ticket=signPhotoTicket({reportId,detailId,photoId,path,mime,size,exp:Date.now()+30*60*1000});
   return respond(res,200,{uploadUrl:data.signedUrl,ticket,maxBytes:MAX_BYTES});
  }
  if(body.action==='complete'){
   const p=readPhotoTicket(body.ticket);if(!p)return respond(res,400,{error:'Izin upload tidak valid atau kedaluwarsa. Pilih dan kirim ulang foto.'});
   const detail=await checkDetail(s,p.reportId,p.detailId);if(!detail)return respond(res,404,{error:'Aktivitas tidak ditemukan'});
   const existing=await s.from('activity_photos').select('id').eq('storage_path',p.path).maybeSingle();if(existing.error)throw existing.error;
   if(!existing.data){
    if(await photoCount(s,p.detailId)>=8){await storage.remove([p.path]);return respond(res,400,{error:'Maksimal 8 foto per aktivitas'});}
    const {data:file,error}=await storage.download(p.path);if(error||!file)return respond(res,400,{error:'Foto belum selesai diunggah. Coba lagi.'});
    if(file.size!==p.size||file.size>MAX_BYTES){await storage.remove([p.path]);return respond(res,400,{error:'Ukuran foto tidak cocok atau lebih dari 20 MB.'});}
    const bytes=Buffer.from(await file.arrayBuffer());
    if(!isImage(bytes,p.mime)){await storage.remove([p.path]);return respond(res,400,{error:'Isi file bukan foto JPG, PNG, atau WEBP yang valid.'});}
    const {error:ins}=await s.from('activity_photos').insert({id:p.photoId,detail_id:p.detailId,storage_path:p.path});
    if(ins&&ins.code!=='23505')throw ins;
   }
   const drive=await copyPhotoToDrive(s,{...p,activity:detail.activity_type});
   return respond(res,200,{ok:true,drive});
  }
  // Keep the old small-file flow working while cached form pages are refreshed.
  const {detailId,reportId,data,mime}=body;
  if(!validId(detailId)||!validId(reportId)||!MIMES.includes(mime))return respond(res,400,{error:'Foto tidak valid'});
  if(typeof data!=='string'||data.length>Math.ceil(MAX_BYTES/3)*4)return respond(res,400,{error:'Maksimal 20 MB per foto.'});
  const detail=await checkDetail(s,reportId,detailId);if(!detail)return respond(res,404,{error:'Aktivitas tidak ditemukan'});
  if(await photoCount(s,detailId)>=8)return respond(res,400,{error:'Maksimal 8 foto per aktivitas'});
  const buf=Buffer.from(data,'base64');if(!buf.length||buf.length>MAX_BYTES||!isImage(buf,mime))return respond(res,400,{error:'Foto tidak valid atau lebih dari 20 MB.'});
  const photoId=randomUUID(),path=reportId+'/'+detailId+'/'+photoId+'.'+extension(mime);
  const {error:up}=await storage.upload(path,buf,{contentType:mime,upsert:false});if(up)throw up;
  const {error:ins}=await s.from('activity_photos').insert({id:photoId,detail_id:detailId,storage_path:path});if(ins)throw ins;
  const drive=await copyPhotoToDrive(s,{reportId,photoId,path,mime,size:buf.length,activity:detail.activity_type});
  return respond(res,200,{ok:true,drive});
 }catch(error){fail(res,error);}
}
async function copyPhotoToDrive(s,p){
 const url=String(process.env.GOOGLE_DRIVE_WEBAPP_URL||'').trim(),secret=process.env.GOOGLE_DRIVE_UPLOAD_SECRET;
 if(!url&&!secret)return {status:'disabled'};
 try{
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)||!secret||secret.length<32)throw Error('DRIVE_CONFIG');
  const {data:r,error}=await s.from('activity_reports').select('entered_name,entered_branch,activity_date').eq('id',p.reportId).single();if(error||!r)throw Error('DRIVE_METADATA');
  const {data:signed,error:signError}=await s.storage.from(BUCKET).createSignedUrl(p.path,600);if(signError)throw signError;
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'follow',signal:AbortSignal.timeout(40000),body:JSON.stringify({secret,photoId:p.photoId,date:r.activity_date,branch:r.entered_branch,name:r.entered_name,activity:p.activity,mime:p.mime,size:p.size,url:signed.signedUrl})});
  const result=await response.json();if(!response.ok||!result.ok||!result.fileId)throw Error('DRIVE_REJECTED');
  return {status:'saved'};
 }catch(error){console.error('DRIVE_COPY_FAILED',p.photoId,error.name);return {status:'failed'};}
}
