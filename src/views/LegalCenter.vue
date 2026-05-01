<script setup>
import { ref, computed } from "vue";
import {
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/24/outline";

// --- KODE SUCI: DATA TETAP SAMA ---
const activeTab = ref("sk");
const searchQuery = ref("");
const openFaq = ref(null);

const terms = [
  {
    id: "01",
    title: "Ketentuan Umum",
    content:
      "BIDARA adalah platform lelang digital yang mempertemukan penjual dan pembeli dalam sistem kompetitif berbasis reputasi dan fair play. Dengan menggunakan platform ini, pengguna dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan yang berlaku.",
  },
  {
    id: "02",
    title: "Akun & Tanggung Jawab",
    content:
      "Setiap pengguna wajib menggunakan data yang valid dan bertanggung jawab atas aktivitas akunnya. Dilarang menggunakan lebih dari satu akun untuk manipulasi sistem. BIDARA berhak menangguhkan atau menonaktifkan akun yang melanggar ketentuan.",
  },
  {
    id: "03",
    title: "Sistem Lelang",
    content:
      "Setiap bid yang dilakukan bersifat mengikat dan tidak dapat dibatalkan. Pemenang lelang adalah pengguna dengan bid tertinggi saat waktu berakhir atau melalui sistem fallback. Sistem dapat memperpanjang waktu lelang (anti-sniper) untuk menjaga fair play.",
  },
  {
    id: "04",
    title: "Kewajiban Pemenang",
    content:
      "Pemenang wajib menyelesaikan pembayaran dalam waktu yang ditentukan. Kegagalan pembayaran akan dikenakan sanksi sesuai sistem reputasi. BIDARA tidak bertanggung jawab atas kesepakatan di luar sistem.",
  },
  {
    id: "05",
    title: "Sistem Reputasi & Rank",
    content:
      "Setiap pengguna memiliki skor reputasi yang mencerminkan tingkat kepercayaan. Reputasi akan naik jika transaksi berhasil dan turun jika terjadi pelanggaran. Rank menentukan batas bid dan kewajiban deposit.",
  },
  {
    id: "06",
    title: "Deposit & Escrow",
    content:
      "Pengguna mungkin diwajibkan melakukan deposit sesuai rank. Deposit digunakan sebagai jaminan komitmen dan akan hangus jika pemenang tidak menyelesaikan pembayaran. Sebagian atau seluruh deposit dapat diberikan kepada penjual sebagai kompensasi.",
  },
  {
    id: "07",
    title: "Sistem Fallback (Top 3)",
    content:
      "Jika pemenang utama gagal menyelesaikan pembayaran, hak akan dialihkan ke peringkat berikutnya. Pengguna dalam posisi fallback dianggap telah berkomitmen untuk melanjutkan transaksi.",
  },
  {
    id: "08",
    title: "Larangan",
    content:
      "Pengguna dilarang melakukan bid tanpa niat membeli, manipulasi harga atau sistem, penyalahgunaan akun, serta aktivitas yang merugikan pengguna lain.",
  },
  {
    id: "09",
    title: "Sanksi",
    content:
      "BIDARA berhak memberikan penurunan reputasi, pembatasan fitur, hingga suspensi atau pemblokiran akun secara permanen.",
  },
  {
    id: "10",
    title: "Batas Tanggung Jawab",
    content:
      "BIDARA bertindak sebagai fasilitator dan tidak bertanggung jawab atas kualitas barang, kesepakatan di luar platform, maupun sengketa antar pengguna (kecuali terkait sistem).",
  },
  {
    id: "11",
    title: "Perubahan Ketentuan",
    content:
      "BIDARA berhak memperbarui S&K sewaktu-waktu tanpa pemberitahuan terlebih dahulu.",
  },
];

const faqs = [
  {
    q: "Apa itu BIDARA?",
    a: "BIDARA adalah platform lelang berbasis sistem fair play yang dirancang untuk memastikan transaksi aman, kompetitif, dan transparan.",
  },
  {
    q: "Bagaimana cara ikut lelang?",
    a: "Buat akun, pilih item, lakukan bid sesuai nominal yang tersedia, dan ikuti perkembangan hingga lelang selesai.",
  },
  {
    q: "Apakah bid bisa dibatalkan?",
    a: "Tidak. Setiap bid adalah komitmen mutlak untuk membeli.",
  },
  {
    q: "Apa yang terjadi jika saya menang?",
    a: "Anda wajib melakukan pembayaran dalam waktu yang ditentukan. Jika tidak, reputasi akan turun dan akun bisa dibatasi.",
  },
  {
    q: "Kenapa harus ada deposit?",
    a: "Deposit berfungsi sebagai jaminan keseriusan bidder dan perlindungan bagi penjual dari risiko bid & run.",
  },
  {
    q: "Bagaimana jika pemenang tidak bayar?",
    a: "BIDARA menggunakan sistem reputasi, penalti otomatis, dan mekanisme fallback (Top 3) sehingga lelang tetap berjalan tanpa merugikan penjual.",
  },
  {
    q: "Apa itu sistem reputasi?",
    a: "Sistem penilaian kepercayaan berdasarkan riwayat transaksi dan kepatuhan terhadap aturan platform.",
  },
  {
    q: "Apakah lelang ini aman?",
    a: "Ya. BIDARA dilengkapi sistem anti bid & run, deposit & escrow, serta mekanisme fallback.",
  },
  {
    q: "Apa itu anti-sniper?",
    a: "Jika ada bid di detik terakhir, waktu lelang otomatis diperpanjang untuk memberikan kesempatan adil bagi semua bidder.",
  },
  {
    q: "Bagaimana jika saya kalah?",
    a: "Anda bisa melanjutkan bid selama waktu masih ada atau menunggu kesempatan fallback jika pemenang di atas Anda gagal.",
  },
  {
    q: "Apakah BIDARA menjamin transaksi?",
    a: "BIDARA menjamin sistem berjalan adil, namun detail transaksi fisik tetap menjadi tanggung jawab penjual dan pembeli.",
  },
];

const filteredFaqs = computed(() => {
  return faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.value.toLowerCase()),
  );
});
</script>

