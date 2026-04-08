**Sistem Ringi (稟議) freee**

Peran, Izin & Rute Persetujuan

*Sumber: freee Help Center (support.freee.co.jp)*

# **1\. Ikhtisar**

freee Accounting dan freee Expense Management menyediakan fitur Permintaan Pembelian (購買申請) yang dirancang untuk ringi internal (pengambilan keputusan berbasis persetujuan) yang melibatkan keputusan finansial. Ini mencakup permintaan pembelian, permintaan perjalanan dinas, permintaan biaya hiburan, dan lainnya. Sistem ini mendukung formulir pengajuan yang dapat dikustomisasi, rute persetujuan multi-tahap, persetujuan wakil, dan percabangan rute otomatis berdasarkan jumlah atau jabatan.

**Paket yang Berlaku (Korporat):** Advance, Enterprise (Paket Baru); Professional, Enterprise (Paket Lama); freee Expense Management (Expense Plus / Full).

# **2\. Peran & Izin dalam Sistem Ringi**

## **2.1 Set Izin Default**

freee Accounting memiliki 6 set izin default:

| Set Izin | Nama Jepang | Deskripsi |
| :---- | :---- | :---- |
| **Administrator** | 管理者 | Akses penuh ke semua fitur. Dapat membuat/mengedit rute persetujuan, melakukan persetujuan wakil untuk pengajuan apa pun, membatalkan persetujuan, dan mengubah penolakan menjadi pengembalian. |
| **Umum (Akuntansi)** | 一般（経理） | Dapat mengelola pengaturan rute persetujuan, mengundang anggota (kecuali dengan hak Administrator), dan menangani sebagian besar tugas akuntansi. |
| **Entri Transaksi Saja** | 取引登録のみ | Dapat mengajukan laporan pengeluaran dan menyetujui jika ditunjuk. Hanya dapat melihat/mengedit data miliknya sendiri. |
| **Hanya Lihat** | 閲覧のみ | Dapat melihat pengajuan yang diajukan/ditugaskan kepadanya. Dapat menyetujui jika ditunjuk sebagai pemberi persetujuan. |
| **Umum (Non-Akuntansi)** | 一般（経理以外） | Dirancang untuk karyawan yang hanya menggunakan fitur alur kerja. Gratis — tidak menggunakan slot anggota. Dapat mengajukan dan menyetujui jika ditunjuk. |
| **Pengajuan & Persetujuan** | 申請・承認 | Dapat mengajukan pengeluaran dan menyetujui jika ditunjuk. Terbatas pada fitur alur kerja saja. |

## **2.2 Detail Izin untuk Pengajuan (Ringi)**

| Tindakan | Admin | Umum (Akt) | Entri Trx | Hanya Lihat | Umum (Non) | Peng. & Pers. |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Mengajukan pengajuan | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Melihat pengajuan | Semua | Semua | Terbatas | Terbatas | Terbatas | Terbatas |
| Menyetujui pengajuan | ✓ (+wakil) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Persetujuan massal | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Konfig. rute persetujuan | ✓ | ✓ | ✗ | ✗ | Lihat | ✗ |
| Konfig. kategori pengeluaran | ✓ | ✗ | ✗ | ✗ | Lihat | ✗ |
| Konfig. pembatasan pengajuan | ✓ | Izin khusus | ✗ | ✗ | ✗ | ✗ |
| Mengelola set izin | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

## **2.3 Aturan Utama Izin untuk Persetujuan**

* Persetujuan: Hanya anggota yang ditunjuk sebagai pemberi persetujuan berikutnya dalam rute yang dapat menyetujui, kecuali Anda adalah Administrator (yang dapat melakukan persetujuan wakil).

* Membatalkan persetujuan atau mengubah penolakan menjadi pengembalian memerlukan izin Administrator.

