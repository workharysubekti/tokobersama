TOKBER
( Toko Bersama ) – Real Time Auction & Escrow Ecosystem
#Keamanan Lelang Transparan, Tanpa Celah Bid & Run.

1.	Deskripsi Proyek
TokBer adalah platform lelang full-stack yang dirancang untuk mengatasi masalah klasik dalam dunia lelang online: ketidaksinkronan data harga dan maraknya fenomena Bid & Run. Dibangun dengan fokus pada kecepatan real-time dan integritas data di level database.

2.	Tech Stack (The Engine)
•	Frontend: Vue 3 (Composition API) – Menjamin UI yang reaktif dan state management yang efisien.
•	Styling: Tailwing CSS – Desain dark-mode minimalis dengan sentuhan aesthetic kuning neon.
•	Backend as a Service: Supabase – Mengelola Autentikasi, Database PostgreSQL, dan Storage.
•	Real-time Logic: Supabase Realtime & PostgreSQL Replication – Sinkronisasi harga antar perangkat dalam hitungan milidetik.
•	Security Layer: PostgreSQL Triggers & Row Level Security (RLS) – Menjamin kemanan data langsung dari “jantung” database.

3.	Fitur Utama & Arsitekur
•	Smart Real-time Bidding: Sistem sinkronisasi harga yang menggunakan trigger database untuk memastikan harga yang tampil selalu akurat tanpa membebani performa perangkat (Tested on: Poco X5, Infinix HOT 30, Redmi Note 12, Xiaomi Pad 6).
•	Anti-Fatigue Notification: Logika Smart Grouping yang mencegah penumpukan notifikasi pada barang yang sama, menjaga kenyamanan pengguna.
•	Reputation Guard (Planned): Sistem gerbang otomatis yang membatasi partisipasi lelang berdasarkan rating reputasi pengguna (Min 50).
•	Top 3 Winner Fallback (Planned): Otomatisasi pemenang cadangan jika penawar tertinggi gagal melakukan kewajiban pembayaran.
•	Escrow & Wallet (Planned): Fitur deposit saldo untuk mengunci komitmen bidder, meminimalisir risiko kerugian bagi penjual.

4.	Tantangan Teknis & Solusi
•	Tantangan 1: UI Blank Screen (The “Leading Slash” Mystery)
•	Masalah: Saat tahap awal pengembangan, seluruh halaman web tiba-tiba menjadi hitam (blank) dengan error Invalid Path di konsol.
•	Solusi: Setelah melakukan deep debugging pada Vue Router, ditemukan ketidakkonsistenan penulisan path pada router.js. Solusinya adalah melakukan standarisasi format path dengan memastikan setiap rute diawali tanda / (leading slash) untuk sinkronisasi navigasi yang sempurna.
•	Tantangan 2: Sinkronisasi Data Real-Time Antar Tabel
•	Masalah: Menampilkan harga tertinggi secara instan dari ribuan data di tabel bids sangat membebani performa jika dihitung dari sisi client.
•	Solusi: Implementasi strategi Denormalisasi Data. Saya membuat Trigger di PostgreSQL yang otomatis melakukan update kolom current_bid di tabel products setiap kali ada bid baru. Hasilnya, frontend hanya perlu memantau satu baris data, membuat aplikasi sangat ringan di perangkat mobile.
•	Tantangan 3: Layout Overlapping (Fixed Component Issue)
•	Masalah: Header dan Bottom Navigation yang bersifat fixed menutupi konten utama pada berbagai ukuran layar.
•	Solusi: Membuat Global Wrapper pada App.vue dengan perhitungan padding yang presisi (pt dan pb) yang membungkus router-view. Solusi ini memperbaiki masalah tata letak di seluruh halaman sekaligus tanpa perlu mengubah kode di tiap komponen.
 
PEMBAHASAN LENGKAP REPUTASI SISTEM DI TOKBER

Rank	Reputation (REP)	Color	Bid Limit (IDR)	Filosofi & Target Barang
OWNER	Admin Status	Red	Infinity	Pemegang kunci server.
LEGEND	> 1200	Gold	Infinity	Kasta tertinggi. Kolektor "Paus" sejati.
MASTER	800 – 1199	Diamond	Rp500,000,000	Jembatan keamanan sebelum ke Infinity.
EXPERT	400 – 799	Purple	Rp100,000,000	Untuk item TCG/Figure Grade tinggi (PSA 10).
INTERMEDIATE	200 – 399	Blue	Rp40,000,000	Kolektor menengah (Sealed boxes, Rare items).
MEMBER	0 - 199	Green	Rp5,000,000	Filter keamanan buat user baru.
Reputasi berfungsi sebagai sistem yang menjaga dan menangani Bidder nakal, yang suka kabur ketika sudah menang, berikut saya jelaskan secara rinci dalam tabel untuk sistem Reputasi :

