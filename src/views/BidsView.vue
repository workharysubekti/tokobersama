<script setup>
import { ref, watch, onUnmounted, computed } from "vue"; // Ganti onMounted ke watch
import { supabase } from "../lib/supabase";
import AuctionCard from "../components/AuctionCard.vue";
import { TrophyIcon, ExclamationCircleIcon, ArrowPathIcon } from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const myBids = ref([]);
const loading = ref(true);
const activeTab = ref("all");
let realtimeChannel = null;

const fetchMyBids = async () => {
  // Cegah jalan kalau profile belum ada
  if (!props.userProfile?.id) return;
  
  loading.value = true;
  try {
    // 1. Ambil semua bid unik milik user
    const { data: bidsData } = await supabase
      .from("bids")
      .select(`product_id, products (*)`)
      .eq("user_id", props.userProfile.id)
      .order("created_at", { ascending: false });

    if (bidsData && bidsData.length > 0) {
      const productsMap = new Map();
      bidsData.forEach(item => {
        if (item.products && !productsMap.has(item.product_id)) {
          productsMap.set(item.product_id, { ...item.products });
        }
      });
      
      const uniqueProducts = Array.from(productsMap.values());
      const productIds = uniqueProducts.map(p => p.id);

      // 2. Cek data Live (Siapa pemenang aslinya sekarang)
      const { data: liveStatus } = await supabase
        .from("products")
        .select("id, current_bid, winner_id") // Pastikan kolomnya winner_id
        .in("id", productIds);

      myBids.value = uniqueProducts.map(p => {
        const currentLive = liveStatus?.find(l => l.id === p.id);
        
        // LOGIC PENENTU: Bandingkan ID Mas dengan winner_id di tabel products
        const winning = currentLive?.winner_id === props.userProfile.id;

        return {
          ...p,
          current_bid: currentLive?.current_bid || p.current_bid,
          isWinning: winning // Sekarang harusnya bener
        };
      });
    } else {
      myBids.value = [];
    }
  } catch (err) {
    console.error("Error BidsView:", err);
  } finally {
    loading.value = false;
  }
};

// KUNCI: Nunggu userProfile siap baru tarik data
watch(() => props.userProfile, (newVal) => {
  if (newVal) {
    fetchMyBids();
    
    // Setup Realtime sekali saja saat profile ready
    if (!realtimeChannel) {
      realtimeChannel = supabase.channel(`bids-realtime-${props.userProfile.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, fetchMyBids)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, fetchMyBids)
        .subscribe();
    }
  }
}, { immediate: true });

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
  <div class="min-h-screen bg-[#050505] pt-28 pb-32 px-5 text-white">
    <div class="max-w-2xl mx-auto">
      <div class="flex flex-col mb-10">
        <h2 class="text-3xl font-[1000] italic uppercase tracking-tighter mb-6">Activity <span class="text-yellow-500 text-4xl">Vault</span></h2>
        
        <div class="flex bg-white/[0.03] border border-white/5 p-1 rounded-2xl">
          <button @click="activeTab = 'all'" :class="activeTab === 'all' ? 'bg-white/10 text-white' : 'text-gray-500'" class="flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all">All</button>
          <button @click="activeTab = 'winning'" :class="activeTab === 'winning' ? 'bg-green-500 text-black' : 'text-gray-500'" class="flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all">Winning</button>
          <button @click="activeTab = 'outbid'" :class="activeTab === 'outbid' ? 'bg-red-500 text-white' : 'text-gray-500'" class="flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all">Outbid</button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <ArrowPathIcon class="w-8 h-8 text-yellow-500 animate-spin opacity-30" />
      </div>

      <div v-else-if="filteredBids.length > 0" class="grid grid-cols-2 gap-4">
        <div v-for="product in filteredBids" :key="product.id" class="relative">
          <div class="absolute top-3 left-3 z-30 px-3 py-1 rounded-full text-[7px] font-black uppercase italic shadow-xl" 
               :class="product.isWinning ? 'bg-green-500 text-black shadow-green-500/20' : 'bg-red-500 text-white shadow-red-500/20'">
            {{ product.isWinning ? 'Leading' : 'Outbid' }}
          </div>
          
          <AuctionCard :product="product" />
        </div>
      </div>

      <div v-else class="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
        <ExclamationCircleIcon class="w-10 h-10 text-gray-800 mx-auto mb-4" />
        <p class="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 italic">No Activity Detected</p>
      </div>
    </div>
  </div>
</template>
