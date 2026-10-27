let CFG=null,auth=null,view=location.pathname.endsWith('/admin.html')?'admin':'form',branches={},superToken=(new URLSearchParams(location.search).get('token')||new URLSearchParams(location.search).get('supervisor')||''),lastData=null,importFile=null;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const TYPES=[
{id:'follow_up_ro',title:'Follow Up Customer RO',fields:[['jenis','Jenis Follow Up Customer RO?','multi','WhatsApp|Call'],['jumlah','Berapa customer RO yang di-follow up?','num'],['leads','Berapa Leads yang dihasilkan?','num'],['prospects','Berapa Prospek yang dihasilkan?','num'],['hot_prospects','Berapa Hot Prospek yang dihasilkan?','num'],['po','Berapa PO yang dihasilkan?','num'],['kendala','Apa kendala utama saat follow up?','select','Tidak merespons|Belum butuh motor|Keberatan harga/DP|Memilih kompetitor|Tidak ada kendala|Lainnya'],['foto','Upload bukti follow-up','photo']]},
{id:'live_social_media',title:'Live Social Media',fields:[['platform','Platform apa yang digunakan untuk live?','multi','TikTok|Facebook|Instagram|Lainnya'],['username','Apa username akun yang digunakan untuk live?','text'],['frame','Apakah menggunakan frame standar Yamaha saat live?','select','Ya|Tidak'],['durasi','Berapa total durasi live (menit)?','num'],['penonton','Berapa rata-rata penonton selama live?','num'],['leads','Berapa leads yang dihasilkan dari live?','num'],['prospects','Berapa prospek yang dihasilkan dari live?','num'],['foto','Upload dokumentasi aktivitas live','photo']]},
{id:'komunitas_gathering',title:'Komunitas Gathering',fields:[['komunitas','Nama komunitas yang mengikuti gathering?','text'],['lokasi','Lokasi gathering?','text'],['tanggal','Tanggal gathering?','date'],['peserta','Berapa peserta hadir?','num'],['leads','Berapa leads dihasilkan?','num'],['jenis','Apa jenis komunitas?','select','Motor|Perusahaan|Olahraga|Hobi|Lainnya'],['display','Apakah ada unit display atau test ride?','select','Tidak ada|Unit display|Test ride|Keduanya'],['followup','Berapa peserta bersedia di-follow up?','num'],['foto','Upload dokumentasi gathering','photo']]},
{id:'fleet_corporate_visit',title:'Fleet / Corporate Visit',fields:[['instansi','Nama perusahaan/instansi dikunjungi','text'],['lokasi','Lokasi perusahaan/instansi','text'],['jenis','Jenis instansi','select','Swasta|Pemerintah|BUMN/BUMD|Sekolah/Universitas|Lainnya'],['customer','Berapa calon customer ditemui?','num'],['leads','Berapa leads dihasilkan?','num'],['foto','Upload dokumentasi Fleet','photo'],['pic','Siapa PIC perusahaan yang berhasil ditemui?','text'],['penawaran','Apa jenis penawaran yang diberikan?','select','Pembelian kolektif|Kredit karyawan|Operasional|Lainnya'],['jadwal','Apakah sudah ada jadwal follow up berikutnya?','select','Ya|Tidak'],['kendala','Apa kendala utama penawaran Fleet?','text']]},
{id:'showroom_event',title:'Showroom Event',fields:[['nama','Nama/tema Showroom Event','text'],['tanggal','Tanggal pelaksanaan','date'],['jenis','Jenis kegiatan','select','Customer Gathering|Product Exhibition|Test Ride|Promo Showroom|Lainnya'],['customer','Jumlah customer hadir','num'],['leads','Leads dihasilkan','num'],['sumber','Dari mana sumber customer yang hadir?','multi','Walk-in|Undangan sales|Database RO|Social media|Lainnya']]},
{id:'iklan_berbayar',title:'Iklan Berbayar',fields:[['platform','Platform iklan','multi','Facebook Ads|Instagram Ads|TikTok Ads|Lainnya'],['akun','Nama akun iklan','text'],['biaya','Total biaya iklan (Rp)','num'],['durasi','Durasi iklan (hari)','num'],['leads','Leads dihasilkan','num'],['prospects','Prospek dihasilkan','num'],['foto','Upload bukti iklan','photo'],['reach','Berapa jumlah orang dijangkau iklan (Reach)?','num'],['wilayah','Wilayah target iklan?','text']]}];
const app=()=>$('#app');function go(v){if(v==='admin'){location.href='/admin.html';return}if(v==='form'){location.href='/';return}view=v;render()}
function field(t,f){const [key,label,type,options]=f,id=`${t.id}_${key}`,base=`data-type="${t.id}" data-key="${key}"`;let input='';if(type==='num')input=`<input type="number" min="0" step="1" ${base} value="0">`;else if(type==='date')input=`<input type="date" ${base} value="${today()}">`;else if(type==='text')input=`<input ${base} maxlength="300" placeholder="Isi jawaban...">`;else if(type==='select')input=`<select ${base}><option value="">Pilih jawaban</option>${options.split('|').map(x=>`<option>${esc(x)}</option>`).join('')}</select>`;else if(type==='multi')input=`<div class="actions">${options.split('|').map(x=>`<label class="choice" style="font-size:13px"><input type="checkbox" ${base} value="${esc(x)}">${esc(x)}</label>`).join('')}</div>`;else if(type==='photo')input=`<input type="file" ${base} accept="image/jpeg,image/png,image/webp" multiple><div class="hint">Maksimal 8 foto per aktivitas, masing-masing 5MB.</div>`;return `<div class="field"><label>${esc(label)}</label>${input}</div>`}
function form(){return `<div class="hero"><div class="brand" style="color:#cfe8ff">LAPORAN AKTIVITAS HARIAN</div><h1>Aktivitas Sales Counter</h1><p>Isi laporan harian dari HP, pilih aktivitas yang dilakukan, lalu kirim.</p></div><form class="card" id="salesForm"><h2>01 • Identitas Sales Counter</h2><div class="grid"><div class="field"><label>Nama lengkap <span class="req">*</span></label><input name="name" required minlength="3" placeholder="Nama sesuai master"></div><div class="field"><label>Cabang <span class="req">*</span></label><select name="branch" required><option value="">Pilih cabang</option>${Object.keys(branches).sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="field"><label>Nomor WhatsApp aktif <span class="req">*</span></label><input name="wa" type="tel" required placeholder="081234567890"></div><div class="field"><label>Tanggal aktivitas <span class="req">*</span></label><input name="date" type="date" required value="${today()}" max="${today()}"></div></div><h2 style="margin-top:18px">02 • Pilih Aktivitas</h2><div class="choices">${TYPES.map(t=>`<label class="choice"><input type="checkbox" class="activityPick" value="${t.id}" onchange="sections()">${t.title}</label>`).join('')}</div><div id="sections"></div><div class="actions" style="margin-top:22px"><button class="btn primary" type="submit" id="submitBtn">Kirim Laporan</button></div><div id="formMsg"></div></form>`}
function sections(){let picks=[...document.querySelectorAll('.activityPick:checked')].map(x=>x.value);$('#sections').innerHTML=TYPES.filter(x=>picks.includes(x.id)).map(t=>`<div class="section"><h3>${esc(t.title)}</h3>${t.fields.map(f=>field(t,f)).join('')}</div>`).join('')}
const asWa=s=>{let n=String(s||'').replace(/\D/g,'');if(n.startsWith('0'))n='62'+n.slice(1);if(n.startsWith('8'))n='62'+n;return n};
async function sendReport(ev){ev.preventDefault();let form=ev.target,picks=[...document.querySelectorAll('.activityPick:checked')].map(x=>x.value),msg=$('#formMsg');if(!picks.length){msg.innerHTML='<div class="notice error">Pilih minimal satu aktivitas.</div>';return}const wa=asWa(form.elements.wa.value);if(!/^62\d{8,13}$/.test(wa)){msg.innerHTML='<div class="notice error">Nomor WhatsApp tidak valid.</div>';return}
 let photos=[],items=[];for(const t of TYPES.filter(x=>picks.includes(x.id))){let answers={},files=[];for(const f of t.fields){const [key,,type]=f,els=[...document.querySelectorAll(`[data-type="${t.id}"][data-key="${key}"]`)];if(type==='multi')answers[key]=els.filter(x=>x.checked).map(x=>x.value);else if(type==='photo'){files=[...els[0].files];if(files.length>8||files.some(x=>x.size>5*1024*1024)){msg.innerHTML='<div class="notice error">Maksimal 8 foto per aktivitas, 5MB per foto.</div>';return}}else answers[key]=els[0]?.value||''}
 items.push({type:t.id,answers,leads:Number(answers.leads)||0,prospects:Number(answers.prospects)||0,hot_prospects:Number(answers.hot_prospects)||0,po:Number(answers.po)||0});photos.push({type:t.id,files})}
 $('#submitBtn').disabled=true;msg.innerHTML='<div class="notice">Mengirim laporan ke database...</div>';try{let r=await api('/api/submit',{method:'POST',body:JSON.stringify({name:form.elements.name.value,branch:form.elements.branch.value,whatsapp:wa,date:form.elements.date.value,activities:items})});let failed=0;for(const p of photos){const detail=r.details.find(x=>x.activity_type===p.type);for(const f of p.files){try{const data=await fileBase64(f);await api('/api/photo',{method:'POST',body:JSON.stringify({reportId:r.reportId,detailId:detail.id,data,mime:f.type})})}catch(e){failed++}}}msg.innerHTML=`<div class="notice">Laporan berhasil disimpan! ${r.matched?'Nama cocok dengan master.':'Nama belum cocok dengan master dan perlu diperiksa Admin.'}${failed?` ${failed} foto gagal terunggah.`:''}</div>`;form.reset();sections()}catch(e){msg.innerHTML=`<div class="notice error">${esc(e.message)}</div>`}finally{$('#submitBtn').disabled=false}}
