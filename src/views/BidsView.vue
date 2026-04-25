<script setup>
import { ref, watch, onUnmounted, computed } from "vue";
import { supabase } from "../lib/supabase";
import AuctionCard from "../components/AuctionCard.vue";
import {
  TrophyIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const myBids = ref([]);
const loading = ref(true);
const activeTab = ref("all");
let realtimeChannel = null;

const fetchMyBids = async () => {
  if (!props.userProfile?.id) return;

  loading.value = true;
  try {
    // 1. AMBIL HISTORY + JOIN PROFILE (Biar nggak Anonymous)
    const { data: userBids } = await supabase
      .from("bids")
      .select(`
        product_id, 
        products (
          *, 
          profiles!owner_id(username, full_name, avatar_url)
        )
      `)
      .eq("user_id", props.userProfile.id)
      .order("created_at", { ascending: false });

    if (userBids && userBids.length > 0) {
      const productsMap = new Map();
      userBids.forEach((item) => {
        // Pastikan profiles ikut masuk ke dalam map
        if (item.products && !productsMap.has(item.product_id)) {
          productsMap.set(item.product_id, { ...item.products });
        }
      });

      const uniqueProducts = Array.from(productsMap.values());
      const productIds = uniqueProducts.map((p) => p.id);

      // 2. LOGIKA MUTLAK: Ambil bid TERMAHAL untuk penentuan Leading/Outbid
      const { data: allTopBids } = await supabase
        .from("bids")
        .select("product_id, user_id, amount")
        .in("product_id", productIds)
        .order("amount", { ascending: false });

      myBids.value = uniqueProducts.map((p) => {
        const biddingsForThisProduct = allTopBids?.filter(
          (b) => b.product_id === p.id,
        );
        const topBid =
          biddingsForThisProduct && biddingsForThisProduct.length > 0
            ? biddingsForThisProduct[0]
            : null;

        const isLeading = topBid?.user_id === props.userProfile.id;

        return {
          ...p,
          current_bid: topBid
            ? topBid.amount
            : p.current_bid || p.starting_bid || 0,
          isWinning: isLeading,
        };
      });
    } else {
      myBids.value = [];
    }
  } catch (err) {
    console.error("BidsView Error:", err);
  } finally {
    loading.value = false;
  }
};

// Pantau profile & nyalakan Realtime
watch(
  () => props.userProfile,
  (newVal) => {
    if (newVal) {
      fetchMyBids();
      if (!realtimeChannel) {
        realtimeChannel = supabase
          .channel(`bids-live-monitor`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "bids" },
            (payload) => {
              const isRelevant = myBids.value.some(
                (p) => p.id === payload.new.product_id,
              );
              if (isRelevant) {
                fetchMyBids();
              }
            },
          )
          .subscribe();
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});

const filteredBids = computed(() => {
  if (activeTab.value === "winning")
    return myBids.value.filter((p) => p.isWinning);
  if (activeTab.value === "outbid")
    return myBids.value.filter((p) => !p.isWinning);
  return myBids.value;
});
</script>

<template>
  <div class="min-h-screen bg-[#050505] pt-28 pb-32 px-5 text-white">
    <div class="max-w-2xl mx-auto">
      <div class="flex flex-col mb-10">
        <h2 class="text-3xl font-[1000] italic uppercase tracking-tighter mb-6">
          Market <span class="text-yellow-500 text-4xl">Activity</span>
        </h2>

        <div class="flex bg-white/[0.03] border border-white/5 p-1 rounded-2xl">
          <button
            @click="activeTab = 'all'"
            :class="
              activeTab === 'all' ? 'bg-white/10 text-white' : 'text-gray-500'
            "
            class="flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all"
          >
            Semua
          </button>
          <button
            @click="activeTab = 'winning'"
            :class="
              activeTab === 'winning'
                ? 'bg-green-500 text-black'
                : 'text-gray-500'
            "
            class="flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all"
          >
            ✓ Leading
          </button>
          <button
            @click="activeTab = 'outbid'"
            :class="
              activeTab === 'outbid' ? 'bg-red-500 text-white' : 'text-gray-500'
            "
            class="flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all"
          >
            ✗ Outbid
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <ArrowPathIcon
          class="w-8 h-8 text-yellow-500 animate-spin opacity-20"
        />
      </div>

      <div v-else-if="filteredBids.length > 0" class="grid grid-cols-2 gap-4">
        <div
          v-for="product in filteredBids"
          :key="product.id"
          class="relative group"
        >
          <div
            class="absolute top-3 left-3 z-30 px-3 py-1 rounded-full text-[7px] font-[1000] uppercase italic shadow-2xl border transition-all duration-500"
            :class="
              product.isWinning
                ? 'bg-green-500 text-black border-green-400 shadow-green-500/20'
                : 'bg-red-500 text-white border-red-400 shadow-red-500/20'
            "
          >
            {{ product.isWinning ? "✓ Leading" : "✗ Outbid" }}
          </div>

          <AuctionCard :product="product" />
        </div>
      </div>

      <div
        v-else
        class="py-24 text-center border-2 border-dashed border-white/5 rounded-[40px]"
      >
        <TrophyIcon class="w-12 h-12 text-gray-800 mx-auto mb-4 opacity-20" />
        <p
          class="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 italic"
        >
          No Active Transmissions
        </p>
      </div>
    </div>
  </div>
</template>
