<script setup>
import { ref } from "vue";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  LifebuoyIcon,
} from "@heroicons/vue/24/outline";

const ranks = [
  {
    name: "OWNER",
    rep: "Admin Status",
    color: "bg-red-600",
    limit: "Infinity",
    desc: "Pemegang kunci server.",
  },
  {
    name: "LEGEND",
    rep: "> 1200",
    color: "bg-yellow-500 text-black",
    limit: "Infinity",
    desc: 'Kasta tertinggi. Kolektor "Paus" sejati.',
  },
  {
    name: "MASTER",
    rep: "800 – 1199",
    color: "bg-cyan-400 text-black",
    limit: "Rp500jt",
    desc: "Jembatan keamanan sebelum ke Infinity.",
  },
  {
    name: "EXPERT",
    rep: "400 – 799",
    color: "bg-purple-600",
    limit: "Rp100jt",
    desc: "Untuk item TCG/Figure Grade tinggi (PSA 10).",
  },
  {
    name: "INTERMEDIATE",
    rep: "200 – 399",
    color: "bg-blue-600",
    limit: "Rp40jt",
    desc: "Kolektor menengah (Sealed boxes, Rare items).",
  },
  {
    name: "MEMBER",
    rep: "0 - 199",
    color: "bg-green-600",
    limit: "Rp5jt",
    desc: "Filter keamanan buat user baru.",
  },
];

const deposits = [
  { rank: "MEMBER", dep: "20%", risk: "High Risk" },
  { rank: "INTERMEDIATE", dep: "15%", risk: "Medium Risk" },
  { rank: "EXPERT", dep: "10%", risk: "Standard" },
  { rank: "MASTER", dep: "5%", risk: "Trusted" },
  { rank: "LEGEND", dep: "0%", risk: "VIP/Free" },
];
</script>

