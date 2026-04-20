# Deploy ke cPanel

Project ini adalah aplikasi React statis yang dibuild dengan Vite. Untuk deploy ke cPanel, upload isi folder `dist` ke `public_html` atau ke subfolder domain yang dipakai.

## Langkah cepat

1. Jalankan build production:

   ```bash
   npm install
   npm run build
   ```

2. Buka folder `dist`.
3. Upload semua isi `dist` ke `public_html` di cPanel.
4. Pastikan file `.htaccess` ikut ter-upload agar refresh halaman SPA tetap bekerja.

## Catatan penting

- Aplikasi ini memakai `VITE_DUMMY_API_APP_ID`, `VITE_API_BASE_URL`, dan `VITE_SOCKET_URL` saat build. Untuk cPanel, set variabel itu di environment lokal sebelum menjalankan build.
- Jika kamu tidak menjalankan backend lokal, jangan arahkan `VITE_API_BASE_URL` ke `http://localhost:8787` karena itu hanya untuk development.
- Jika backend Socket.IO atau Express tetap dibutuhkan, host backend tersebut di server terpisah. cPanel statis hanya menyajikan frontend hasil build.

## Kalau website dipasang di subfolder

Kalau domain tidak dipasang di root, misalnya di `https://domain.com/app/`, build Vite dengan base relatif sudah disiapkan supaya asset tetap terbaca dengan benar.

## Jika muncul blank page setelah deploy

1. Pastikan yang di-upload adalah **isi** `dist`, bukan folder `dist`-nya.
2. Pastikan di `public_html` ada file berikut:
   - `index.html`
   - `.htaccess`
   - folder `assets`
3. Jika upload lewat File Manager, aktifkan opsi menampilkan file tersembunyi agar `.htaccess` tidak terlewat.
4. Hapus file build lama di `public_html` sebelum upload baru, lalu clear browser cache (`Ctrl + F5`).
5. Buka DevTools Console browser. Jika ada error `Failed to load module script` atau MIME type, upload ulang `.htaccess` terbaru.
