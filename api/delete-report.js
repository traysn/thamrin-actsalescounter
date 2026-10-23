import {db,respond,fail,admin} from '../lib/server.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default async function handler(req,res){
 if(req.method!=='POST')return respond(res,405,{error:'Metode tidak didukung'});
 if(!await admin(req))return respond(res,403,{error:'Hanya Admin yang dapat menghapus laporan'});
 const {reportId,confirmation}=req.body||{};
 if(!UUID.test(reportId||'')||confirmation!=='HAPUS')return respond(res,400,{error:'ID atau konfirmasi tidak valid'});
 try{
  const s=db();
  const {data:report,error:re}=await s.from('activity_reports').select('id').eq('id',reportId).maybeSingle();
  if(re)throw re;if(!report)return respond(res,404,{error:'Laporan tidak ditemukan'});
  const {data:details,error:de}=await s.from('activity_details').select('id').eq('report_id',reportId);if(de)throw de;
  let paths=[];
  for(const d of details||[]){const {data:photos,error:pe}=await s.from('activity_photos').select('storage_path').eq('detail_id',d.id);if(pe)throw pe;paths.push(...(photos||[]).map(p=>p.storage_path));}
  // Hapus objek storage dahulu. Jika gagal, jangan hapus baris laporan.
  for(let i=0;i<paths.length;i+=100){const {error:se}=await s.storage.from('activity-photos').remove(paths.slice(i,i+100));if(se)throw se;}
  // Foreign keys ON DELETE CASCADE menghapus activity_details dan activity_photos.
  const {error:del}=await s.from('activity_reports').delete().eq('id',reportId);if(del)throw del;
  return respond(res,200,{ok:true,deletedReportId:reportId,deletedPhotoCount:paths.length});
 }catch(e){fail(res,e)}
}
