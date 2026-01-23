# ICON Score Board System

Platform kompetisi real-time untuk Smart Society Innovation Challenge. Sistem ini mencakup kontrol admin, dashboard juri, tampilan publik, dan tampilan peserta.

## Fitur Utama

- **Phase 1 (Cerdas Cermat):** kontrol soal, buzzer otomatis, timer soal & timer jawab, pot scoring, dan transaksi atomik.
- **Phase 2 (Innovation Lab):** gacha topik dan AI timer per tim.
- **Phase 3 (Defense):** spotlight tim aktif dan penilaian juri.
- **Realtime:** sinkronisasi <500ms via Firestore onSnapshot.
- **Auth & RBAC:** admin, juri, dan peserta dibatasi lewat Firebase Auth + Firestore rules.
- **Manajemen Soal:** admin dapat menambahkan dan mengedit soal Phase 1 untuk kategori Pengetahuan Umum & Kemampuan Logika, sekaligus mengatur jumlah soal per kategori dan opsi acak.

## Tech Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Firebase Auth + Firestore
- Firebase Admin SDK (API routes)

## Panduan Lengkap Setup Firebase (Free Plan)

Panduan ini menggunakan Firebase Spark (gratis). Cocok untuk development.

### 1. Buat Project Firebase

1. Buka https://console.firebase.google.com
2. Klik **Add project**.
3. Ikuti wizard hingga selesai.
4. Setelah project dibuat, pastikan berada di project tersebut (cek nama di kiri atas).

### 2. Aktifkan Firestore Database

1. Dari sidebar, pilih **Firestore Database**.
2. Klik **Create database**.
3. Pilih **Production mode**.
4. Pilih region terdekat (contoh: asia-southeast1).
5. Klik **Enable**.

### 3. Aktifkan Authentication (Email/Password)

1. Dari sidebar, pilih **Authentication**.
2. Klik **Get started**.
3. Pilih **Email/Password**.
4. Aktifkan (Enable) dan simpan.

### 4. Buat Web App untuk Client Config

1. Klik ikon **</>** (Web) di halaman Project Overview.
2. Beri nama app (contoh: `icon-score-board`).
3. Copy konfigurasi `firebaseConfig` yang muncul.
4. Isi ke `.env.local` nanti.

### 5. Buat Service Account untuk Server-side API

1. Dari sidebar, klik **Project settings** (ikon gear).
2. Buka tab **Service accounts**.
3. Klik **Generate new private key**.
4. Download file JSON.
5. Simpan dan gunakan isi JSON ini untuk `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`.

> **Tips:** simpan file JSON di tempat aman dan jangan commit ke git.

### 6. Deploy Firestore Rules

Rules sudah tersedia di `firestore.rules`.

Install Firebase CLI jika belum:

```bash
npm install -g firebase-tools
firebase login
```

Lalu di root project:

```bash
firebase init firestore
firebase deploy --only firestore:rules
```

Saat `firebase init firestore`, pilih project yang sama dan arahkan rules file ke `firestore.rules`.

## Environment Variables

Salin `.env.example` ke `.env.local` lalu isi:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Opsional: gunakan JSON service account
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=

# Alternatif: gunakan field terpisah
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

> `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` berisi JSON service account dalam satu baris (escape newline dengan `\n`).

## Menjalankan Project (Development)

1. Install dependencies:

```bash
npm install
```

2. Jalankan seed data untuk membuat 5 tim, 10 soal sample, dan game_state:

```bash
npm run seed
```

3. Jalankan aplikasi:

```bash
npm run dev
```

4. Buka browser di `http://localhost:3000`.

## Setup User Admin, Juri, dan Peserta (Firebase Auth + Firestore)

### 1. Buat User di Firebase Authentication

1. Buka **Authentication** > **Users**.
2. Klik **Add user**.
3. Buat akun:
   - `admin@icon.com` (Super Admin)
   - `juri1@icon.com`, `juri2@icon.com`, dst (Juri)
   - `team1@icon.com`, `team2@icon.com`, dst (Peserta)

### 2. Isi Role di Collection `users`

Buat dokumen di Firestore collection `users` dengan ID sesuai `uid` user Firebase Auth.

Contoh struktur:

```json
{
  "uid": "<uid>",
  "email": "admin@icon.com",
  "role": "admin",
  "name": "Super Admin"
}
```

Untuk juri, gunakan `role: "judge"`. Untuk peserta, gunakan `role: "participant"` dan tambahkan `team_id`.

Contoh peserta:

```json
{
  "uid": "<uid>",
  "email": "team1@icon.com",
  "role": "participant",
  "name": "Team INF",
  "team_id": "inf"
}
```

> **Catatan:** RBAC di app menggunakan collection `users`. Jika role belum diisi, user tidak bisa masuk halaman admin/judge.

## Akses Aplikasi

- `http://localhost:3000/login` — Login admin/juri
- `http://localhost:3000/participant/login` — Login peserta
- `http://localhost:3000/admin` — Panel Admin (Super Admin)
- `http://localhost:3000/judge` — Dashboard Juri
- `http://localhost:3000/display/public` — Tampilan publik
- `http://localhost:3000/display/participant/[teamId]` — Tampilan peserta per tim (butuh login peserta)

## Alur Penggunaan

### Admin Flow

1. Login dengan akun `admin@icon.com`.
2. Tambah soal Phase 1 (Pengetahuan Umum / Kemampuan Logika).
3. Atur jumlah soal per kategori dan opsi acak.
4. Pilih soal: timer soal dan buzzer otomatis berjalan.
5. Saat peserta mengunci buzzer, timer soal akan pause dan timer jawab berjalan sesuai durasi.
6. Jawaban benar akan mengakhiri buzzer, jawaban salah akan membuka buzzer kembali otomatis.
7. Gunakan tombol **BENAR/SALAH/HANGUS** untuk scoring pot secara atomik (opsional untuk override admin).
8. Lakukan gacha topik Phase 2 dan start/stop AI timer per tim.
9. Set tim aktif Phase 3 untuk spotlight di public display.
10. Klik **Recalculate Aggregation** untuk menghitung nilai akhir dari penilaian juri.

### Judge Flow

1. Login dengan akun juri (`role: judge`).
2. Pilih tim dan phase (Phase 2/Phase 3).
3. Isi skor kriteria, total otomatis dihitung.
4. Klik **Submit & Lock** (tidak bisa diubah setelah submit).

## Firestore Rules

File rules tersedia di `firestore.rules` dan harus di-deploy ke project Firebase.

## Testing

```bash
npm run test
```

## Deployment (Opsional)

- Deploy ke Vercel.
- Pastikan env variables terpasang.
- Deploy Firestore rules.
