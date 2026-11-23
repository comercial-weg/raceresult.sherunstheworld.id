# Hasil Lomba She Runs The World 2026

Situs statis untuk **raceresult.sherunstheworld.id**: cari hasil lomba 10K pakai nomor BIB atau nama, lihat posisi dan pace, buka foto, dan unduh e-sertifikat PDF (dibuat langsung di browser).

Tidak ada build step. Semua file di root repo langsung bisa di-hosting.

```
index.html              halaman utama
assets/style.css        tampilan
assets/app.js           logika pencarian, tabel, e-sertifikat
assets/logo.webp        logo
assets/cert-bg.jpg      desain latar e-sertifikat
assets/fonts/           font khusus sertifikat
data/results.json       data hasil: [posisi, bib, nama, waktu, kategori, status]
```

## Coba di lokal

Data diambil lewat `fetch`, jadi buka lewat server, bukan dobel-klik file:

```bash
python3 -m http.server 8000
```

Lalu buka http://localhost:8000.

## Hosting

Bisa di hosting statis mana pun (Cloudflare Pages, Netlify, Vercel, GitHub Pages). Pengaturannya:

- Build command: kosongkan
- Output / publish directory: `/` (root repo)

Setelah itu sambungkan domain `raceresult.sherunstheworld.id` di pengaturan custom domain hosting-nya.

## Update data hasil

Edit atau ganti `data/results.json`. Satu baris per pelari:

```json
[1,10001,"Soraya Larasati","00:48:34","10K","Finished"]
```

Hanya status `Finished` yang ditampilkan. Nama boleh kosong (`""`), nanti muncul sebagai "Nama belum terdaftar".