* Persetujuan sendiri: Jika Anda mengajukan pengajuan dengan “tanpa rute yang ditentukan,” Anda tidak dapat menyetujuinya sendiri. Untuk menyetujui sendiri, Anda harus secara eksplisit ditunjuk sebagai pemberi persetujuan Anda sendiri dalam rute.

* Persetujuan wakil: Administrator (selain pengaju) dapat melakukan persetujuan wakil.

* Pengecualian pembatasan pengajuan: Pengguna yang memiliki izin pengeluaran lebih luas (tidak terbatas pada “diri sendiri saja”) dikecualikan dari pembatasan pengajuan meskipun batas anggaran terlampaui.

## **2.4 Set Izin Kustom**

Pada paket Advance/Enterprise, set izin dapat dikustomisasi melalui Pengaturan \> Manajemen Izin. Anda dapat membuat set izin kustom dengan menyalin dan memodifikasi yang default. Hierarki untuk undangan anggota adalah: Administrator \> Umum (Akuntansi) \> Entri Transaksi \> Hanya Lihat \> Pengajuan & Persetujuan \> Umum (Non-Akuntansi). Pengguna dengan hak undangan tidak dapat mengundang seseorang dengan tingkat izin yang lebih tinggi dari miliknya.

# **3\. Rute Persetujuan (申請経路)**

## **3.1 Ikhtisar**

Rute persetujuan mendefinisikan rantai pemberi persetujuan untuk pengajuan ringi. Rute ini dapat digunakan di seluruh laporan pengeluaran, permintaan pembayaran, berbagai pengajuan, dan permintaan pembelian.

**Kemampuan utama:**

* Beberapa pemberi persetujuan dengan urutan yang ditentukan (hingga 15 tahap persetujuan)

* Konfigurasi per tahap: memerlukan persetujuan dari 1 orang atau semua pemberi persetujuan yang ditunjuk

* Pengaju memilih rute saat pengajuan (atau “rute dasar” default dipilih otomatis)

* Rute dapat ditetapkan ke jenis pengajuan tertentu (laporan pengeluaran, permintaan pembelian, berbagai pengajuan, permintaan pembayaran)

## **3.2 Metode Penunjukan Pemberi Persetujuan**

| Metode | Deskripsi |
| :---- | :---- |
| **Penunjukan Anggota** | Tentukan pemberi persetujuan langsung berdasarkan nama/email (maksimal 10 per tahap) |
| **Ditentukan Saat Pengajuan** | Pengaju memilih pemberi persetujuan saat mengajukan |
| **Berbasis Jabatan (Dept. Pengaju)** | Otomatis menunjuk pemberi persetujuan berdasarkan departemen dan jabatan pengaju dari freee HR |
| **Berbasis Jabatan (Dept. Saat Pengajuan)** | Pengaju memilih departemen, kemudian pemberi persetujuan ditunjuk otomatis berdasarkan jabatan dalam departemen tersebut |
| **Penunjukan Dept. & Jabatan** | Pemberi persetujuan ditetapkan berdasarkan kombinasi departemen \+ jabatan spesifik yang diatur saat pembuatan rute |

## **3.3 “Anggota” vs “Anggota atau di Atas”**

**“Anggota” (に所属):** Hanya mencari jabatan dalam departemen pengaju sendiri.

**“Anggota atau di Atas” (以上に所属):** Pertama memeriksa departemen pengaju; jika tidak ditemukan jabatan yang cocok, menelusuri ke atas hierarki departemen hingga pemegang jabatan yang cocok ditemukan.

**Contoh:** Jika Karyawan A di Departemen Penjualan mengajukan dan rute memerlukan “Kepala Divisi” (本部長), sistem pertama memeriksa Departemen Penjualan → tidak ditemukan → naik ke Divisi Penjualan → menemukan Kepala Divisi.

## **3.4 Persetujuan Wakil (代理承認)**

