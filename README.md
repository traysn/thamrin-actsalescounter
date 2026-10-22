# Thamrin Sales Counter — Vercel + Supabase

Aplikasi awal online, bukan HTML localStorage. Sales mengirim form tanpa login; Admin memakai Supabase Auth; Manager menggunakan tautan token baca-saja.

## Sebelum deploy

1. Pastikan SQL `01_thamrin_salescounter_database.sql` sudah dijalankan di project Supabase yang sama, dan Storage bucket **activity-photos** berstatus **Private**.
2. Supabase → Authentication → Users → **Add user**. Buat satu user email/password untuk Admin (gunakan email kantor). Pastikan email user ini sama dengan `ADMIN_EMAIL` di Vercel. Jangan kirim password ke siapa pun.
3. Upload semua isi folder project ini ke **repository GitHub private**. Jangan upload `.env` atau secret.
4. Vercel → Add New → Project → Import Git Repository. Framework preset **Other**. Root Directory biarkan root. Build command kosong/default, output directory kosong/default.
5. Vercel → Project Settings → Environment Variables. Tambahkan:
   - `SUPABASE_URL` = `https://<project-ref>.supabase.co` (tanpa `/rest/v1/`)
   - `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`
   - `SUPABASE_SECRET_KEY` = `sb_secret_...` (rahasia, **jangan** beri awalan `NEXT_PUBLIC_`)
   - `ADMIN_EMAIL` = email Admin Supabase Auth.
6. Deploy atau Redeploy setelah semua environment variables disimpan.
7. Tes: buka web → Admin login → upload master Excel `data (75).xlsx` → lihat preview → konfirmasi. Kembali ke Form Sales → submit → buka Dashboard Admin di perangkat lain.
8. Admin → **Buat Link Manager** → salin URL sekali dan kirim secara pribadi. Link tidak ditampilkan pada menu publik.

## Keterbatasan yang wajib diperhatikan sebelum dipakai produksi

- **Form tanpa login**: nama + cabang bukan autentikasi. Orang lain dapat mengatasnamakan Sales Counter. Untuk pemakaian nyata, tambahkan verifikasi OTP WhatsApp atau token pribadi.
- **Anti-spam belum tersedia**: tambahkan Cloudflare Turnstile dan rate limiting pada endpoint `/api/submit` dan `/api/photo` sebelum link dibagikan luas.
- **Roster harian**: snapshot tanggal hari ini dibuat saat master di-upload atau dashboard dibuka. Agar tanggal tanpa kunjungan dashboard juga tercatat, tambahkan Vercel Cron (atau Supabase scheduled function) untuk membuat roster setiap hari pada 00.05 WIB. Jangan gunakan master terkini untuk merekonstruksi tanggal lama.
- **Histori upload** tersimpan, dan karyawan hilang dari file tidak dihapus otomatis. Tidak ada halaman review/matching laporan pending; data pending terlihat di dashboard untuk investigasi.
- **Foto** disimpan privat; server membuat signed URL 2 menit untuk Admin/Manager. Batas 5MB/foto dan 8 foto/aktivitas. API foto belum memiliki pembuktian bahwa pengunggah adalah pembuat laporan; untuk produksi, gunakan upload token satu kali dan rate limiting.
- **Manager link**: siapa pun yang memiliki URL bisa melihat laporan, termasuk nomor WA dan foto. Simpan link dengan aman. Penghapusan/revoke token dilakukan di Supabase Table Editor `supervisor_links` dengan mengisi `revoked_at` atau membuat fitur Admin tambahan.
- **Ekspor** sementara CSV, bukan XLSX/PDF. Kriteria foto, 50 pertanyaan, dan tampilan responsif sudah tersedia; beberapa aturan validasi bisnis masih perlu diketatkan.
- **Ukuran upload Excel** dibatasi sekitar 6MB. Untuk file besar, perlu import berbasis background job.

## Struktur

- `public/index.html`, `public/app.js` — UI mobile-first
- `public/logo.png`, `public/branches.json` — aset lokal
- `api/submit.js` — kirim laporan
- `api/photo.js` — upload/lihat foto privat
- `api/master.js` — preview + upload master
- `api/dashboard.js` — laporan dan roster
- `api/supervisor.js` — buat token Manager
- `api/config.js` — konfigurasi publik
- `lib/server.js` — Supabase dan verifikasi akses

## Catatan

Tidak ada secret key dalam repository. `SUPABASE_PUBLISHABLE_KEY` boleh dikirim ke browser; `SUPABASE_SECRET_KEY` hanya boleh dipakai di fungsi server Vercel.
