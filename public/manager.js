'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPES=[['follow_up_ro','Follow Up Customer RO'],['live_social_media','Live Social Media'],['komunitas_gathering','Komunitas Gathering'],['fleet_corporate_visit','Fleet / Corporate Visit'],['showroom_event','Showroom Event'],['iklan_berbayar','Iklan Berbayar']];
const COLORS=['#287cf4','#00b980','#ffb81c','#ff596c','#9467f5','#8fa6c5'];
const SERIES=[['activities','Aktivitas',COLORS[0]],['leads','Lead',COLORS[1]],['prospects','Prospek',COLORS[2]],['hot','Hot Prospek',COLORS[3]],['po','PO',COLORS[4]]];
const fmt=n=>Number(n||0).toLocaleString('id-ID');const n=v=>Number(v)||0;const dateID=d=>d?d.split('-').reverse().join('/'):'—';
let raw=[],data=[],rows=[],page=0,branches={},loaded=false;
const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dayAgo=(days)=>{const d=new Date();d.setDate(d.getDate()-days);return localDate(d)};
function setNotice(msg){$('notice').hidden=!msg;$('notice').textContent=msg||''}
function typeName(id){const known=TYPES.find(x=>x[0]===id);return known?known[1]:String(id||'Tidak diketahui').replaceAll('_',' ')}
function getAMD(branch){return branches[branch]||'Belum Terpetakan'}
function makeOptions(id,values,label,old){$(id).innerHTML=`<option value="">${label}</option>`+values.map(x=>`<option value="${esc(x)}" ${x===old?'selected':''}>${esc(x)}</option>`).join('')}
async function init(){ $('start').value=dayAgo(13);$('end').value=localDate();try{const r=await fetch('/branches.json');if(r.ok)branches=await r.json()}catch(e){};makeOptions('activity',TYPES.map(x=>x[0]),'Semua Aktivitas','');$('activity').innerHTML='<option value="">Semua Aktivitas</option>'+TYPES.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('');
$('apply').onclick=load;$('reset').onclick=()=>{['amd','branch','name','activity','match','tableSearch'].forEach(id=>$(id).value='');$('start').value=dayAgo(13);$('end').value=localDate();load()};['amd','branch','name','activity','match'].forEach(id=>$(id).addEventListener('change',filter));$('name').addEventListener('input',filter);$('tableSearch').addEventListener('input',()=>{page=0;drawTable()});['trendMetric','activityMetric','amdSort','branchSort'].forEach(id=>$(id).addEventListener('change',render));$('prevPage').onclick=()=>{page=Math.max(0,page-1);drawTable()};$('nextPage').onclick=()=>{page++;drawTable()};$('export').onclick=exportExcel;await load()}
async function load(){let start=$('start').value,end=$('end').value;if(!start||!end||end<start){setNotice('Rentang tanggal tidak valid.');return}setNotice('');$('apply').disabled=true;$('apply').textContent='Memuat...';try{const res=await fetch(`/api/dashboard?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&contactVersion=WA11`,{cache:'no-store',headers:managerHeaders()});const json=await res.json();if(!res.ok)throw Error(json.error||'Gagal mengambil laporan');raw=json.reports||[];loaded=true;$('updatedAt').textContent=new Date().toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})+' · WA11';const prevA=$('amd').value,prevB=$('branch').value;makeOptions('amd',[...new Set(raw.map(r=>getAMD(r.entered_branch)))].sort(),'Semua AMD',prevA);makeOptions('branch',[...new Set(raw.map(r=>r.entered_branch).filter(Boolean))].sort(),'Semua Cabang',prevB);if(json.truncated)setNotice('Data melebihi batas pengambilan server. Sempitkan periode untuk hasil lengkap.');if(json.contactVersion!=='WA11')setNotice('API situs ini belum memakai perbaikan WA11. Pastikan commit api/dashboard.js sudah masuk deployment Production yang aktif.');else if(raw.length&&!raw.some(r=>salesWhatsAppLinks([r]).includes('https://wa.me/')))setNotice('WA11 aktif, tetapi laporan yang diterima belum berisi nomor WhatsApp valid. Periksa nomor pada laporan di Admin untuk periode yang sama.');filter()}catch(e){setNotice(e.message);raw=[];filter()}finally{$('apply').disabled=false;$('apply').textContent='⚲  Terapkan Filter'}}
function filter(){const amd=$('amd').value,branch=$('branch').value,name=$('name').value.trim().toLowerCase(),type=$('activity').value,match=$('match').value;data=raw.filter(r=>(!amd||getAMD(r.entered_branch)===amd)&&(!branch||r.entered_branch===branch)&&(!name||String(r.entered_name||'').toLowerCase().includes(name))&&(!match||(match==='pending'?r.match_status!=='matched':r.match_status===match)));rows=data.flatMap(r=>(r.activity_details||[]).filter(d=>!type||d.activity_type===type).map(d=>({r,d,amd:getAMD(r.entered_branch)})));if(type)data=data.filter(r=>rows.some(x=>x.r.id===r.id));page=0;render()}
function sum(key){return rows.reduce((s,x)=>s+n(key==='activities'?1:x.d[key]),0)}
function render(){const count=data.length,activities=rows.length,leads=sum('leads'),prospects=sum('prospects'),hot=sum('hot_prospects'),po=sum('po'),unique=new Set(data.map(r=>`${String(r.entered_name).toLowerCase()}|${r.entered_branch}`)).size;const kpis=[['▤','Total Laporan',count],['▣','Total Aktivitas',activities],['♧','Total Lead',leads],['◎','Total Prospek',prospects],['♨','Total Hot Prospek',hot],['▰','Total PO',po],['↗','Conversion Rate',leads?`${(po/leads*100).toFixed(1).replace('.',',')}%`:'0%']];$('kpis').innerHTML=kpis.map(([icon,label,val],i)=>`<div class="kpi"><div class="kpi-top"><span>${label}</span><span class="kpi-icon" style="${i===5?'background:#e2faf1;color:#00a777':i===4?'background:#ffeaed;color:#e64e61':''}">${icon}</span></div><div class="kpi-value">${typeof val==='number'?fmt(val):val}</div><div class="kpi-note">${i===6?'PO ÷ Lead × 100%':i===0?'Jumlah formulir yang masuk':i===1?'Jumlah jenis aktivitas dilaporkan':i===5?'PO tercatat dari laporan':'Berdasarkan filter aktif'}</div></div>`).join('');drawTrend();drawActivity();drawRankings();drawDonut();drawTable()}
function aggregate(keyFn){const map=new Map();for(const {r,d,amd} of rows){const k=keyFn({r,d,amd});if(!map.has(k))map.set(k,{name:k,activities:0,leads:0,prospects:0,hot:0,po:0});const a=map.get(k);a.activities++;a.leads+=n(d.leads);a.prospects+=n(d.prospects);a.hot+=n(d.hot_prospects);a.po+=n(d.po)}return [...map.values()]}
function svgLine(series,labels){const W=760,H=260,l=40,r=15,t=20,b=43,iw=W-l-r,ih=H-t-b,max=Math.max(1,...series.flatMap(s=>s.values)),steps=4;let out=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Grafik tren aktivitas harian">`;for(let i=0;i<=steps;i++){let y=t+ih*i/steps;out+=`<line x1="${l}" y1="${y}" x2="${W-r}" y2="${y}" stroke="#e5edf6"/><text x="${l-7}" y="${y+4}" text-anchor="end" font-size="11" fill="#7891ad">${fmt(Math.round(max*(steps-i)/steps))}</text>`}labels.forEach((v,i)=>{if(labels.length>16&&i%Math.ceil(labels.length/12)!==0)return;const x=l+(labels.length===1?iw/2:i*iw/(labels.length-1));out+=`<text x="${x}" y="${H-12}" font-size="11" text-anchor="middle" fill="#7d91a9">${esc(v)}</text>`});for(const s of series){const pts=s.values.map((v,i)=>[l+(labels.length===1?iw/2:i*iw/(labels.length-1)),t+ih*(1-v/max)]);out+=`<polyline fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linejoin="round" points="${pts.map(p=>p.join(',')).join(' ')}"/>`;for(let i=0;i<pts.length;i++)out+=`<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="3.4" fill="${s.color}"><title>${esc(s.name)} ${esc(labels[i])}: ${fmt(s.values[i])}</title></circle>`}return out+'</svg>'}
function drawTrend(){const by=aggregate(x=>x.r.activity_date).sort((a,b)=>a.name.localeCompare(b.name));const chosen=$('trendMetric').value;const series=SERIES.filter(s=>chosen==='all'||s[0]===chosen).map(([key,name,color])=>({name,color,values:by.map(x=>x[key])}));$('trendChart').innerHTML=by.length?svgLine(series,by.map(x=>{const [y,m,d]=x.name.split('-');return `${Number(d)} ${new Date(`${y}-${m}-01`).toLocaleDateString('id-ID',{month:'short'})}`})):'<div class="empty">Belum ada aktivitas pada periode ini</div>';$('trendLegend').innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}
function drawActivity(){const by=aggregate(x=>typeName(x.d.activity_type));const all=[...TYPES.map(x=>x[1]),...by.map(x=>x.name).filter(x=>!TYPES.some(t=>t[1]===x))].map(name=>by.find(x=>x.name===name)||{name,activities:0,leads:0,prospects:0,po:0});const metric=$('activityMetric').value,opts=[['activities','Aktivitas',COLORS[0]],['leads','Lead',COLORS[1]],['prospects','Prospek',COLORS[2]],['po','PO',COLORS[3]]].filter(s=>metric==='all'||s[0]===metric);const W=750,H=260,l=38,r=10,t=15,b=69,iw=W-l-r,ih=H-t-b,max=Math.max(1,...all.flatMap(x=>opts.map(o=>x[o[0]])));let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Grafik perbandingan enam jenis aktivitas">`;for(let i=0;i<=4;i++){let y=t+ih*i/4;svg+=`<line x1="${l}" y1="${y}" x2="${W-r}" y2="${y}" stroke="#e5edf6"/><text x="${l-7}" y="${y+3}" text-anchor="end" font-size="10" fill="#7891ad">${fmt(Math.round(max*(4-i)/4))}</text>`}all.forEach((a,i)=>{let group=iw/all.length,bar=Math.min(19,group/(opts.length+1)),x0=l+i*group+group/2-opts.length*bar/2;opts.forEach((o,j)=>{const v=a[o[0]],h=ih*v/max;svg+=`<rect x="${x0+j*bar}" y="${t+ih-h}" width="${bar-2}" height="${h}" rx="2" fill="${o[2]}"><title>${esc(a.name)} · ${o[1]}: ${fmt(v)}</title></rect>`});const label=a.name.replace(' Customer','').replace(' Social Media',' Social').replace(' Corporate Visit',' Visit').replace('Komunitas ','');svg+=`<text x="${l+i*group+group/2}" y="${H-36}" text-anchor="middle" font-size="10" fill="#587391">${esc(label.length>17?label.slice(0,16)+'…':label)}</text>`});$('activityChart').innerHTML=svg+'</svg>';$('activityLegend').innerHTML=opts.map(o=>`<span><i style="background:${o[2]}"></i>${o[1]}</span>`).join('')}
function drawRankings(){for(const [id,key,sortId] of [['amdRows',x=>x.amd,'amdSort'],['branchRows',x=>x.r.entered_branch||'Tanpa Cabang','branchSort']]){const groups=aggregate(key).sort((a,b)=>b[$(sortId).value]-a[$(sortId).value]||a.name.localeCompare(b.name));$(id).innerHTML=groups.length?groups.map((g,i)=>`<tr><td class="rank">${i+1}</td><td title="${esc(g.name)}">${esc(g.name)}</td><td>${fmt(g.activities)}</td><td>${fmt(g.leads)}</td><td>${fmt(g.prospects)}</td>${id==='amdRows'?`<td>${fmt(g.hot)}</td>`:''}<td>${fmt(g.po)}</td><td class="cvr">${g.leads?(g.po/g.leads*100).toFixed(1).replace('.',','):'0'}%</td></tr>`).join(''):'<tr><td class="empty" colspan="8">Belum ada data</td></tr>'}}
function drawDonut(){const by=aggregate(x=>typeName(x.d.activity_type));const groups=TYPES.map((x,i)=>({name:x[1],value:by.find(y=>y.name===x[1])?.activities||0,color:COLORS[i]}));const total=groups.reduce((s,x)=>s+x.value,0);let pos=0;const segments=groups.map(g=>{const a=pos,b=pos+(total?g.value/total*100:0);pos=b;return `${g.color} ${a}% ${b}%`});$('donutWrap').innerHTML=`<div class="donut-layout"><div class="donut" style="background:${total?`conic-gradient(${segments.join(',')})`:'#e8eef7'}"><div class="donut-hole"><strong>${fmt(total)}</strong><span>Total Aktivitas</span></div></div><div class="donut-legend">${groups.map(g=>`<div><span><i style="background:${g.color}"></i>${esc(g.name)}</span><b>${total?(g.value/total*100).toFixed(1).replace('.',','):'0'}%</b></div>`).join('')}</div></div>`}
function visibleRows(){const q=$('tableSearch').value.trim().toLowerCase();return rows.filter(({r,d,amd})=>!q||[r.activity_date,r.entered_name,r.entered_branch,amd,typeName(d.activity_type),r.match_status].some(x=>String(x||'').toLowerCase().includes(q))).sort((a,b)=>String(b.r.activity_date).localeCompare(String(a.r.activity_date)))}
let managerGroups = [];
function groupManagerRows(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const {r,d,amd} = entry;
    const name = String(r.entered_name || 'Tanpa nama').trim().replace(/\s+/g,' ');
    const key = name.toLocaleLowerCase('id-ID');
    if (!groups.has(key)) groups.set(key, {name, reports:[], reportMap:new Map(), branches:new Set(), amds:new Set(), activities:0, leads:0, prospects:0, hot:0, po:0});
    const g = groups.get(key);
    g.branches.add(r.entered_branch || '—'); g.amds.add(amd);
    if (!g.reportMap.has(r.id)) {
      const report = {...r, activity_details:[]};
      g.reportMap.set(r.id,report); g.reports.push(report);
    }
    g.reportMap.get(r.id).activity_details.push(d);
    g.activities++; g.leads+=n(d.leads); g.prospects+=n(d.prospects); g.hot+=n(d.hot_prospects); g.po+=n(d.po);
  }
  return [...groups.values()].sort((a,b)=>b.activities-a.activities || a.name.localeCompare(b.name));
}
function salesWhatsAppLinks(reports) {
  const numbers = new Set();
  for (const report of reports || []) {
    let value = String(report.whatsapp ?? '').trim();
    if (!/^[+\d\s().-]+$/.test(value)) continue;
    value = value.replace(/\D/g, '');
    if (value.startsWith('0062')) value = value.slice(2);
    else if (value.startsWith('0')) value = '62' + value.slice(1);
    else if (value.startsWith('8')) value = '62' + value;
    if (/^62\d{8,13}$/.test(value)) numbers.add(value);
  }
  if (!numbers.size) return '<span class="muted">—</span>';
  return `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px">${[...numbers].map(number =>
    `<a href="https://wa.me/${number}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +${number}" title="+${number}" style="color:#18734b;text-decoration:underline;text-underline-offset:3px;font-size:13px;font-weight:600;white-space:nowrap">Whatsapp</a>`
  ).join('')}</div>`;
}

function drawTable() {
  managerGroups = groupManagerRows(visibleRows());
  const all=managerGroups,limit=15,pages=Math.max(1,Math.ceil(all.length/limit));
  page=Math.max(0,Math.min(page,pages-1));
  $('reportCount').textContent=fmt(all.length);
  $('adminDetail').innerHTML='';
  $('reportRows').innerHTML=all.slice(page*limit,(page+1)*limit).map((g,i)=>`<tr>
    <td>${page*limit+i+1}</td><td><b>${esc(g.name)}</b></td><td>${salesWhatsAppLinks(g.reports)}</td>
    <td>${esc([...g.amds].join(', '))}</td><td>${esc([...g.branches].join(', '))}</td>
    <td>${fmt(g.reports.length)}</td><td>${fmt(g.activities)}</td>
    <td>${fmt(g.leads)}</td><td>${fmt(g.prospects)}</td><td>${fmt(g.hot)}</td><td>${fmt(g.po)}</td>
    <td><button type="button" class="manager-detail-btn" data-manager-detail="${page*limit+i}">Detail →</button></td>
  </tr>`).join('') || '<tr><td class="empty" colspan="12">Tidak ada laporan sesuai filter</td></tr>';
  $('reportRows').querySelectorAll('[data-manager-detail]').forEach(button=>{
    button.onclick=()=>showManagerDetail(Number(button.dataset.managerDetail));
  });
  $('paginationLabel').textContent=`Menampilkan ${all.length?1+page*limit:0}–${Math.min((page+1)*limit,all.length)} dari ${fmt(all.length)} Sales Counter`;
  $('prevPage').disabled=page===0;$('nextPage').disabled=page>=pages-1;
}
function managerHeaders() {
  const headers = {};
  try {
    const session=JSON.parse(sessionStorage.getItem('admin_session')||'null');
    if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
  } catch(e) {}
  const query=new URLSearchParams(location.search);
  const token=query.get('token')||query.get('supervisor');
  if(token)headers['x-supervisor-token']=token;
  return headers;
}
async function openManagerPhoto(id) {
  const popup=window.open('about:blank','_blank');
  if(popup)popup.opener=null;
  try {
    const response=await fetch('/api/photo?id='+encodeURIComponent(id),{headers:managerHeaders(),cache:'no-store'});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Foto gagal dimuat');
    if(popup)popup.location.href=result.url;
    else alert('Izinkan pop-up untuk melihat foto.');
  } catch(error) {if(popup)popup.close();alert(error.message);}
}

function exportExcel(){if(!loaded)return alert('Data belum dimuat');if(typeof XLSX==='undefined')return alert('Library Excel belum berhasil dimuat');const entries=visibleRows().map(({r,d,amd})=>({'Tanggal':r.activity_date,'AMD':amd,'Cabang':r.entered_branch,'Sales Counter':r.entered_name,'Jenis Aktivitas':typeName(d.activity_type),'Lead':n(d.leads),'Prospek':n(d.prospects),'Hot Prospek':n(d.hot_prospects),'PO':n(d.po),'Kecocokan Master':r.match_status==='matched'?'Sesuai':'Belum Sesuai'}));const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(entries.length?entries:[{'Keterangan':'Tidak ada laporan'}]),'Detail Aktivitas');XLSX.writeFile(book,`Thamrin_SalesCounter_${$('start').value}_sd_${$('end').value}.xlsx`)}
const DETAIL_TYPES=[
{id:'follow_up_ro',title:'Follow Up Customer RO',fields:[['jenis','Jenis Follow Up Customer RO?','multi','WhatsApp|Call'],['jumlah','Berapa customer RO yang di-follow up?','num'],['leads','Berapa Leads yang dihasilkan?','num'],['prospects','Berapa Prospek yang dihasilkan?','num'],['hot_prospects','Berapa Hot Prospek yang dihasilkan?','num'],['po','Berapa PO yang dihasilkan?','num'],['kendala','Apa kendala utama saat follow up?','select','Tidak merespons|Belum butuh motor|Keberatan harga/DP|Memilih kompetitor|Tidak ada kendala|Lainnya'],['foto','Upload bukti follow-up','photo']]},
{id:'live_social_media',title:'Live Social Media',fields:[['platform','Platform apa yang digunakan untuk live?','multi','TikTok|Facebook|Instagram|Lainnya'],['username','Apa username akun yang digunakan untuk live?','text'],['frame','Apakah menggunakan frame standar Yamaha saat live?','select','Ya|Tidak'],['durasi','Berapa total durasi live (menit)?','num'],['penonton','Berapa rata-rata penonton selama live?','num'],['leads','Berapa leads yang dihasilkan dari live?','num'],['prospects','Berapa prospek yang dihasilkan dari live?','num'],['foto','Upload dokumentasi aktivitas live','photo']]},
{id:'komunitas_gathering',title:'Komunitas Gathering',fields:[['komunitas','Nama komunitas yang mengikuti gathering?','text'],['lokasi','Lokasi gathering?','text'],['tanggal','Tanggal gathering?','date'],['peserta','Berapa peserta hadir?','num'],['leads','Berapa leads dihasilkan?','num'],['jenis','Apa jenis komunitas?','select','Motor|Perusahaan|Olahraga|Hobi|Lainnya'],['display','Apakah ada unit display atau test ride?','select','Tidak ada|Unit display|Test ride|Keduanya'],['followup','Berapa peserta bersedia di-follow up?','num'],['foto','Upload dokumentasi gathering','photo']]},
{id:'fleet_corporate_visit',title:'Fleet / Corporate Visit',fields:[['instansi','Nama perusahaan/instansi dikunjungi','text'],['lokasi','Lokasi perusahaan/instansi','text'],['jenis','Jenis instansi','select','Swasta|Pemerintah|BUMN/BUMD|Sekolah/Universitas|Lainnya'],['customer','Berapa calon customer ditemui?','num'],['leads','Berapa leads dihasilkan?','num'],['foto','Upload dokumentasi Fleet','photo'],['pic','Siapa PIC perusahaan yang berhasil ditemui?','text'],['penawaran','Apa jenis penawaran yang diberikan?','select','Pembelian kolektif|Kredit karyawan|Operasional|Lainnya'],['jadwal','Apakah sudah ada jadwal follow up berikutnya?','select','Ya|Tidak'],['kendala','Apa kendala utama penawaran Fleet?','text']]},
{id:'showroom_event',title:'Showroom Event',fields:[['nama','Nama/tema Showroom Event','text'],['tanggal','Tanggal pelaksanaan','date'],['jenis','Jenis kegiatan','select','Customer Gathering|Product Exhibition|Test Ride|Promo Showroom|Lainnya'],['customer','Jumlah customer hadir','num'],['leads','Leads dihasilkan','num'],['sumber','Dari mana sumber customer yang hadir?','multi','Walk-in|Undangan sales|Database RO|Social media|Lainnya']]},
{id:'iklan_berbayar',title:'Iklan Berbayar',fields:[['platform','Platform iklan','multi','Facebook Ads|Instagram Ads|TikTok Ads|Lainnya'],['akun','Nama akun iklan','text'],['biaya','Total biaya iklan (Rp)','num'],['durasi','Durasi iklan (hari)','num'],['leads','Leads dihasilkan','num'],['prospects','Prospek dihasilkan','num'],['foto','Upload bukti iklan','photo'],['reach','Berapa jumlah orang dijangkau iklan (Reach)?','num'],['wilayah','Wilayah target iklan?','text']]}];