Jika pemberi persetujuan yang ditunjuk tidak tersedia (misalnya, cuti), pemberi persetujuan wakil dapat dikonfigurasi untuk mencegah kemacetan. Konfigurasi dilakukan di Pengaturan \> Rute Persetujuan & Persetujuan Wakil \> Tab Persetujuan Wakil. Anda menentukan pemberi persetujuan mana yang digantikan dan siapa wakilnya.

## **3.5 Penerima Berbagi (共有先)**

Formulir pengajuan dapat menyertakan penerima berbagi — orang yang dapat melihat konten pengajuan tanpa menjadi bagian dari rantai persetujuan. Pengguna/departemen yang ditambahkan otomatis dapat dikonfigurasi per formulir.

# **4\. Percabangan Rute Otomatis**

## **4.1 Percabangan Berdasarkan Jumlah (金額分岐)**

Tersedia untuk Permintaan Pembelian dan Laporan Pengeluaran. Tahap persetujuan dapat memiliki kondisi jumlah yang otomatis aktif berdasarkan total jumlah pengajuan.

**Contoh:**

* ¥300.000 ke atas → Kepala Seksi → Manajer → Kepala Departemen (3 tahap)

* ¥100.000–¥299.999 → Kepala Seksi → Manajer (2 tahap)

* Di bawah ¥100.000 → Kepala Seksi saja (1 tahap)

Kondisi jumlah diatur per tahap persetujuan dalam satu rute. Tahap dengan kondisi yang tidak terpenuhi secara otomatis dilewati. Izin yang diperlukan: Administrator atau Umum (Akuntansi).

## **4.2 Percabangan Berdasarkan Jabatan (役職分岐)**

Tersedia untuk Laporan Pengeluaran, Permintaan Pembayaran, dan Berbagai Pengajuan. Rute persetujuan yang berbeda dipilih secara otomatis berdasarkan jabatan/posisi pengaju.

**Contoh:**

* Jika pengaju adalah Manajer (課長) → Rute A (Kepala Departemen saja, 1 tahap)

* Jika pengaju adalah Kepala Seksi (係長) → Rute B (Manajer → Kepala Departemen, 2 tahap)

* Selainnya → Rute C (Kepala Seksi → Manajer → Kepala Departemen, 3 tahap)

Ini dikonfigurasi melalui “Aturan Pemilihan Otomatis” pada pengaturan formulir pengajuan, dengan maksimal 30 aturan.

## **4.3 Percabangan Gabungan**

Kondisi berbasis jumlah dan berbasis jabatan dapat digabungkan menggunakan logika AND. Misalnya: “Jika pengaju adalah Kepala Seksi DAN total jumlah ¥500.000 atau lebih, gunakan Rute X.” Kondisi OR tidak didukung. Saat menggabungkan dengan percabangan jumlah, aturan harus diurutkan dari jumlah terbesar ke terkecil.

# **5\. Pembatasan Pengajuan (申請制限)**

Pembatasan pengajuan menegakkan kepatuhan anggaran dengan menghubungkan permintaan pembelian ke dokumen hilir.

## **5.1 Apa yang Dapat Dibatasi**

| Fitur | Peringatan Saja | Blokir/Larang |
| :---- | :---- | :---- |
| Laporan Pengeluaran | ✓ | ✓ (pengajuan diblokir) |
| freee Card Unlimited | ✗ (direncanakan) | ✓ (asosiasi diblokir) |
| Faktur Diterima (Perm. Pembayaran) | ✗ (direncanakan) | ✓ (asosiasi diblokir) |

## **5.2 Cara Kerjanya**

Ambang batas tingkat konsumsi (misalnya, 120%) ditetapkan secara global. Ketika tingkat konsumsi permintaan pembelian yang ditautkan melebihi ambang ini, pembatasan yang dikonfigurasi aktif.

**Contoh:** Anggaran permintaan pembelian \= ¥100.000, ambang batas \= 120%. Jika laporan pengeluaran yang ditautkan melebihi ¥120.000, pembatasan aktif.

## **5.3 Catatan Izin**

