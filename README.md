# TOKBER (Toko Bersama)
> **Real-Time Auction & Escrow Ecosystem.** > *"Keamanan Lelang Transparan, Tanpa Celah Bid & Run."*

![TokBer Banner](https://via.placeholder.com/1200x400?text=TOKBER+AUCTION+SYSTEM+2026)

## 1. Deskripsi Proyek
TokBer adalah platform lelang full-stack yang dirancang untuk mengatasi masalah klasik dalam dunia lelang online: **ketidaksinkronan data harga** dan **fenomena Bid & Run**. Dibangun dengan fokus pada kecepatan real-time dan integritas data di level database.

---

## 2. Tech Stack (The Engine)
![Vue.js](https://img.shields.io/badge/vuejs-%2335495e.svg?style=for-the-badge&logo=vuedotjs&logoColor=%234FC08D)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

- **Frontend:** Vue 3 (Composition API)
- **Styling:** Tailwind CSS (Dark-mode minimalis / Neon Yellow accent)
- **BaaS:** Supabase (Auth, DB, Storage)
- **Real-time:** Supabase Realtime & PostgreSQL Replication
- **Security:** PostgreSQL Triggers & Row Level Security (RLS)

---

## 3. Fitur Utama & Arsitektur
- **Smart Real-time Bidding:** Sinkronisasi harga via trigger database (Tested on Poco X5, Xiaomi Pad 6).
- **Anti-Fatigue Notification:** Logika *Smart Grouping* untuk mencegah spam notifikasi.
- **Reputation Guard:** Gerbang otomatis berbasis rating reputasi.
- **Top 3 Winner Fallback:** Otomatisasi pemenang cadangan jika penawar utama gagal.
- **Escrow & Wallet:** Sistem deposit saldo sebagai jaminan komitmen bidder.

---

## 4. Tantangan Teknis & Solusi
| Masalah | Solusi |
| :--- | :--- |
| **UI Blank Screen** | Standarisasi format path dengan *leading slash* (`/`) pada `router.js`. |
| **Sinkronisasi Berat** | Implementasi **Denormalisasi Data** via PostgreSQL Triggers pada kolom `current_bid`. |
| **Layout Overlapping** | Implementasi *Global Wrapper* di `App.vue` dengan kalkulasi padding presisi. |

---

## 5. Pembahasan Lengkap Reputasi Sistem
Sistem yang menjaga ekosistem dari "Bidder Nakal" melalui kasta dan limitasi.

### Tabel Kasta TokBer
| Rank | Rep (REP) | Color | Bid Limit | Filosofi |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Admin | Red | Infinity | Pemegang kunci server. |
| **LEGEND** | > 1200 | Gold | Infinity | Kolektor "Paus" sejati. |
| **MASTER** | 800 – 1199 | Diamond | Rp 500.000.000 | Jembatan keamanan. |
| **EXPERT** | 400 – 799 | Purple | Rp 100.000.000 | Item TCG/Figure Grade tinggi. |
| **INTERMEDIATE**| 200 – 399 | Blue | Rp 40.000.000 | Kolektor menengah. |
| **MEMBER** | 0 - 199 | Green | Rp 5.000.000 | Filter keamanan user baru. |

### Sistem Deposit Progresif
Deposit berlaku sebagai **Jaminan Tambahan** jika Bid melampaui limit Rank.

| Rank | Reputation | Deposit | Filosofi |
| :--- | :--- | :--- | :--- |
| **MEMBER** | 0 - 199 | **20%** | High Risk. |
| **INTERMEDIATE**| 200 - 399 | **15%** | Medium Risk. |
| **EXPERT** | 400 - 799 | **10%** | Standard Professional. |
| **MASTER** | 800 - 1199 | **5%** | Trusted User. |
| **LEGEND** | > 1200 | **0%** | VIP (Always Free). |

---

## 6. Aturan Penalti & Pemulihan
### Penalti (The Penalty Logs)
- **Bid & Run (#1):** -150 REP (Grace Period 08:00 - 00:00).
- **Fallback Fail (#2):** -100 REP.
- **Fallback Fail (#3):** -50 REP.
- **Laporan Palsu:** -40 REP.
- **Toxic/SARA:** -20 REP.

### Penambahan (The Growth Logs)
- **Pelunasan Tepat Waktu:** +20 REP.
- **Testimoni Bintang 5:** +5 REP.
- **KYC (Verifikasi KTP):** +50 REP.
- **Fallback Hero:** +15 REP (Menyelamatkan lelang).

### Jalur Pemulihan (Road to Redemption)
User dengan **REP < 0** masuk status **Restricted**:
1. **Probation:** Limit flat Rp 5jt & Wajib Deposit 30%.
2. **Quest Penebusan:** Menang kategori "Murah" (< 200rb) 3x tanpa cacat (+20 REP/item).
3. **Denda Penebusan:** Bayar Rp 100.000 (Commitment Fee) untuk reset ke +50 REP.

---

## 🚩 7. Syarat & Ketentuan (Mutlak)
> [!CAUTION]
> **SISTEM PENGUNCIAN DATA:** > Setiap Bid yang masuk ke Leaderboard bersifat **FINAL & MENGIKAT**. TokBer tidak menyediakan fitur pembatalan/perubahan nominal dengan alasan apa pun (termasuk Typo). Ketidaktelitian input yang berujung gagal bayar akan diproses sebagai **BID & RUN**.

---
*Developed with ❤️ by Hary - 2026*