function showManagerDetail(i) {
  const x = managerGroups[i];
  const panel = $('adminDetail');
  if (!x || !panel) return;

  const count = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const answerText = value => {
    if (value == null || value === '') return '—';
    if (Array.isArray(value)) return value.length ? value.map(answerText).join(', ') : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  panel.innerHTML = `
<style>#adminDetail{font-family:"Segoe UI",Arial,sans-serif;color:#18334f;font-size:14px;line-height:1.55}
#adminDetail *{box-sizing:border-box}
#adminDetail .admin-detail{margin-top:24px;padding:24px;background:#f4f7fb;border:1px solid #dce5ef;border-radius:18px}
#adminDetail .admin-detail-head{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}
#adminDetail .admin-detail-head h3{margin:0;font-size:20px;line-height:1.4;overflow-wrap:anywhere}
#adminDetail .btn{font-family:inherit;font-size:13px;font-weight:600;line-height:1.4;display:inline-flex;justify-content:center;align-items:center;min-height:38px;padding:9px 14px;border:1px solid #cddceb;background:#fff;color:#215c91;border-radius:9px;cursor:pointer;flex-shrink:0}
#adminDetail .btn:hover{background:#edf5ff;border-color:#91b6db}
#adminDetail .btn:focus-visible{outline:3px solid #8dc4ff;outline-offset:2px}
#adminDetail .admin-report-card{border:1px solid #dce5ef;border-radius:14px;margin-top:18px;background:#fff;overflow:hidden}
#adminDetail .admin-report{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;background:#fff;border-bottom:1px solid #e7edf5;overflow-wrap:anywhere}
#adminDetail .admin-report b{font-size:15px}
#adminDetail .muted{font-size:12px;color:#748399}
#adminDetail .admin-report small{display:block;font-size:10px;color:#94a0b0;margin-top:3px}
#adminDetail .admin-danger{color:#ba3434!important;background:#fff!important;border-color:#efcaca!important;font-size:12px}
#adminDetail .admin-danger:hover{background:#fff2f2!important}
#adminDetail .admin-activity{margin:18px;padding:22px;border:1px solid #e2e9f2;border-radius:12px;background:#fff;min-width:0}
#adminDetail .admin-activity h4{margin:0 0 18px;font-size:17px;font-weight:700;color:#183e65}
#adminDetail .admin-activity-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
#adminDetail .admin-activity-stats>div{background:#f1f6fd;border:1px solid #e3edf9;border-radius:10px;padding:14px 16px}
#adminDetail .admin-activity-stats>div:nth-child(2){background:#f3f0fc;border-color:#eae4f8}
#adminDetail .admin-activity-stats>div:nth-child(3){background:#fff5ed;border-color:#ffeadb}
#adminDetail .admin-activity-stats>div:nth-child(4){background:#edf8f3;border-color:#def0e7}
#adminDetail .admin-activity-stats b{display:block;font-size:27px;line-height:1.2;font-weight:750;color:#225b98;overflow-wrap:anywhere}
#adminDetail .admin-activity-stats>div:nth-child(2) b{color:#7453ac}
#adminDetail .admin-activity-stats>div:nth-child(3) b{color:#b9732d}
#adminDetail .admin-activity-stats>div:nth-child(4) b{color:#27815c}
#adminDetail .admin-activity-stats small{display:block;font-size:12px;font-weight:600;color:#63768c;margin-top:7px}
#adminDetail .admin-activity h5{margin:24px 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#7d8da0}
#adminDetail .admin-answers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;margin:0 0 16px}
#adminDetail .admin-answers>div{padding:13px 0;border-bottom:1px solid #edf1f6;min-width:0}
#adminDetail .admin-answers dt{font-size:12px;font-weight:400;line-height:1.5;color:#748399;overflow-wrap:anywhere}
#adminDetail .admin-answers dd{margin:5px 0 0;font-size:14px;font-weight:600;line-height:1.6;color:#253f59;white-space:pre-wrap;overflow-wrap:anywhere}
#adminDetail .actions{display:flex;flex-wrap:wrap;gap:8px}
#adminDetail .admin-no-activity{padding:0 22px}
@media(max-width:640px){#adminDetail .admin-detail{padding:12px;border-radius:12px}#adminDetail .admin-detail-head h3{font-size:17px}#adminDetail .admin-report{padding:16px;align-items:flex-start;flex-direction:column}#adminDetail .admin-activity{margin:10px;padding:16px}#adminDetail .admin-activity-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#adminDetail .admin-activity-stats>div{padding:12px}#adminDetail .admin-answers{grid-template-columns:1fr}#adminDetail .admin-activity h4{font-size:16px}}
</style>
    <div class="admin-detail">
      <div class="actions admin-detail-head">
        <h3>Detail Laporan • ${esc(x.name)}</h3>
        <button type="button" class="btn" data-close-detail>Tutup</button>
      </div>
      ${x.reports.map((r, reportIndex) => `
        <section class="admin-report-card">
          <div class="admin-report">
            <div>
              <b>${esc(r.activity_date)}</b> · ${esc(r.entered_branch)}
              <div class="muted">WhatsApp: ${esc(r.whatsapp || '—')}</div>
              <small class="muted">ID: ${esc(r.id)}</small>
            </div>
          </div>
          ${(r.activity_details || []).map(d => {
            const definition = DETAIL_TYPES.find(t => t.id === d.activity_type);
            const answers = d.answers && typeof d.answers === 'object'
              && !Array.isArray(d.answers) ? d.answers : {};
            const photos = d.activity_photos || [];
            return `
              <article class="admin-activity">
                <h4>${esc(definition?.title || d.activity_type || 'Aktivitas')}</h4>
                <div class="admin-activity-stats">
                  <div><b>${count(d.leads)}</b><small>Lead</small></div>
                  <div><b>${count(d.prospects)}</b><small>Prospek</small></div>
                  <div><b>${count(d.hot_prospects)}</b><small>Hot Prospek</small></div>
                  <div><b>${count(d.po)}</b><small>PO</small></div>
                </div>
                <h5>Jawaban Form</h5>
                <dl class="admin-answers">
                  ${Object.entries(answers).sort(([a], [b]) => {
                    const keys = (definition?.fields || []).map(f => f[0]);
                    const rank = key => keys.includes(key) ? keys.indexOf(key) : keys.length;
                    return rank(a) - rank(b);
                  }).map(([key, value]) => {
                    const field = definition?.fields.find(f => f[0] === key);
                    return `<div><dt>${esc(field?.[1] || key)}</dt>
                      <dd>${esc(answerText(value))}</dd></div>`;
                  }).join('') || '<div><dd>Belum ada jawaban tersimpan.</dd></div>'}
                </dl>
                <div class="actions">
                  ${photos.map((p, photoIndex) => `
                    <button type="button" class="btn" data-photo-id="${esc(p.id)}">
                      Lihat Foto ${photoIndex + 1}
                    </button>`).join('')}
                </div>
              </article>`;
          }).join('') || '<p class="muted admin-no-activity">Tanpa aktivitas.</p>'}
        </section>
      `).join('') || '<p class="muted">Belum ada laporan.</p>'}
    </div>`;

  panel.querySelector('[data-close-detail]').onclick = () => {
    panel.innerHTML = '';
  };
  panel.querySelectorAll('[data-photo-id]').forEach(button => {
    button.onclick = () => openManagerPhoto(button.dataset.photoId);
  });
  panel.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

init();
