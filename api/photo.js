import {db,respond,fail,admin,supervisor} from '../lib/server.js';
import {randomUUID} from 'node:crypto';
export default async function handler(req,res){try{const s=db();if(req.method==='POST'){
 const {detailId,reportId,data,mime}=req.body||{};if(!/^[a-f0-9-]{36}$/i.test(detailId||'')||!/^[a-f0-9-]{36}$/i.test(reportId||'')||!['image/jpeg','image/png','image/webp'].includes(mime))return respond(res,400,{error:'Foto tidak valid'});
 if(typeof data!=='string'||data.length>7_000_000)return respond(res,400,{error:'Ukuran foto terlalu besar (maksimal 5MB)'});
 const {data:detail,error:de}=await s.from('activity_details').select('id,report_id').eq('id',detailId).eq('report_id',reportId).maybeSingle();if(de||!detail)return respond(res,404,{error:'Aktivitas tidak ditemukan'});
 const count=await s.from('activity_photos').select('id',{count:'exact',head:true}).eq('detail_id',detailId);if((count.count||0)>=8)return respond(res,400,{error:'Maksimal 8 foto per aktivitas'});
 const buf=Buffer.from(data,'base64');if(buf.length>5*1024*1024)return respond(res,400,{error:'Foto lebih dari 5MB'});
 const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg',path=`${reportId}/${detailId}/${randomUUID()}.${ext}`;
 const {error:up}=await s.storage.from('activity-photos').upload(path,buf,{contentType:mime,upsert:false});if(up)throw up;
 const {error:ins}=await s.from('activity_photos').insert({detail_id:detailId,storage_path:path});if(ins)throw ins;return respond(res,200,{ok:true});
 }
 if(req.method==='GET'){
 if(!await admin(req)&&!await supervisor(req))return respond(res,403,{error:'Akses ditolak'});
 const id=req.query.id;if(!/^[a-f0-9-]{36}$/i.test(id||''))return respond(res,400,{error:'ID tidak valid'});
 const {data:r,error:e}=await s.from('activity_photos').select('storage_path').eq('id',id).single();if(e||!r)return respond(res,404,{error:'Foto tidak ditemukan'});
 const {data:signed,error:se}=await s.storage.from('activity-photos').createSignedUrl(r.storage_path,120);if(se)throw se;return respond(res,200,{url:signed.signedUrl});
 }
 respond(res,405,{error:'Method tidak didukung'});
 }catch(e){fail(res,e)}}