Q : “Terus bagaimana cara saya yang masih rank Member dengan limit Rp 5.000.000 mau ngebid barang di harga Rp 15.000.000 ?”
A : Dengan melakukan deposit tepat setelah anda menekan tombol bid, saya jelaskan Contoh Simulasinya di sistem :
•	Trigger Sistem: User dengan Reputasi 100 dan Rank Member ingin ikut bid barang seharga Rp 15.000.000, tetapi limitnya hanya Rp 5.000.000 untuk Rank Member, tepat setelah User menekan tombol bid sistem akan melakukan validasi apabila Bid > Rank Limit, maka akan muncul Pop Up Peringatan dari sistem tepat setelah User menekan tombol Bid.
•	Pop-up: Muncul Pop Up peringatan: “Rank Anda (Member) memiliki limit 5jt. Untuk Bid barang ini, anda wajib setor deposit jaminan 10% (Rp 1.500.000).” Note : 10% ini hanyalah contoh yang dipakai untuk simulasi.
•	Deposit: User bayar (via saldo yang sudah dia Top-up ke dompet digital TokBer atau lewat QRIS). Begitu saldo masuk ke dalam deposit, bid baru dianggap sah dan masuk ke leaderboard lelang.
•	Skenario A ( MENANG ) : Sisa yang harus di bayar: Rp 15.000.000 – Rp 1.500.000(Deposit) = Rp 13.500.000 + Admin Fee.
•	Skenario B (KALAH): Deposit Rp 1.500.000 otomatis dikembalikan penuh ke saldo digital milik user.
•	Skenario C (BID & RUN): User menang tapi menghilang (tidak bisa bayar dalam 1x24 jam). 
o	PENALTY: Deposit Rp 1.500.000 HANGUS (Masuk ke Kas TokBer dan Kompensasi buat Seller) dan REPUTASI DROP.

TABEL DEPOSIT PROGRESIF TOKBER
Perlu di ingat deposit hanya berlaku ketika User ingin melakukan BID di harga barang yang melampaui limit RANK User, saya jelaskan bagaimana DEPOSIT PROGRESIF ini bekerja:
Rank	Reputation (REP)	Deposit Jaminan	Filosofi Keamanan
MEMBER	0 - 199	20%	High Risk. Akun baru wajib setor lebih banyak agar tidak sembarangan ngebid.
INTERMEDIATE	200 - 399	15%	Medium Risk. Sudah mulai dipercaya, jaminan dikurangi sedikit.
EXPERT	400 - 799	10%	Standard. Angka jaminan standar lelang profesional.
MASTER	800 - 1199	5%	Trusted. User loyal, cukup setor "tanda jadi" saja.
LEGEND	> 1200	0% (FREE)	VIP. Sudah terbukti 100% jujur, bebas bid apa saja tanpa deposit.

DEPOSIT disini bukan sebagai PAJAK melainkan sebagai JAMINAN TAMBAHAN untuk user yang mau ngebid di luar rank reputasinya, jadi untuk user yang mau BID di lingkup ranknya tidak dikenakan DEPOSIT tapi tetap memiliki aturan untuk menghindari kasus BID & RUN.
CARA KERJA REPUTASI DI TOKBER UNTUK BID SESUAI RANK
Setiap User yang DAFTAR sebagai member TOKBER, mendapatkan Rank MEMBER, dengan REPUTASI di mulai dari 100, saya jelaskan sedikit tentang poin REPUTASI.
Aksi Pelanggaran	Poin	Dampak
Bid & Run (Pemenang Kabur)	-150, -100, -50	FATAL
Laporan Palsu (Fake Report)	-40 Reputasi	MALICIOUS
Toxic/SARA	-20 Reputasi	SOCIAL HEALTH
1.	Semua user memiliki Start Poin REPUTASI yang sama yaitu 100, poin REPUTASI maksimal yang bisa di raih user adalah 1200, dan poin minimal adalah -250, jika user melewati -250 maka konsekuensinya akan di banned permanen dari TokBer. Apa yang menyebabkan REPUTASI bisa turun ? , mari saya jelaskan :





