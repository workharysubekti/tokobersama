<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "../lib/supabase";
import AuctionCard from "../components/AuctionCard.vue";
import { TrophyIcon, ExclamationCircleIcon, ArrowPathIcon } from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const myBids = ref([]);
const loading = ref(true);
const activeTab = ref("all");
let realtimeChannel = null;

const fetchMyBids = async () => {
  if (!props.userProfile) return;
  loading.value = true;

  // 1. Ambil semua bid unik milik user (tanpa looping)
  const { data: bidsData } = await supabase
    .from("bids")
    .select(`product_id, products (*)`)
    .eq("user_id", props.userProfile.id)
    .order("created_at", { ascending: false });

  if (bidsData) {
    // Filter produk unik
    const productsMap = new Map();
    bidsData.forEach(item => {
      if (!productsMap.has(item.product_id)) {
        productsMap.set(item.product_id, { ...item.products, isWinning: false });
      }
    });
    
    const uniqueProducts = Array.from(productsMap.values());

    // 2. Cek status menang sekaligus (Cukup 1 query untuk semua produk)
    const productIds = uniqueProducts.map(p => p.id);
    const { data: winners } = await supabase
      .from("products")
      .select("id, current_bid, winner_id")
      .in("id", productIds);

    myBids.value = uniqueProducts.map(p => {
      const liveData = winners?.find(w => w.id === p.id);
      return {
        ...p,
        current_bid: liveData?.current_bid || p.current_bid,
        isWinning: liveData?.winner_id === props.userProfile.id
      };
    });
  }
  loading.value = false;
};

onMounted(() => {
  fetchMyBids();
  realtimeChannel = supabase.channel(`bids-live-${Date.now()}`)
    .on("postgres_changes", { event: "INSERT", table: "bids" }, fetchMyBids)
    .subscribe();
});

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});

const filteredBids = computed(() => {
  if (activeTab.value === "winning") return myBids.value.filter(p => p.isWinning);
  if (activeTab.value === "outbid") return myBids.value.filter(p => !p.isWinning);
  return myBids.value;
});
</script>

<template>
  <div class="min-h-screen bg-black pt-28 pb-20 px-6 text-white">
    <div class="max-w-7xl mx-auto">
      <div class="flex flex-col md:flex-row justify-between mb-12">
        <h2 class="text-4xl font-[1000] italic uppercase">My <span class="text-yellow-500">Bids</span></h2>
        <div class="flex bg-white/5 p-1 rounded-xl mt-4 md:mt-0">
          <button @click="activeTab = 'all'" :class="activeTab === 'all' ? 'bg-white/10' : 'text-gray-500'" class="px-6 py-2 rounded-lg text-[10px] font-black uppercase italic">All</button>
          <button @click="activeTab = 'winning'" :class="activeTab === 'winning' ? 'bg-green-500 text-black' : 'text-gray-500'" class="px-6 py-2 rounded-lg text-[10px] font-black uppercase italic">Winning</button>
          <button @click="activeTab = 'outbid'" :class="activeTab === 'outbid' ? 'bg-red-500' : 'text-gray-500'" class="px-6 py-2 rounded-lg text-[10px] font-black uppercase italic">Outbid</button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-40">
        <ArrowPathIcon class="w-10 h-10 text-yellow-500 animate-spin" />
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div v-for="product in filteredBids" :key="product.id" class="relative">
          <div class="absolute -top-2 left-4 z-10 px-3 py-1 rounded-full text-[8px] font-black uppercase italic" :class="product.isWinning ? 'bg-green-500 text-black' : 'bg-red-500 text-white'">
            {{ product.isWinning ? 'Leading' : 'Outbid' }}
          </div>
          <AuctionCard :product="product" />
        </div>
      </div>
    </div>
  </div>
</template>