* Pengguna yang dikecualikan: Mereka yang memiliki izin laporan pengeluaran di luar “diri sendiri saja.”

* Pengguna yang dapat mengkonfigurasi pembatasan: Mereka yang memiliki izin operasi “Formulir Pengajuan.”

* Pengguna tanpa hak melihat permintaan pembelian tidak akan melihat peringatan, tetapi pembatasan “pengajuan diblokir” tetap berlaku.

# **6\. Formulir Pengajuan (申請フォーム)**

## **6.1 Konfigurasi (Hanya Admin)**

Administrator mengkonfigurasi formulir permintaan pembelian melalui Pengaturan \> Formulir Pengajuan \> Tab Permintaan Pembelian. Setiap formulir mencakup:

* Pengaturan dasar: Nama formulir, deskripsi, status aktif/nonaktif, urutan tampilan

* Field default: Judul, konten, jumlah pembayaran (wajib), pengaturan pajak, tanggal perkiraan, metode pembayaran, vendor, item, departemen, tag memo, segmen

* Lampiran file: Opsional/wajib per formulir

* Field kustom: Field bebas dengan tipe termasuk teks satu baris, teks multi-baris, tanggal, rentang tanggal, angka, dropdown, checkbox, dan tombol radio

* Catatan: Field catatan opsional

* Rute: Rute persetujuan yang ditugaskan dan rute dasar default

* Penerima berbagi: Penonton yang ditambahkan otomatis

## **6.2 Status Pengajuan**

| Status | Arti |
| :---- | :---- |
| **Draf (下書き)** | Disimpan tetapi belum diajukan |
| **Menunggu (承認待ち)** | Diajukan, menunggu persetujuan |
| **Disetujui (承認)** | Semua pemberi persetujuan telah menyetujui |
| **Ditolak (却下)** | Pengajuan ditolak |
| **Dikembalikan (差戻し)** | Dikirim kembali ke pengaju untuk revisi |

## **6.3 Tindakan Pasca-Persetujuan**

Setelah permintaan pembelian disetujui, dapat ditautkan ke: permintaan pembayaran, laporan pengeluaran, berbagai pengajuan, atau langsung dikaitkan dengan transaksi.

# **7\. Integrasi freee HR untuk Rute Persetujuan**

Rute persetujuan dapat berintegrasi dengan freee HR (人事労務) untuk secara otomatis menentukan pemberi persetujuan berdasarkan data departemen dan jabatan. Persyaratan:

* Karyawan harus terdaftar dengan alamat email yang sama di freee Accounting dan freee HR.

* Informasi departemen dan jabatan harus diatur di freee HR.

* Departemen dan jabatan dari freee HR menjadi tersedia untuk konfigurasi rute.

Integrasi ini memungkinkan penugasan pemberi persetujuan otomatis — saat karyawan mengajukan permintaan, sistem mencari departemen mereka, menemukan pemegang jabatan, dan menugaskan mereka sebagai pemberi persetujuan tanpa pemilihan manual.

# **8\. Ringkasan Persyaratan Paket**

| Fitur | Paket Minimum |
| :---- | :---- |
| Pengajuan laporan pengeluaran dasar | Starter (Korporat) / Premium (Individual) |
| Rute persetujuan untuk laporan pengeluaran / permintaan pembelian / berbagai pengajuan | Advance (atau lama Professional) |
| Percabangan berdasarkan jumlah | Advance (atau lama Professional) |
| Percabangan berdasarkan jabatan | Advance (atau lama Professional) |
| Pembatasan pengajuan | Advance (atau lama Professional) |
| Set izin kustom | Advance (atau lama Professional) / Premium (Individual) |
| Fitur permintaan pembelian | Advance (atau lama Professional) |
| Rute persetujuan untuk permintaan pembayaran & faktur | Hanya lama Professional / lama Enterprise |

*Dokumen disusun dari artikel freee Help Center. Terakhir ditinjau: Maret 2026\.*