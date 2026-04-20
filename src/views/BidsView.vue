<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "../lib/supabase";
import AuctionCard from "../components/AuctionCard.vue";
import {
  ArrowPathIcon,
  FireIcon,
  TrophyIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/24/outline";

const myBids = ref([]);
const loading = ref(true);
const activeTab = ref("all"); // 'all', 'winning', 'outbid'
let realtimeChannel = null;

const fetchMyBids = async () => {
  loading.value = true;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("bids")
      .select(`product_id, products (*)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const uniqueProducts = [
        ...new Map(
          data.map((item) => [item.product_id, item.products]),
        ).values(),
      ];
      myBids.value = uniqueProducts.map((p) => ({ ...p, isWinning: false }));
      await checkWinningStatus(user.id);
    }
  }
  loading.value = false;
};

const checkWinningStatus = async (userId) => {
  for (let item of myBids.value) {
    const { data } = await supabase
      .from("bids")
      .select("user_id")
      .eq("product_id", item.id)
      .order("amount", { ascending: false })
      .limit(1)
      .single();
    if (data) item.isWinning = data.user_id === userId;
  }
};

const setupRealtime = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  realtimeChannel = supabase
    .channel("bids-view-live")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bids" },
      async (payload) => {
        const product = myBids.value.find(
          (p) => p.id === payload.new.product_id,
        );
        if (product) {
          product.current_bid = payload.new.amount;
          product.isWinning = payload.new.user_id === user.id;
        }
      },
    )
    .subscribe();
};

const filteredBids = computed(() => {
  if (activeTab.value === "winning")
    return myBids.value.filter((p) => p.isWinning);
  if (activeTab.value === "outbid")
    return myBids.value.filter((p) => !p.isWinning);
  return myBids.value;
});

onMounted(() => {
  fetchMyBids();
  setupRealtime();
});

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});
</script>

<template>
  <div
    class="min-h-screen bg-[#0a0a0a] pt-28 pb-20 px-6 relative overflow-hidden text-white"
  >
    <div
      class="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/[0.03] blur-[150px] -z-10"
    ></div>

    <div class="max-w-7xl mx-auto">
      <div
        class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-[2px] bg-yellow-500"></div>
            <p
              class="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 italic"
            >
              User Command Center
            </p>
          </div>
          <h2 class="text-5xl font-[1000] italic uppercase tracking-tighter">
            My <span class="text-yellow-500">Bids</span>
          </h2>
        </div>

        <div
          class="flex bg-white/5 p-1 rounded-2xl border border-white/5 shadow-2xl"
        >
          <button
            @click="activeTab = 'all'"
            :class="
              activeTab === 'all' ? 'bg-white/10 text-white' : 'text-gray-500'
            "
            class="px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all"
          >
            All
          </button>
          <button
            @click="activeTab = 'winning'"
            :class="
              activeTab === 'winning'
                ? 'bg-green-500 text-black'
                : 'text-gray-500'
            "
            class="px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
          >
            <TrophyIcon class="w-3 h-3" /> Winning
          </button>
          <button
            @click="activeTab = 'outbid'"
            :class="
              activeTab === 'outbid' ? 'bg-red-500 text-white' : 'text-gray-500'
            "
            class="px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
          >
            <ExclamationCircleIcon class="w-3 h-3" /> Outbid
          </button>
        </div>
      </div>

      <div v-if="!loading">
        <div
          v-if="filteredBids.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <div
            v-for="product in filteredBids"
            :key="product.id"
            class="relative"
          >
            <div
              class="absolute -top-3 left-6 z-20 px-4 py-1.5 rounded-full text-[8px] font-black uppercase italic border shadow-2xl"
              :class="
                product.isWinning
                  ? 'bg-green-500 text-black border-green-400'
                  : 'bg-red-600 text-white border-red-500 animate-bounce'
              "
            >
              {{ product.isWinning ? "🏆 Leading" : "⚡ Disalip!" }}
            </div>
            <AuctionCard :product="product" />
          </div>
        </div>

        <div
          v-else
          class="py-40 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]"
        >
          <FireIcon class="w-12 h-12 text-gray-800 mx-auto mb-4" />
          <p class="text-gray-600 font-black uppercase italic tracking-widest">
            No Signals in this sector
          </p>
        </div>
      </div>

      <div v-else class="flex justify-center py-40">
        <ArrowPathIcon class="w-10 h-10 text-yellow-500 animate-spin" />
      </div>
    </div>
  </div>
</template>
