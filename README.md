# Hasil Lomba She Runs The World 2026

Situs statis untuk **raceresult.sherunstheworld.id**: cari hasil lomba 10K pakai nomor BIB atau nama, lihat posisi dan pace, buka foto, dan unduh e-sertifikat PDF (dibuat langsung di browser).

Tidak ada build step. Semua isi folder `public/` langsung di-serve sebagai file statis lewat Cloudflare Workers (static assets).

```
wrangler.jsonc                 config Worker "raceresult-sherunstheworld-id"
public/index.html              halaman utama
public/assets/style.css        tampilan
public/assets/app.js           logika pencarian, tabel, e-sertifikat
public/assets/logo.webp        logo
public/assets/cert-bg.jpg      desain latar e-sertifikat
public/assets/fonts/           font khusus sertifikat
public/data/results.json       data hasil: [posisi, bib, nama, waktu, kategori, status]
public/_headers                aturan cache
```

## Coba di lokal

Data diambil lewat `fetch`, jadi buka lewat server, bukan dobel-klik file:

```bash
python3 -m http.server 8000 --directory public
```

Lalu buka http://localhost:8000.

## Hosting (Cloudflare Workers)

Worker `raceresult-sherunstheworld-id` dengan custom domain `raceresult.sherunstheworld.id`.

Deploy otomatis lewat Workers Builds (Settings > Build, sambungkan repo ini):

- Build command: kosongkan
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

Atau deploy manual dari komputer:

```bash
npx wrangler deploy
```

## Update data hasil

Edit atau ganti `public/data/results.json`. Satu baris per pelari:

```json
[1,10001,"Soraya Larasati","00:48:34","10K","Finished"]
```

Hanya status `Finished` yang ditampilkan. Nama boleh kosong (`""`), nanti muncul sebagai "Nama belum terdaftar".
