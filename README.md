# ICON Score Board System

Platform kompetisi real-time untuk Smart Society Innovation Challenge. Sistem ini mencakup kontrol admin, dashboard juri, tampilan publik, dan tampilan peserta.

## Fitur Utama

- **Phase 1 (Cerdas Cermat):** kontrol soal, buzzer, timer, pot scoring, dan transaksi atomik.
- **Phase 2 (Innovation Lab):** gacha topik dan AI timer per tim.
- **Phase 3 (Defense):** spotlight tim aktif dan penilaian juri.
- **Realtime:** sinkronisasi <500ms via Firestore onSnapshot.
- **Auth & RBAC:** admin dan juri dibatasi lewat Firebase Auth + Firestore rules.

## Tech Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Firebase Auth + Firestore
- Firebase Admin SDK (API routes)

## Setup Firebase

1. Buat project Firebase dan aktifkan **Authentication (Email/Password)**.
2. Buat Firestore database (mode production).
3. Tambahkan web app di Firebase Console untuk mendapatkan client config.
4. Buat service account untuk server-side access.

## Environment Variables

Salin `.env.example` ke `.env.local` lalu isi:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=
# atau gunakan field terpisah
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

> `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` berisi JSON service account dalam satu baris.

## Seed Data

Jalankan seed script untuk membuat 5 tim default, game_state, dan 10 sample soal:

```bash
npm run seed
```

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Akses:

- `http://localhost:3000/login` — Login admin/juri
- `http://localhost:3000/admin` — Panel Admin (Super Admin)
- `http://localhost:3000/judge` — Dashboard Juri
- `http://localhost:3000/display/public` — Tampilan publik
- `http://localhost:3000/display/participant/[teamId]` — Tampilan peserta per tim

## Alur Penggunaan

### Admin Flow

1. Login dengan akun `admin@icon.com` (setelah user dibuat di Firebase Auth + `users/{uid}` dengan role `admin`).
2. Pilih soal Phase 1, start timer, buka buzzer.
3. Gunakan tombol BENAR/SALAH/HANGUS untuk scoring pot secara atomik.
4. Lakukan gacha topik Phase 2 dan start/stop AI timer per tim.
5. Set tim aktif Phase 3 untuk spotlight di public display.
6. Klik **Recalculate Aggregation** untuk menghitung nilai akhir dari penilaian juri.

### Judge Flow

1. Login dengan akun juri (`role: judge`).
2. Pilih tim dan phase (Phase 2/Phase 3).
3. Isi skor kriteria, total otomatis dihitung.
4. Klik **Submit & Lock** (tidak bisa diubah setelah submit).

## Firestore Rules

File rules tersedia di `firestore.rules`. Pastikan di-deploy:

```bash
firebase deploy --only firestore:rules
```

## Testing

```bash
npm run test
```

## Deployment (Opsional)

- Deploy ke Vercel.
- Pastikan env variables terpasang.
- Deploy Firestore rules dan (opsional) indexes.