const fileBase64=f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(f)});
async function api(url,opt={}){const h={'Content-Type':'application/json',...(opt.headers||{})};if(auth?.access_token)h.Authorization=`Bearer ${auth.access_token}`;if(superToken)h['x-supervisor-token']=superToken;let r=await fetch(url,{...opt,headers:h}),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||`Permintaan gagal (HTTP ${r.status}) pada ${url}. Periksa Network dan Vercel Logs.`);return j}
function adminPage(){return `<div class="hero"><div class="brand" style="color:#cfe8ff">ADMIN • SALES COUNTER</div><h1>Kelola Laporan</h1><p>Ringkasan sederhana, update master, dan export data.</p></div>${auth?`<div class="card"><div class="actions"><button type="button" class="btn primary" onclick="openAuthorizedManager()">Lihat Dashboard Manager</button><button class="btn" onclick="logout()">Keluar</button></div></div><div class="card"><h2>Rekap Sales Counter</h2><p class="muted">Satu baris per Sales Counter. Klik Detail untuk melihat dan menghapus laporan tertentu.</p><div class="grid"><div class="field"><label>Dari Tanggal</label><input type="date" id="adminFrom" onchange="paintAdminTable()"></div><div class="field"><label>Sampai Tanggal</label><input type="date" id="adminTo" onchange="paintAdminTable()"></div><div class="field"><label>AMD</label><select id="adminAmd" onchange="paintAdminTable()"><option value="">Semua AMD</option>${[...new Set(Object.values(branches))].filter(Boolean).sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="field"><label>Cabang</label><select id="adminBranch" onchange="paintAdminTable()"><option value="">Semua Cabang</option>${Object.keys(branches).sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="field"><label>Cari Nama</label><input id="adminSearch" placeholder="Nama Sales Counter" oninput="paintAdminTable()"></div></div><div class="actions"><button class="btn primary" onclick="loadAdminTable()">↻ Refresh</button><button class="btn" onclick="exportReportsXLSX()" id="downloadReportsBtn">↓ Download Excel Semua Laporan</button></div><div id="downloadReportsMsg"></div><div id="adminSummary"></div><div id="adminTable"></div><div id="adminDetail"></div></div><div class="card"><h2>Update Master Karyawan</h2><p class="muted">Upload Excel jika ada perubahan karyawan atau PO. Format tetap data (75).xlsx.</p><input id="masterFile" type="file" accept=".xlsx,.xls" onchange="masterPreview()"><div id="preview"></div></div>`:`<div class="card" style="max-width:480px;margin-left:auto;margin-right:auto"><h2>Login Admin</h2><form id="loginForm"><div class="field"><label>Email Admin</label><input name="email" type="email" required></div><div class="field"><label>Password</label><input name="password" type="password" required></div><button class="btn primary">Masuk</button><div id="loginMsg"></div></form></div>`}`}
let adminReports=[];
async function loadAdminTable(){const el=$('#adminTable');if(!el)return;el.innerHTML='<p class="muted">Mengambil laporan...</p>';try{const result=await api('/api/reports');adminReports=result.reports||[];paintAdminTable();if(result.truncated)el.insertAdjacentHTML('afterbegin','<div class="notice error">Data melebihi 10.000 laporan. Sebagian belum ditampilkan.</div>')}catch(e){el.innerHTML=`<div class="notice error">${esc(e.message)}</div>`}}
function adminFiltered(){const from=$('#adminFrom')?.value||'',to=$('#adminTo')?.value||'',amd=$('#adminAmd')?.value||'',branch=$('#adminBranch')?.value||'',name=($('#adminSearch')?.value||'').trim().toLowerCase();return adminReports.filter(r=>(!from||r.activity_date>=from)&&(!to||r.activity_date<=to)&&(!amd||branches[r.entered_branch]===amd)&&(!branch||r.entered_branch===branch)&&(!name||r.entered_name.toLowerCase().includes(name)))}
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

function paintAdminTable(){const el=$('#adminTable');if(!el)return;const rs=adminFiltered(),groups=new Map();for(const r of rs){const key=(r.sales_counter_id||r.entered_name.toLowerCase()+'|'+r.entered_branch)+'|'+r.entered_branch;let x=groups.get(key);if(!x){x={name:r.entered_name,branch:r.entered_branch,reports:[],activity:0,lead:0,prospek:0,hot:0,po:0};groups.set(key,x)}x.reports.push(r);for(const d of r.activity_details||[]){x.activity++;x.lead+=Number(d.leads)||0;x.prospek+=Number(d.prospects)||0;x.hot+=Number(d.hot_prospects)||0;x.po+=Number(d.po)||0}}const rows=[...groups.values()].sort((a,b)=>b.activity-a.activity);const sums=rows.reduce((a,r)=>{a.act+=r.activity;a.lead+=r.lead;a.po+=r.po;return a},{act:0,lead:0,po:0});$('#adminSummary').innerHTML=`<div class="admin-kpis"><div><b>${rows.length}</b><small>Sales Counter</small></div><div><b>${rs.length}</b><small>Laporan</small></div><div><b>${sums.act}</b><small>Aktivitas</small></div><div><b>${sums.lead}</b><small>Lead</small></div><div><b>${sums.po}</b><small>PO</small></div></div>`;el.innerHTML=`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Sales Counter</th><th>WhatsApp</th><th>AMD</th><th>Cabang</th><th>Laporan</th><th>Aktivitas</th><th>Lead</th><th>Prospek</th><th>Hot</th><th>PO</th><th>Aksi</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td><b>${esc(x.name)}</b></td><td>${salesWhatsAppLinks(x.reports)}</td><td>${esc(branches[x.branch]||'-')}</td><td>${esc(x.branch)}</td><td>${x.reports.length}</td><td>${x.activity}</td><td>${x.lead}</td><td>${x.prospek}</td><td>${x.hot}</td><td>${x.po}</td><td><button class="btn" onclick="showAdminDetail(${i})">Detail</button></td></tr>`).join('')||'<tr><td colspan="11">Belum ada laporan sesuai filter.</td></tr>'}</tbody></table></div>`;window._adminGroups=rows;const d=$('#adminDetail');if(d)d.innerHTML=''}
function showAdminDetail(i) {
  const x = window._adminGroups?.[i];
  const panel = $('#adminDetail');
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
            <button type="button" class="btn admin-danger"
              data-delete-report="${reportIndex}">Hapus Permanen</button>
          </div>
          ${(r.activity_details || []).map(d => {
            const definition = TYPES.find(t => t.id === d.activity_type);
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
  panel.querySelectorAll('[data-delete-report]').forEach(button => {
    button.onclick = () => deleteAdminReport(x.reports[Number(button.dataset.deleteReport)].id);
  });
  panel.querySelectorAll('[data-photo-id]').forEach(button => {
    button.onclick = () => openPhoto(button.dataset.photoId);
  });
  panel.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

async function deleteAdminReport(id){const r=adminReports.find(x=>x.id===id);if(!r)return;const ok=confirm(`HAPUS PERMANEN laporan berikut?\n\n${r.entered_name} • ${r.entered_branch}\nTanggal: ${r.activity_date}\nAktivitas: ${(r.activity_details||[]).length}\n\nData dan foto tidak bisa dipulihkan.`);if(!ok)return;const confirmText=prompt('Ketik HAPUS untuk mengonfirmasi penghapusan permanen:');if(confirmText!=='HAPUS')return;try{await api('/api/delete-report',{method:'POST',body:JSON.stringify({reportId:id,confirmation:'HAPUS'})});await loadAdminTable();alert('Laporan berhasil dihapus permanen. Dashboard Manager akan terbarui saat refresh.')}catch(e){alert('Gagal menghapus: '+e.message)}}
function dashboardShell(){return `<section class="analytics"><div class="analytics-title"><div><span class="eyebrow">PERFORMANCE OVERVIEW</span><h2>Dashboard Aktivitas Sales Counter</h2><p class="muted">Analisis seluruh laporan yang masuk • Data langsung dari Supabase</p></div><span class="pill" id="lastRefresh">Belum dimuat</span></div><div class="filter-panel"><div class="filter-heading"><b>Filter Analisis</b><span class="muted">Gabungkan beberapa filter untuk mempersempit data</span></div><div class="grid dashboard-filters"><div class="field"><label>Dari Tanggal</label><input type="date" id="filterStart" value="${today()}"></div><div class="field"><label>Sampai Tanggal</label><input type="date" id="filterEnd" value="${today()}"></div><div class="field"><label>AMD</label><select id="filterAmd" onchange="paintDashboard()"><option value="">Semua AMD</option>${[...new Set(Object.values(branches))].filter(Boolean).sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="field"><label>Cabang</label><select id="filterBranch" onchange="paintDashboard()"><option value="">Semua Cabang</option>${Object.keys(branches).sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="field"><label>Sales Counter</label><input id="filterName" placeholder="Cari nama..." oninput="paintDashboard()"></div><div class="field"><label>Jenis Aktivitas</label><select id="filterActivity" onchange="paintDashboard()"><option value="">Semua Aktivitas</option>${TYPES.map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('')}</select></div><div class="field"><label>Kecocokan Master</label><select id="filterMatch" onchange="paintDashboard()"><option value="">Semua Laporan</option><option value="matched">Cocok Master</option><option value="pending">Belum Cocok</option></select></div></div><div class="actions"><button class="btn primary" onclick="loadDashboard()">↻ Terapkan / Refresh</button><button class="btn" onclick="resetDashFilters()">Reset Filter</button><button class="btn" onclick="exportDashboardXLSX()">↓ Download Excel</button></div></div><div id="dashBody"></div></section>`}
function managerPage(){return `<div class="manager-intro"><span class="eyebrow">THAMRIN BROTHERS • SALES COUNTER</span><h1>Sales Activity Intelligence</h1><p>Monitoring aktivitas dan pencapaian Sales Counter secara real-time.</p></div>${dashboardShell()}`}
async function login(e){e.preventDefault();let email=e.target.elements.email.value,password=e.target.elements.password.value;try{let {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');let client=createClient(CFG.url,CFG.key),{data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;auth=data.session;sessionStorage.setItem('admin_session',JSON.stringify(auth));render()}catch(e){$('#loginMsg').innerHTML=`<div class="notice error">${esc(e.message)}</div>`}}
function logout(){auth=null;sessionStorage.removeItem('admin_session');render()}
async function masterPreview(){const f=$('#masterFile').files[0];if(!f)return;importFile=f;$('#preview').innerHTML='<div class="notice">Memeriksa master Excel...</div>';try{let b=await fileBase64(f),r=await api('/api/master',{method:'POST',body:JSON.stringify({filename:f.name,base64:b,confirm:false})});$('#preview').innerHTML=`<div class="notice">${r.count} Sales Counter • ${r.activeZero} Aktif + 0 PO • ${r.added} baru • ${r.changed} berubah • ${r.missing.length} tidak ada di file (perlu review).</div><button class="btn primary" onclick="confirmMaster()">Konfirmasi Update Master</button>`}catch(e){$('#preview').innerHTML=`<div class="notice error">${esc(e.message)}</div>`}}
async function confirmMaster(){if(!importFile)return;$('#preview').innerHTML='<div class="notice">Memperbarui master...</div>';try{let b=await fileBase64(importFile),r=await api('/api/master',{method:'POST',body:JSON.stringify({filename:importFile.name,base64:b,confirm:true})});$('#preview').innerHTML=`<div class="notice">Berhasil! ${r.count} data diproses; ${r.activeZero} Aktif + 0 PO.</div>`;await loadDashboard()}catch(e){$('#preview').innerHTML=`<div class="notice error">${esc(e.message)}</div>`}}
async function makeSupervisor(){try{let r=await api('/api/supervisor');$('#linkResult').innerHTML=`<div class="notice"><b>Link Manager tetap (tidak berubah setiap kali dibuka).</b><p>Manager tinggal refresh untuk memperbarui dashboard. Simpan link ini secara privat.</p><input readonly style="width:100%;padding:12px;border:1px solid #cbd9e8;border-radius:9px" value="${esc(r.url)}"><button class="btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.value)">Salin Link Manager</button></div>`}catch(e){$('#linkResult').innerHTML=`<div class="notice error">${esc(e.message)}</div>`}}
function resetDashFilters(){for(const id of ['filterName','filterBranch','filterAmd','filterActivity','filterMatch'])if($('#'+id))$('#'+id).value='';$('#filterStart').value=today();$('#filterEnd').value=today();loadDashboard()}
async function loadDashboard(){const el=$('#dashBody');if(!el)return;el.innerHTML='<div class="notice">Memuat data terbaru dari Supabase...</div>';try{let start=$('#filterStart').value,end=$('#filterEnd').value;lastData=await api('/api/dashboard?start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end));$('#lastRefresh').textContent='Update: '+new Date().toLocaleTimeString('id-ID');paintDashboard()}catch(e){el.innerHTML=`<div class="notice error">${esc(e.message)}</div>`}}
const num=x=>Number(x)||0;
const typeName=id=>TYPES.find(t=>t.id===id)?.title||id;
function filteredDashboard(){
 if(!lastData)return {roster:[],reports:[],details:[]};
 const name=($('#filterName')?.value||'').toLowerCase(),branch=$('#filterBranch')?.value||'',amd=$('#filterAmd')?.value||'',activity=$('#filterActivity')?.value||'',match=$('#filterMatch')?.value||'';
 const reports=lastData.reports.filter(r=>r.entered_name.toLowerCase().includes(name)&&(!branch||r.entered_branch===branch)&&(!amd||branches[r.entered_branch]===amd)&&(!match||r.match_status===match)&&(!activity||(r.activity_details||[]).some(d=>d.activity_type===activity)));
 const details=reports.flatMap(r=>(r.activity_details||[]).filter(d=>!activity||d.activity_type===activity).map(d=>({r,d})));
 return {roster:[],reports,details};
}
function lineChart(items,keys){
 if(!items.length)return '<div class="empty-chart">Belum ada data untuk ditampilkan</div>';
 const w=900,h=250,l=48,r=18,t=20,b=44,iw=w-l-r,ih=h-t-b,max=Math.max(1,...items.flatMap(x=>keys.map(k=>num(x[k.key]))));
 const X=i=>l+(items.length===1?iw/2:i*iw/(items.length-1)),Y=v=>t+ih-(v/max)*ih;
 let grid='';for(let i=0;i<=4;i++){let y=t+ih*i/4;grid+=`<line x1="${l}" y1="${y}" x2="${w-r}" y2="${y}" stroke="#e6edf6"/><text x="${l-9}" y="${y+4}" text-anchor="end" font-size="11" fill="#7990aa">${Math.round(max*(1-i/4))}</text>`}
 let plots=keys.map(k=>`<polyline fill="none" stroke="${k.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${items.map((x,i)=>X(i)+','+Y(num(x[k.key]))).join(' ')}"/>${items.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(num(x[k.key]))}" r="3.5" fill="${k.color}"><title>${esc(x.label)} • ${esc(k.label)}: ${num(x[k.key])}</title></circle>`).join('')}`).join('');
 const labels=items.filter((x,i)=>items.length<=15||i%Math.ceil(items.length/12)===0||i===items.length-1).map(x=>{let i=items.indexOf(x);return `<text x="${X(i)}" y="${h-17}" text-anchor="middle" font-size="11" fill="#738aa4">${esc(x.label.slice(5)||x.label)}</text>`}).join('');
 return `<div class="chart-scroller"><svg class="trend-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik tren">${grid}${plots}${labels}</svg></div><div class="legend">${keys.map(k=>`<span><i style="background:${k.color}"></i>${esc(k.label)}</span>`).join('')}</div>`;
}
function paintDashboard(){
 if(!lastData||!$('#dashBody'))return;
 const {reports,details}=filteredDashboard(),sum=k=>details.reduce((a,x)=>a+num(x.d[k]),0),totalLeads=sum('leads'),totalProspects=sum('prospects'),totalHot=sum('hot_prospects'),totalPo=sum('po');
 const unique=new Set(reports.map(r=>(r.sales_counter_id||r.entered_name.toLowerCase()+'|'+r.entered_branch))).size;
 const kpis=[['Laporan Masuk',reports.length,'#1464c9'],['Total Aktivitas',details.length,'#0b8a95'],['Total Leads',totalLeads,'#6957d9'],['Total Prospek',totalProspects,'#d48422'],['Hot Prospek',totalHot,'#d34b76'],['Total PO',totalPo,'#138a60'],['Sales Counter Unik',unique,'#34749a']];
 const daily=new Map(),types=new Map(),amds=new Map(),cabangs=new Map();
 for(const r of reports){const day=daily.get(r.activity_date)||{label:r.activity_date,laporan:0,aktivitas:0,leads:0,prospects:0,po:0};day.laporan++;daily.set(r.activity_date,day)}
 for(const {r,d} of details){const day=daily.get(r.activity_date);day.aktivitas++;day.leads+=num(d.leads);day.prospects+=num(d.prospects);day.po+=num(d.po);
  const typ=types.get(d.activity_type)||{name:typeName(d.activity_type),count:0,leads:0,prospects:0,po:0};typ.count++;typ.leads+=num(d.leads);typ.prospects+=num(d.prospects);typ.po+=num(d.po);types.set(d.activity_type,typ);
  for(const [map,key] of [[amds,branches[r.entered_branch]||'Belum Terpetakan'],[cabangs,r.entered_branch]]){const v=map.get(key)||{name:key,aktivitas:0,leads:0,prospects:0,po:0};v.aktivitas++;v.leads+=num(d.leads);v.prospects+=num(d.prospects);v.po+=num(d.po);map.set(key,v)}
 }
 const byDate=[...daily.values()].sort((a,b)=>a.label.localeCompare(b.label));
 const tab=(rows,title)=>`<div class="insight-card"><div class="section-title"><h3>${title}</h3><span class="muted">Urut berdasarkan Leads tertinggi</span></div><div class="tablewrap"><table><thead><tr><th>${title.includes('Aktivitas')?'Jenis Aktivitas':'Area'}</th><th>Aktivitas</th><th>Leads</th><th>Prospek</th><th>PO</th></tr></thead><tbody>${rows.sort((a,b)=>b.leads-a.leads).map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${x.aktivitas??x.count}</td><td>${x.leads}</td><td>${x.prospects}</td><td>${x.po}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada data</td></tr>'}</tbody></table></div></div>`;
 const rows=details.slice().sort((a,b)=>b.r.activity_date.localeCompare(a.r.activity_date)).map(({r,d})=>`<tr><td>${esc(r.activity_date)}</td><td><b>${esc(r.entered_name)}</b><small>${esc(r.whatsapp||'')}</small></td><td>${esc(branches[r.entered_branch]||'—')}</td><td>${esc(r.entered_branch)}</td><td>${esc(typeName(d.activity_type))}</td><td>${num(d.leads)}</td><td>${num(d.prospects)}</td><td>${num(d.hot_prospects)}</td><td>${num(d.po)}</td><td><details class="inline-details"><summary>Lihat</summary>${Object.entries(d.answers||{}).map(([k,v])=>`<p><b>${esc(k)}:</b> ${esc(Array.isArray(v)?v.join(', '):v)}</p>`).join('')}${(d.activity_photos||[]).map(p=>`<button class="btn" onclick="openPhoto('${p.id}')">Foto</button>`).join('')}</details></td></tr>`).join('');
 $('#dashBody').innerHTML=`${lastData.truncated?'<div class="notice error">Jumlah data mencapai batas sistem. Gunakan periode lebih pendek.</div>':''}<div class="analytics-kpis">${kpis.map(([label,value,color])=>`<div class="kpi-card" style="--accent:${color}"><span>${label}</span><strong>${value.toLocaleString('id-ID')}</strong><small>Dalam periode terpilih</small></div>`).join('')}</div><div class="insight-card"><div class="section-title"><div><h3>Tren Aktivitas & Leads</h3><p class="muted">Perkembangan harian sesuai periode dan filter</p></div></div>${lineChart(byDate,[{key:'aktivitas',label:'Aktivitas',color:'#1d69d2'},{key:'leads',label:'Leads',color:'#0ca5a8'}])}</div><div class="insight-card"><div class="section-title"><div><h3>Tren Prospek & PO</h3><p class="muted">Perbandingan hasil aktivitas setiap hari</p></div></div>${lineChart(byDate,[{key:'prospects',label:'Prospek',color:'#7a5ce0'},{key:'po',label:'PO',color:'#ec8c38'}])}</div><div class="insight-grid">${tab([...types.values()],'Performa Jenis Aktivitas')}${tab([...amds.values()],'Performa per AMD')}</div>${tab([...cabangs.values()],'Performa per Cabang')}<div class="insight-card"><div class="section-title"><div><h3>Detail Input Sales Counter</h3><p class="muted">${details.length} aktivitas • Klik Lihat untuk jawaban lengkap dan dokumentasi</p></div><button class="btn" onclick="exportDashboardXLSX()">↓ Export Excel</button></div><div class="tablewrap"><table class="detail-table"><thead><tr><th>Tanggal</th><th>Sales Counter</th><th>AMD</th><th>Cabang</th><th>Jenis Aktivitas</th><th>Lead</th><th>Prospek</th><th>Hot</th><th>PO</th><th>Detail</th></tr></thead><tbody>${rows||'<tr><td colspan="10">Belum ada laporan sesuai filter</td></tr>'}</tbody></table></div></div>`;
}
async function openPhoto(id){try{let r=await api('/api/photo?id='+encodeURIComponent(id));window.open(r.url,'_blank','noopener')}catch(e){alert(e.message)}}
function exportCSV(){if(!lastData)return alert('Tampilkan data terlebih dahulu');const {roster}=filteredDashboard();let rows=[['Tanggal','Sales ID','Nama','AMD','Cabang','Status Input'],...roster.map(x=>[x.roster_date,x.sales_id_snapshot,x.name_snapshot,x.amd_snapshot,x.branch_snapshot,x.has_report?'Sudah Input':'Belum Input'])];let csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='monitoring_'+lastData.start+'_'+lastData.end+'.csv';a.click();URL.revokeObjectURL(a.href)}
function exportDashboardXLSX(){if(!lastData)return alert('Tampilkan data terlebih dahulu');if(typeof XLSX==='undefined')return alert('Library Excel belum termuat');const {reports,details}=filteredDashboard(),wb=XLSX.utils.book_new();const tabs=[['Rekap Laporan',reports.map(r=>({'Tanggal':r.activity_date,'Nama':r.entered_name,'Cabang':r.entered_branch,'AMD':branches[r.entered_branch]||'','WhatsApp':r.whatsapp,'Kecocokan':r.match_status,'Jumlah Aktivitas':(r.activity_details||[]).length,'Waktu Submit':r.submitted_at}))],['Detail Aktivitas',details.map(({r,d})=>({'Tanggal':r.activity_date,'Nama':r.entered_name,'AMD':branches[r.entered_branch]||'','Cabang':r.entered_branch,'WhatsApp':r.whatsapp,'Jenis Aktivitas':typeName(d.activity_type),'Lead':d.leads,'Prospek':d.prospects,'Hot Prospek':d.hot_prospects,'PO':d.po,...Object.fromEntries(Object.entries(d.answers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):v]))}))]];for(const [name,rows] of tabs)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{Keterangan:'Tidak ada data'}]),name);XLSX.writeFile(wb,'Thamrin_Analisis_Sales_Counter_'+lastData.start+'_sd_'+lastData.end+'.xlsx')}

