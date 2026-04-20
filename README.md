# SimpleQuicks

Panduan lengkap menjalankan aplikasi dan melakukan tes 2 arah (bidirectional sync) untuk fitur Messaging dan Todo.

## 1. Ringkasan

SimpleQuicks adalah widget frontend (React + Vite) dengan backend lokal (Express + Socket.IO) untuk mendukung sinkronisasi realtime antar client.

Fokus dokumentasi ini:

1. Menjalankan aplikasi secara lokal dengan benar.
2. Menguji sinkronisasi 2 arah pada 3 mode:
   - 2 tab browser pada 1 mesin.
   - 2 perangkat pada jaringan yang sama.
   - Mode fallback saat backend tidak aktif.

## 2. Arsitektur Singkat

1. Frontend berjalan lewat Vite.
2. Backend berjalan di Node.js melalui Express pada port default 8787.
3. Realtime event dikirim lewat Socket.IO:
   - messages:changed
   - conversations:changed
   - todos:changed
4. Data backend disimpan di file JSON:
   - backend/data/comments.json
   - backend/data/conversations.json
   - backend/data/todos.json
   - backend/data/tags.json

## 3. Prasyarat

1. Node.js 18+ (disarankan Node.js 20 LTS).
2. npm 9+.
3. Browser modern (Chrome/Edge/Firefox).
4. (Opsional) Akses jaringan LAN jika ingin tes 2 perangkat.

## 4. Konfigurasi Environment

1. Salin file env contoh:

```bash
copy .env.example .env
```

Jika memakai PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Isi nilai di .env sesuai kebutuhan.

Contoh konfigurasi lokal realtime:

```env
VITE_API_BASE_URL=http://localhost:8787
VITE_SOCKET_URL=http://localhost:8787
VITE_DUMMY_API_APP_ID=replace_with_your_dummyapi_app_id
VITE_DUMMY_API_OWNER_ID=60d0fe4f5311236168a109ca
```

Keterangan variabel:

1. VITE_API_BASE_URL: base URL REST API frontend.
2. VITE_SOCKET_URL: base URL Socket.IO frontend.
3. VITE_DUMMY_API_APP_ID: dipakai jika ingin mode dummyapi.io.
4. VITE_DUMMY_API_OWNER_ID: simulasi owner pada fitur messaging.

Catatan penting:

1. Variabel VITE\_ dibaca saat frontend berjalan/build. Jika diubah, restart proses frontend.
2. Untuk produksi statis cPanel, backend harus di-host terpisah (lihat DEPLOY_CPANEL.md).

## 5. Cara Menjalankan Aplikasi

Jalankan dari root project.

### 5.1 Install dependencies

```bash
npm install
```

### 5.2 Jalankan backend (Terminal 1)

```bash
npm run dev:server
```

Expected output:

1. Terdapat log: Quicks backend listening on http://localhost:8787
2. Endpoint health aktif.

Tes cepat health API:

```bash
curl http://localhost:8787/health
```

Jika tidak ada curl di Windows, gunakan browser ke:
http://localhost:8787/health

### 5.3 Jalankan frontend (Terminal 2)

```bash
npm run dev
```

Expected output:

1. Vite menampilkan URL dev server (umumnya http://localhost:5173).
2. Widget tampil normal tanpa error koneksi.

### 5.4 Build dan preview (opsional)

```bash
npm run build
npm run preview
```

## 6. Definisi Tes 2 Arah

Tes 2 arah artinya perubahan data dari Client A harus terlihat pada Client B tanpa refresh manual (untuk mode realtime), dan sebaliknya.

Objek yang diuji:

1. Messaging: create, edit, delete message, update conversation preview.
2. Todo: create, update, toggle completed, delete.

## 7. Tes 2 Arah Mode 1: 2 Tab Browser Lokal

### 7.1 Persiapan

1. Pastikan backend dan frontend sudah aktif.
2. Buka aplikasi pada Tab A dan Tab B (URL sama, misalnya http://localhost:5173).
3. Masuk ke tab Messaging pada kedua tab browser.

### 7.2 Skenario Messaging

#### A. Kirim pesan A ke B

Langkah:

1. Di Tab A, pilih thread yang sama dengan Tab B.
2. Kirim pesan: Halo dari Tab A.

Expected:

1. Pesan baru muncul di Tab A.
2. Tanpa refresh, pesan yang sama muncul di Tab B.
3. Daftar percakapan menampilkan preview terbaru.

#### B. Balas pesan B ke A

Langkah:

1. Di Tab B, kirim balasan: Diterima, ini Tab B.

Expected:

1. Balasan muncul di Tab B.
2. Balasan muncul otomatis di Tab A.

#### C. Edit pesan

Langkah:

1. Di Tab A, edit salah satu pesan milik sendiri.
2. Simpan perubahan.

Expected:

1. Isi pesan berubah di Tab A.
2. Isi pesan yang sama berubah di Tab B tanpa refresh.

#### D. Hapus pesan

Langkah:

1. Di Tab B, hapus satu pesan.

Expected:

1. Pesan hilang dari Tab B.
2. Pesan yang sama hilang dari Tab A secara realtime.

### 7.3 Skenario Todo

1. Buka tab Todo di Tab A dan Tab B.
2. Di Tab A, buat task baru.
3. Verifikasi task muncul di Tab B (sesuai filter).
4. Di Tab B, ubah status completed task.
5. Verifikasi status task ikut berubah di Tab A.
6. Di Tab A, edit judul/deskripsi/tag task.
7. Verifikasi hasil edit muncul di Tab B.
8. Di Tab B, delete task.
9. Verifikasi task hilang di Tab A.

Expected umum:

1. Perubahan task tersinkron otomatis antar tab.
2. Tidak perlu refresh manual browser.

### 7.4 Checklist Lulus (Mode 1)

Mode 1 dinyatakan lulus jika:

1. Chat create/edit/delete sinkron dua arah.
2. Conversation preview ikut update saat ada message baru.
3. Todo create/update/toggle/delete sinkron dua arah.
4. Tidak ada error API/Socket.IO di console browser.

## 8. Tes 2 Arah Mode 2: 2 Perangkat Satu Jaringan

### 8.1 Persiapan jaringan

1. Host backend dan frontend di komputer A.
2. Komputer A dan perangkat B harus di LAN/Wi-Fi yang sama.
3. Cari IP lokal komputer A (contoh: 192.168.1.10):

```powershell
ipconfig
```

4. Ubah .env agar client mengarah ke IP host:

```env
VITE_API_BASE_URL=http://192.168.1.10:8787
VITE_SOCKET_URL=http://192.168.1.10:8787
```

5. Jalankan backend:

```bash
npm run dev:server
```

6. Jalankan frontend agar bisa diakses perangkat lain:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

7. Pastikan firewall mengizinkan koneksi ke port 5173 dan 8787.

### 8.2 Eksekusi tes

1. Di komputer A, buka http://192.168.1.10:5173.
2. Di perangkat B, buka URL yang sama.
3. Ulangi seluruh skenario Messaging dan Todo pada Bagian 7.

Expected:

1. Semua perubahan dari perangkat A terlihat di perangkat B.
2. Semua perubahan dari perangkat B terlihat di perangkat A.
3. Latensi sinkronisasi normal (umumnya < 1 detik pada LAN stabil).

### 8.3 Checklist Lulus (Mode 2)

Mode 2 dinyatakan lulus jika:

1. Semua skenario Mode 1 berhasil lintas perangkat.
2. Tidak ada error CORS/timeout di browser.
3. Reconnect realtime tetap stabil saat koneksi jaringan sempat fluktuatif.

## 9. Tes Mode 3: Fallback Saat Backend Tidak Aktif

Mode ini untuk memverifikasi perilaku aplikasi ketika backend tidak tersedia.

### 9.1 Setup fallback

1. Matikan backend (stop npm run dev:server).
2. Pastikan frontend tetap berjalan.
3. Untuk mengaktifkan fallback messages, kosongkan VITE_API_BASE_URL lalu restart frontend.

Contoh minimal .env untuk fallback messages:

```env
VITE_API_BASE_URL=
VITE_SOCKET_URL=
VITE_DUMMY_API_APP_ID=
```

### 9.2 Ekspektasi fallback

1. Messaging:
   - Hook messages akan mencoba fallback ke jsonplaceholder saat API utama gagal.
   - Penyimpanan pesan lokal tetap dipakai (localStorage) untuk mode non-backend.
2. Realtime Socket.IO:
   - Tidak aktif jika URL socket tidak tersedia.
3. Todo dan Conversations:
   - Bergantung pada backend. Saat backend mati, data bisa gagal dimuat.
   - Operasi tertentu di Todo memiliki fallback lokal sementara pada state UI.

### 9.3 Batasan mode fallback

1. Tidak ada sinkronisasi realtime antar client tanpa backend/socket.
2. Data yang bersifat lokal tidak otomatis konsisten antar perangkat.
3. Mode ini hanya untuk uji ketahanan UI saat backend unavailable.

## 10. Troubleshooting

### 10.1 Frontend tidak bisa ambil data

Gejala:

1. List chat/todo kosong.
2. Muncul error network di console browser.

Cek:

1. Pastikan backend aktif di port 8787.
2. Buka http://localhost:8787/health.
3. Periksa nilai VITE_API_BASE_URL pada .env.

Solusi:

1. Jalankan ulang backend.
2. Restart frontend setelah ubah .env.

### 10.2 Realtime tidak sinkron

Gejala:

1. Data baru tidak muncul di tab/perangkat lain.

Cek:

1. Pastikan VITE_SOCKET_URL benar.
2. Pastikan koneksi websocket/polling tidak diblokir jaringan.
3. Lihat log backend saat create/update/delete.

Solusi:

1. Set VITE_SOCKET_URL ke host backend yang benar.
2. Buka port firewall yang dibutuhkan.

### 10.3 Gagal akses dari perangkat lain

Gejala:

1. URL dev server tidak bisa dibuka dari HP/laptop lain.

Cek:

1. Jalankan frontend dengan --host 0.0.0.0.
2. Gunakan IP LAN host, bukan localhost.
3. Cek firewall Windows.

Solusi:

1. Restart Vite dengan host publik LAN.
2. Izinkan port 5173 dan 8787 di firewall.

### 10.4 Data JSON backend rusak

Gejala:

1. API tiba-tiba return data kosong atau error parse.

Cek:

1. Validasi isi file backend/data/\*.json.

Solusi:

1. Perbaiki format JSON valid array.
2. Backup lalu reset isi file ke [] jika diperlukan.

## 11. Daftar Endpoint Backend

1. GET /health
2. GET /conversations
3. GET /conversations/:id/messages?page=0&limit=50
4. GET /tags
5. GET /todos?filter=my&owner=user-local
6. POST /todos
7. PUT /todos/:id
8. DELETE /todos/:id
9. GET /comment?page=0&limit=50&post=thread-id
10. POST /comment/create
11. PUT /comment/:id
12. DELETE /comment/:id

## 12. Catatan Deploy

1. Frontend hasil build dapat diupload ke cPanel (hosting statis).
2. Backend Express dan Socket.IO harus di-host terpisah dari hosting statis.
3. Detail deploy ada di DEPLOY_CPANEL.md.

## 13. Ringkasan Eksekusi Cepat

```bash
npm install
npm run dev:server
npm run dev
```

Lalu buka URL frontend dan jalankan skenario tes 2 arah sesuai Bagian 7, 8, dan 9.