<template>
  <div
    class="min-h-screen bg-[#0a0a0a] text-gray-300 p-6 pt-12 pb-32 space-y-12 max-w-6xl mx-auto"
  >
    <!-- HEADLINE -->
    <div class="text-center space-y-2">
      <h1
        class="text-5xl md:text-7xl font-[1000] italic uppercase tracking-tighter text-white"
      >
        REPU<span class="text-yellow-500">TASI</span>
      </h1>
      <p
        class="text-lg md:text-xl font-black italic uppercase text-red-500 tracking-[0.3em]"
      >
        "Don't break the Trust!"
      </p>
    </div>

    <!-- 1. TABEL RANK UTAMA -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 px-2">
        <ShieldCheckIcon class="w-6 h-6 text-yellow-500" />
        <h2 class="text-xl font-black uppercase italic text-white">
          Lengkap Reputasi Sistem TokBer
        </h2>
      </div>

      <div
        class="overflow-x-auto rounded-3xl border border-white/5 bg-white/[0.02]"
      >
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-white/10 text-[10px] font-black uppercase italic text-gray-500"
            >
              <th class="p-5">Rank</th>
              <th class="p-5">Reputation</th>
              <th class="p-5">Bid Limit</th>
              <th class="p-5">Filosofi</th>
            </tr>
          </thead>
          <tbody class="text-xs font-bold uppercase italic">
            <tr
              v-for="r in ranks"
              :key="r.name"
              class="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
            >
              <td class="p-5">
                <span
                  :class="[
                    r.color,
                    'px-3 py-1 rounded-lg text-[10px] font-[1000]',
                  ]"
                  >{{ r.name }}</span
                >
              </td>
              <td class="p-5 text-white">{{ r.rep }}</td>
              <td class="p-5 text-yellow-500">{{ r.limit }}</td>
              <td class="p-5 text-gray-500 leading-relaxed max-w-xs">
                {{ r.desc }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 2. DEPOSIT PROGRESIF SECTION -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section
        class="space-y-6 bg-white/5 p-8 rounded-[40px] border border-white/10 shadow-2xl"
      >
        <div class="space-y-2">
          <h2 class="text-2xl font-[1000] italic uppercase text-white">
            Deposit Progresif
          </h2>
          <p
            class="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic"
          >
            Jaminan keamanan Bid melampaui Rank
          </p>
        </div>

        <div class="space-y-4">
          <div
            v-for="d in deposits"
            :key="d.rank"
            class="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5"
          >
            <div class="flex flex-col">
              <span class="text-[10px] font-black text-gray-500">{{
                d.risk
              }}</span>
              <span class="text-sm font-black text-white italic uppercase">{{
                d.rank
              }}</span>
            </div>
            <div class="text-right">
              <span class="text-2xl font-[1000] italic text-yellow-500">{{
                d.dep
              }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- SIMULASI LOGIC -->
      <section
        class="space-y-6 bg-yellow-500 text-black p-8 rounded-[40px] shadow-[0_0_50px_rgba(234,179,8,0.2)]"
      >
        <div class="flex items-center gap-3">
          <BanknotesIcon class="w-8 h-8" />
          <h2 class="text-2xl font-[1000] italic uppercase">
            Simulasi Bid > Limit
          </h2>
        </div>
        <div class="space-y-4 font-bold italic text-sm leading-tight">
          <div class="p-4 bg-black/10 rounded-2xl border border-black/10">
            <p>
              User <span class="underline">Member</span> (Limit 5jt) mau ngebid
              barang <span class="underline">15jt</span>.
            </p>
          </div>
          <ul class="space-y-3 list-disc pl-5">
            <li>
              <span class="font-black">Trigger:</span> Muncul Pop-up Peringatan
              wajib deposit.
            </li>
            <li>
              <span class="font-black">Deposit:</span> Setor 10% (1.5jt) via
              Saldo TokBer/QRIS.
            </li>
            <li>
              <span class="font-black">Menang:</span> Bayar sisa (13.5jt + Fee
              Admin).
            </li>
            <li>
              <span class="font-black">Kalah:</span> Deposit 1.5jt balik 100% ke
              saldo.
            </li>
            <li>
              <span class="font-black text-red-700 uppercase">Bid & Run:</span>
              Deposit HANGUS & Reputasi DROP.
            </li>
          </ul>
        </div>
      </section>
    </div>

    <!-- 3. PENALTY & RECOVERY -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- PENALTY -->
      <div
        class="bg-red-500/10 border border-red-500/20 p-8 rounded-[40px] space-y-6"
      >
        <div class="flex items-center gap-3">
          <ExclamationTriangleIcon class="w-6 h-6 text-red-500" />
          <h2 class="text-xl font-black italic uppercase text-red-500">
            The Red Zone (Penalties)
          </h2>
        </div>
        <div class="space-y-4">
          <div
            class="flex justify-between items-center border-b border-red-500/10 pb-2 text-xs"
          >
            <span class="font-bold italic">Winner #1 Kabur (24 Jam)</span>
            <span class="font-black text-red-500">-150 REP</span>
          </div>
          <div
            class="flex justify-between items-center border-b border-red-500/10 pb-2 text-xs"
          >
            <span class="font-bold italic">Fallback Fail (#2 / #3)</span>
            <span class="font-black text-red-500">-100 / -50 REP</span>
          </div>
          <div
            class="flex justify-between items-center border-b border-red-500/10 pb-2 text-xs"
          >
            <span class="font-bold italic">Laporan Palsu / Toxic</span>
            <span class="font-black text-red-500">-40 / -20 REP</span>
          </div>
        </div>
      </div>

      <!-- RECOVERY -->
      <div
        class="bg-green-500/10 border border-green-500/20 p-8 rounded-[40px] space-y-6"
      >
        <div class="flex items-center gap-3">
          <ArrowTrendingUpIcon class="w-6 h-6 text-green-500" />
          <h2 class="text-xl font-black italic uppercase text-green-500">
            The Road to Recovery
          </h2>
        </div>
        <div class="space-y-4">
          <div
            class="flex justify-between items-center border-b border-green-500/10 pb-2 text-xs"
          >
            <span class="font-bold italic">Pelunasan Tepat Waktu</span>
            <span class="font-black text-green-500">+20 REP</span>
          </div>
          <div
            class="flex justify-between items-center border-b border-green-500/10 pb-2 text-xs"
          >
            <span class="font-bold italic">Verifikasi Identitas (KYC)</span>
            <span class="font-black text-green-500">+50 REP</span>
          </div>
          <div
            class="flex justify-between items-center border-b border-green-500/10 pb-2 text-xs"
          >
            <span class="font-bold italic">Login 7 Hari Beruntun</span>
            <span class="font-black text-green-500">+2 REP</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. PENEBUSAN DOSA (PROBATION) -->
    <section
      class="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[40px] border border-white/5 relative overflow-hidden"
    >
      <div class="relative z-10 space-y-6">
        <div class="flex items-center gap-3">
          <LifebuoyIcon class="w-7 h-7 text-blue-500" />
          <h2 class="text-2xl font-[1000] italic uppercase text-white">
            Quest Penebusan Dosa
          </h2>
        </div>
        <p class="text-xs font-bold italic text-gray-500 uppercase">
          Hukuman bagi User dengan poin < 0 (Restricted)
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            class="p-5 bg-white/5 rounded-3xl border border-white/5 text-center"
          >
            <p
              class="text-[10px] font-black text-blue-500 mb-2 uppercase italic"
            >
              The Buyer Task
            </p>
            <p class="text-[11px] font-bold italic">
              Menang lelang item "Murah" (< 200rb) 3x tanpa cacat.
            </p>
          </div>
          <div
            class="p-5 bg-white/5 rounded-3xl border border-white/5 text-center"
          >
            <p
              class="text-[10px] font-black text-blue-500 mb-2 uppercase italic"
            >
              Denda Penebusan
            </p>
            <p class="text-[11px] font-bold italic">
              Bayar Rp 100.000 ke kas platform sebagai asuransi komitmen.
            </p>
          </div>
          <div
            class="p-5 bg-white/5 rounded-3xl border border-white/5 text-center"
          >
            <p
              class="text-[10px] font-black text-blue-500 mb-2 uppercase italic"
            >
              Auto Pardon
            </p>
            <p class="text-[11px] font-bold italic">
              Berkelakuan baik 3 bulan = Poin reset ke +1.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