async function exportReportsXLSX(){
 const msg=$('#downloadReportsMsg'),btn=$('#downloadReportsBtn');if(btn)btn.disabled=true;
 if(msg)msg.innerHTML='<div class="notice">Mengambil seluruh laporan dari Supabase...</div>';
 try{
  if(typeof XLSX==='undefined')throw Error('Library Excel belum termuat. Muat ulang halaman.');
  const {reports,truncated}=await api('/api/reports');
  const filtered=reports.filter(r=>!$('#filterDate')?.value||!$('#dashBody')||r.activity_date===$('#filterDate').value);
  // Tombol khusus download Admin mengekspor seluruh laporan, sedangkan tombol di dashboard mengikuti tanggal.
  const selected=msg?reports:filtered;
  const summary=[],details=[],photos=[];
  for(const r of selected){
   const ds=r.activity_details||[];
   summary.push({'ID Laporan':r.id,'Tanggal Aktivitas':r.activity_date,'Waktu Submit':r.submitted_at,'Nama Sales Counter':r.entered_name,'Cabang':r.entered_branch,'WhatsApp':r.whatsapp,'Status Cocok Master':r.match_status,'Jumlah Aktivitas':ds.length,'Total Lead':ds.reduce((n,d)=>n+(Number(d.leads)||0),0),'Total Prospek':ds.reduce((n,d)=>n+(Number(d.prospects)||0),0),'Total Hot Prospek':ds.reduce((n,d)=>n+(Number(d.hot_prospects)||0),0),'Total PO':ds.reduce((n,d)=>n+(Number(d.po)||0),0)});
   for(const d of ds){const title=TYPES.find(t=>t.id===d.activity_type)?.title||d.activity_type;const row={'ID Laporan':r.id,'Tanggal Aktivitas':r.activity_date,'Nama Sales Counter':r.entered_name,'Cabang':r.entered_branch,'WhatsApp':r.whatsapp,'Jenis Aktivitas':title,'Lead':d.leads,'Prospek':d.prospects,'Hot Prospek':d.hot_prospects,'PO':d.po};for(const [key,value] of Object.entries(d.answers||{}))row[key]=Array.isArray(value)?value.join(', '):value;details.push(row);for(const photo of d.activity_photos||[])photos.push({'ID Laporan':r.id,'Nama Sales Counter':r.entered_name,'Tanggal Aktivitas':r.activity_date,'Jenis Aktivitas':title,'ID Foto':photo.id,'Cara Lihat':'Buka detail laporan di dashboard dan klik Lihat Foto'});}
  }
  const wb=XLSX.utils.book_new();for(const [name,rows] of [['Rekap Laporan',summary],['Detail Aktivitas',details],['Referensi Foto',photos]]){const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'Keterangan':'Belum ada data'}]);ws['!cols']=Object.keys(rows[0]||{'Keterangan':''}).map(k=>({wch:Math.min(48,Math.max(16,k.length+4))}));XLSX.utils.book_append_sheet(wb,ws,name)}
  XLSX.writeFile(wb,'Thamrin_Hasil_Input_Sales_Counter_'+today()+'.xlsx');
  if(msg)msg.innerHTML=`<div class="notice">${selected.length} laporan berhasil disiapkan.${truncated?' Data lebih dari 10.000 laporan; hubungi pengembang untuk ekspor lanjutan.':''}</div>`;
 }catch(e){if(msg)msg.innerHTML=`<div class="notice error">${esc(e.message)}</div>`;else alert(e.message)}finally{if(btn)btn.disabled=false}
}

function render(){if(location.pathname.endsWith('/manager.html')||superToken){$('#adminNav').style.display='none';document.querySelector('.nav').style.display='none';app().innerHTML=managerPage();loadDashboard();return}$('#adminNav').style.display='';app().innerHTML=view==='admin'?adminPage():form();if(view==='form')$('#salesForm').addEventListener('submit',sendReport);else if(!auth)$('#loginForm').addEventListener('submit',login);else loadAdminTable()}
(async()=>{try{CFG=await api('/api/config');branches=await fetch('/branches.json').then(x=>x.json());branches['YPM SIMPANG PATAL']='SAMUEL';auth=JSON.parse(sessionStorage.getItem('admin_session')||'null');render()}catch(e){app().innerHTML=`<div class="notice error">Gagal memuat konfigurasi: ${esc(e.message)}</div>`}})();

async function openAuthorizedManager() {
  const popup=window.open('about:blank','_blank');
  if(popup)popup.opener=null;
  try {
    const result=await api('/api/supervisor');
    if(popup)popup.location.href=result.url;
    else location.href=result.url;
  } catch(error) {
    if(popup)popup.close();
    alert('Gagal membuka Manager: '+error.message+' Silakan login Admin kembali.');
  }
}