Penjelasan :
•	Bid & Run : TokBer memiliki sistem yang bernama TOP 3 Fallback Winner, dimana sistem ini bekerja Ketika #1 tidak bisa melakukan pelunasan selama Grace Period (08.00 – 00.00) *Jam Operasional Transaksi TokBer, Maka hak kemenangan di berikan kepada #2 di Leaderboard Live Rank Bid, dengan maksimal pemenang terakhir berada di #3, setelah itu di kembalikan kepada Seller dengan pilihan Re-List atau Arsipkan. Sedikit Penjelasan untuk TOP 3 Fallback Winner dan Pengurangan Poinnya :
o	Bid & Run (Winner #1) : -150 Rep (Tidak melunasi pembayaran dalam slot 08:00 – 00:00 (Hari ke-1)
o	Fallback Fail (Winner #2): -100 Rep (Tidak melunasi saat dapet kesempatan fallback (Hari ke-2)
o	Fallback Fail (Winner #3): -50 Rep (Tidak melunasi saat dapet kesempatan fallback (Hari ke-3)
Kenapa Pemenang #2 dan #3 penaltinya lebih ringan?
Karena sebelumnya mereka adalah “orang yang kalah”. Saat mereka tiba-tiba diminta bayar, mungkin saja dana mereka sudah terpakai untuk ngebid di tempat lain. Namun, karena mereka sudah berkomitmen masuk Top 3, mereka tetap punya tanggung jawab moral, makanya penalti tetap ada tapi tidak sekejam Pemenang #1.
"The Acceptance Toggle": Saat Pemenang #1 kabur, Pemenang #2 diberikan pilihan: "Terima Kesempatan" atau "Lepas". Jika klik "Lepas" dalam waktu 2 jam pertama (jam 08:00 - 10:00 pagi), dia bebas penalti karena memberikan ruang cepat bagi Pemenang #3, begitu juga untuk Pemenang #3.
2.	Lalu bagaiamana cara mengembalikan atau mendapatkan Reputasi untuk menjangkau rank yang lebih tinggi ?, mari saya jelaskan. Reputasi ini susah untuk didapatkan tetapi mudah hilang jika user melakukan kesalahan fatal, untuk itu jaga sebaik-baiknya Reputasi yang kalian punya dan tetap ikutin peraturan yang berlaku.
Tabel Logika Penambahan Reputasi :
Aksi Positif	Poin	Syarat
Pelunasan Tepat Waktu	+20	Berhasil bayar dan menyelesaikan lelang.
Testimoni Bintang 5 (Seller)	+5	Diberikan seller setelah barang sampai dengan aman.
Penyelesaian Sengketa Damai	+15	Jika ada masalah dan buyer kooperatif menyelesaikannya.
Login Beruntun (7 Hari)	+2	Menghargai keaktifan user di platform.
Verifikasi Identitas (KYC)	+50	Bonus satu kali saat user upload KTP/Verifikasi data.
Fallback Winner	+15	Sebagai pemenang #2 atau #3 reputasi naik karena menyelamatkan lelang.

3.	Jalur Pemulihan merupakan jalur untuk User yang Reputasinya menyentuh 0 atau Minus(-), tidak akan di banned secara langsung melainkan masuk ke dalam Masa Percobaan:
o	Status “Probation” (Masa Percobaan)
User dengan poin < 0 masuk ke status MEMBER (RESTRICTED)
	Hukuman: Tidak bisa ngebid barang diatas Rp 5.000.000 secara normal.
	Solusi: Wajib melakukan Deposit Jaminan 30% (Flat) untuk semua nominal barang jika ingin ngebid.

o	Quest Penebusan Dosa
User bisa menaikkan poin kembali ke angka aman (minimal 100) dengan cara:
	The Buyer Task: Memenangkan barang lelang dengan kategori “Murah” (di bawah 200rb) sebanyak 3 kali tanpa cacat. Setiap sukses = +20 REP.
	The Mediator Task: Membantu verifikasi barang (jika user tersebut punya keahlian/sepuh) atau memberikan edukasi di chat yang di validasi admin = +30 REP.
	Denda Penebusan: Membayar “Uang Jaminan Komitmen” sebesar Rp 100.000 ke kas platform (sebagai asuransi jika kabur lagi). Begitu bayar, poin otomatis reset ke +50.

o	Automatic Recovery (Sistem Maaf)
Jika user yang minus tetap berkelakuan baik (tidak ada laporan masuk) selama 3 bulan berturut-turut:
	Sistem otomatis mereset poin ke +1 (Keluar dari zona merah). Ini memberikan harapan bagi user yang benar-benar ingin tobat tapi kesulitan menang lelang.


 
SYARAT DAN KETENTUAN
Untuk menjaga keadilan dan stabilitas ekosistem lelang di TOKBER, poin berikut berlaku secara absolut dan mutlak:

1.	SISTEM PENGUNCIAN DATA: Setiap nominal penawaran (BID) yang telah dikirimkan dan masuk ke dalam sistem Leaderboard bersifat FINAL dan MENGIKAT.
2.	TIDAK ADA PEMBATALAN/PERUBAHAN: Platform TIDAK MENYEDIAKAN fitur atau layanan untuk membatalkan, menarik, atau merubah nominal penawaran dengan alasan apa pun (termasuk kesalahan pengetikan/typo).
3.	KEWAJIBAN KETELITIAN: Pengguna diwajibkan melakukan pengecekan ulang secara mandiri terhadap angka yang dimasukkan sebelum menekan tombol BID!.
4.	KONSEKUENSI TYPO: Kesalahan input yang menyebabkan penawaran jauh di atas harga pasar tetap dianggap sah. Jika pemenang tidak dapat melunasi, maka akan dikategorikan sebagai BID & RUN dengan pinalti:
o	Reputasi: Pengurangan drastis (-150 REP).
o	Finansial: Deposit jaminan (jika ada) hangus total.
o	Status Akun: Pembatasan akses (Banned/Suspend). 

