<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabase";
import { formatPrice } from "../../utils/format";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  WalletIcon,
  CubeIcon,
} from "@heroicons/vue/24/solid";

const stats = ref({
  total_revenue: 0,
  active_auctions: 0,
  completed_deals: 0,
  total_bids: 0,
});
const loading = ref(true);

const fetchGlobalStats = async () => {
  loading.value = true;
  // 1. Hitung Produk Aktif
  const { count: activeCount } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("status", "active");

  // 2. Hitung Total Bid
  const { count: bidCount } = await supabase
    .from("bids")
    .select("*", { count: "exact" });

  // 3. Ambil Income (Lulus Moderasi & Selesai)
  const { data: incomeData } = await supabase
    .from("income_logs")
    .select("amount")
    .eq("status", "completed");
  const revenue =
    incomeData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  stats.value = {
    total_revenue: revenue,
    active_auctions: activeCount || 0,
    completed_deals: 0, // Nanti dihitung dari lelang yang sudah 'ended'
    total_bids: bidCount || 0,
  };
  loading.value = false;
};

onMounted(fetchGlobalStats);
</script>

<template>
  <div class="space-y-10">
    <div class="flex items-center gap-4">
      <div
        class="p-3 bg-yellow-500 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.3)]"
      >
        <ChartBarIcon class="w-6 h-6 text-black" />
      </div>
      <h3 class="text-2xl font-[1000] italic uppercase tracking-tighter">
        Growth <span class="text-yellow-500 text-3xl">Analytics</span>
      </h3>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        class="bg-[#0d0d0d] border border-white/5 p-8 rounded-[40px] relative overflow-hidden group"
      >
        <div
          class="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 blur-3xl"
        ></div>
        <p
          class="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4"
        >
          Total Revenue
        </p>
        <h2 class="text-3xl font-[1000] italic text-green-500">
          {{ formatPrice(stats.total_revenue) }}
        </h2>
      </div>

      <div
        class="bg-[#0d0d0d] border border-white/5 p-8 rounded-[40px] relative overflow-hidden group"
      >
        <div
          class="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/5 blur-3xl"
        ></div>
        <p
          class="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4"
        >
          Live Auctions
        </p>
        <h2 class="text-3xl font-[1000] italic">
          {{ stats.active_auctions }}
          <span class="text-[10px] text-gray-600 tracking-normal">Asets</span>
        </h2>
      </div>

      <div
        class="bg-[#0d0d0d] border border-white/5 p-8 rounded-[40px] relative overflow-hidden group"
      >
        <div
          class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 blur-3xl"
        ></div>
        <p
          class="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4"
        >
          Total Bids
        </p>
        <h2 class="text-3xl font-[1000] italic">
          {{ stats.total_bids }}
          <span class="text-[10px] text-gray-600 tracking-normal"
            >Transmissions</span
          >
        </h2>
      </div>

      <div
        class="bg-[#0d0d0d] border border-white/5 p-8 rounded-[40px] relative overflow-hidden group"
      >
        <div
          class="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 blur-3xl"
        ></div>
        <p
          class="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4"
        >
          Success Rate
        </p>
        <h2 class="text-3xl font-[1000] italic text-orange-500">98%</h2>
      </div>
    </div>

    <div
      class="bg-[#0d0d0d] border border-white/5 p-10 rounded-[50px] flex flex-col items-center justify-center min-h-[300px] border-dashed"
    >
      <ArrowTrendingUpIcon class="w-12 h-12 text-gray-800 mb-4 opacity-20" />
      <p
        class="text-[10px] font-black uppercase text-gray-600 tracking-[0.5em] italic text-center"
      >
        Visualizing Data Trends...<br /><span class="opacity-30"
          >Waiting for more transactions</span
        >
      </p>
    </div>
  </div>
</template>