<template>
  <div
    class="min-h-screen bg-transparent text-gray-300 p-6 pt-12 pb-32 max-w-7xl mx-auto space-y-12 md:space-y-20"
  >
    <!-- HEADER -->
    <div class="text-center space-y-4">
      <h1
        class="text-6xl md:text-8xl lg:text-9xl font-[1000] italic uppercase tracking-tighter text-white"
      >
        BI<span class="text-yellow-500">DARA</span>
      </h1>
      <p
        class="text-xs md:text-sm lg:text-base font-black italic uppercase text-gray-400 tracking-[0.5em] md:tracking-[0.8em]"
      >
        BID ARenA — Professional Auction System
      </p>
    </div>

    <!-- TAB NAVIGATION -->
    <div
      class="flex gap-2 p-1.5 bg-white/10 rounded-2xl border border-white/10 max-w-md md:max-w-2xl mx-auto"
    >
      <button
        @click="activeTab = 'sk'"
        :class="
          activeTab === 'sk'
            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
            : 'text-gray-400 md:hover:text-white'
        "
        class="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] md:text-xs font-black uppercase italic transition-all"
      >
        <ScaleIcon class="w-4 h-4 md:w-5 md:h-5" />
        Syarat & Ketentuan
      </button>
      <button
        @click="activeTab = 'faq'"
        :class="
          activeTab === 'faq'
            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
            : 'text-gray-400 md:hover:text-white'
        "
        class="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] md:text-xs font-black uppercase italic transition-all"
      >
        <QuestionMarkCircleIcon class="w-4 h-4 md:w-5 md:h-5" />
        F.A.Q
      </button>
    </div>

    <!-- CONTENT: S&K (Grid Tegas, No Hover Mobile) -->
    <div
      v-if="activeTab === 'sk'"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="term in terms"
        :key="term.id"
        class="group p-8 bg-white/5 border border-white/10 rounded-[2rem] md:hover:bg-white/[0.08] md:hover:border-yellow-500/30 transition-all duration-300"
      >
        <div class="flex flex-col gap-4">
          <!-- Nomor S&K: Dibuat sangat tegas dan besar -->
          <span
            class="text-6xl font-[1000] italic text-white/20 leading-none md:group-hover:text-yellow-500/40 transition-colors"
          >
            {{ term.id }}
          </span>
          <div class="space-y-4">
            <h3
              class="text-base md:text-lg font-black uppercase italic text-yellow-500 tracking-wider"
            >
              {{ term.title }}
            </h3>
            <p
              class="text-xs md:text-sm leading-relaxed text-gray-200 font-bold italic uppercase tracking-wide"
            >
              {{ term.content }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- CONTENT: FAQ -->
    <div v-if="activeTab === 'faq'" class="max-w-4xl mx-auto space-y-12">
      <!-- AD BANNER -->
      <div
        class="bg-yellow-500 p-8 md:p-12 rounded-[2rem] text-black shadow-2xl relative overflow-hidden group"
      >
        <div class="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <ExclamationCircleIcon class="w-12 h-12 flex-shrink-0" />
          <p
            class="text-lg md:text-2xl font-[1000] italic uppercase leading-tight text-center md:text-left"
          >
            “BIDARA dirancang untuk menghilangkan risiko pembeli kabur dan
            memastikan setiap lelang berakhir dengan hasil yang adil.”
          </p>
        </div>
      </div>

      <!-- SEARCH: Ultra Visible -->
      <div class="relative">
        <MagnifyingGlassIcon
          class="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="CARI PROTOKOL ARENA..."
          class="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-6 pl-16 pr-8 text-sm font-black uppercase italic text-white focus:outline-none focus:border-yellow-500 transition-all shadow-inner"
        />
      </div>

      <!-- FAQ ACCORDION -->
      <div class="space-y-4">
        <div v-for="(faq, index) in filteredFaqs" :key="index" class="group">
          <button
            @click="openFaq = openFaq === index ? null : index"
            class="w-full flex items-center justify-between p-7 bg-white/5 border border-white/10 rounded-2xl md:hover:bg-white/[0.08] transition-all"
          >
            <span
              class="text-sm font-black uppercase italic text-left text-gray-300 group-hover:text-white transition-colors"
            >
              {{ faq.q }}
            </span>
            <ChevronDownIcon
              :class="
                openFaq === index
                  ? 'rotate-180 text-yellow-500'
                  : 'text-gray-500'
              "
              class="w-6 h-6 transition-all duration-300"
            />
          </button>
          <div
            v-show="openFaq === index"
            class="p-8 text-sm text-gray-400 font-bold italic leading-relaxed bg-black/40 border-x border-b border-white/10 rounded-b-2xl -mt-4 animate-fadeIn"
          >
            {{ faq.a }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
