# 🏸 Shuttle Score

PWA pencatat skor badminton untuk main santai dan komunitas. Bisa dipakai offline penuh dan di-install ke layar utama HP.

**Live:** https://yudartcode.github.io/shuttlescore/

## Fitur

- **Quick match**: tunggal atau ganda dengan satu tap, tanpa mengisi pemain.
- **Match dengan pemain**: pilih dari daftar atau ketik nama baru (otomatis tersimpan).
- **Aturan BWF rally point 21**: deuce dengan selisih 2, maksimal 30, format **best of 1** atau **best of 3**.
- **Indikator servis otomatis**: siapa yang servis, dari kotak kanan/kiri, dan rotasi posisi pada ganda.
- **Pengingat ganti sisi**: setelah tiap game dan di poin 11 pada game penentu.
- **Undo** tanpa batas, termasuk mundur lewat batas game atau membuka lagi match yang sudah selesai.
- **Riwayat** pertandingan dengan skor per game dan durasi.
- **Statistik** menang/kalah per pemain dan per pasangan ganda. Quick match bisa ditautkan ke pemain setelah selesai.
- **Bagikan hasil** lewat Web Share API (fallback: salin ke clipboard).
- **Layar tetap menyala** selama match (Wake Lock API) dan layout landscape dengan angka besar.

Semua data tersimpan lokal di perangkat (IndexedDB). Tidak ada akun, server, atau data yang dikirim ke mana pun.

## Tech stack

React + TypeScript + Vite, `vite-plugin-pwa` (Workbox), Dexie (IndexedDB), React Router, Vitest.

## Pengembangan

Butuh Node.js 22 atau lebih baru.

```bash
npm install
npm run dev       # server dev: http://localhost:5173/shuttlescore/
npm test          # unit test aturan skor dan lapisan data
npm run build     # build produksi ke dist/
npm run preview   # sajikan hasil build (service worker aktif)
```

## Struktur

```
src/
  domain/rules.ts     aturan skor sebagai fungsi murni: state = replay(config, events)
  domain/stats.ts     statistik pemain dan pasangan
  db/                 skema Dexie dan operasi data
  pages/              Home, NewMatch, Scoreboard, History, Players
  components/         komponen bersama
  hooks/useWakeLock   jaga layar menyala
  lib/                share hasil, preferensi lokal
```

State pertandingan tidak disimpan langsung. Yang disimpan adalah log rally, lalu skor, servis, dan posisi dihitung ulang dari log tersebut. Karena itu undo cukup menghapus event terakhir.

## Deploy

Setiap push ke `main` menjalankan `.github/workflows/deploy.yml`. Workflow ini menjalankan test, build, lalu deploy ke GitHub Pages. Aplikasi disajikan di subpath `/shuttlescore/` (diatur lewat `base` di `vite.config.ts`).
