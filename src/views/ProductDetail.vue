<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import {
  ClockIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TrophyIcon,
  FireIcon,
  BanknotesIcon,
  ArrowPathIcon
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const route = useRoute();
const router = useRouter();

const product = ref(null);
const recentBids = ref([]);
const loading = ref(true);
const bidAmount = ref(0);
const isSubmitting = ref(false);
const timeLeft = ref("");

let timerInterval = null;
let bidSubscription = null;

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price || 0);
};

const fetchBids = async () => {
  const { data } = await supabase
    .from("bids")
    .select("*, profiles(username, reputation_score)")
    .eq("product_id", route.params.id)
    .order("amount", { ascending: false })
    .limit(8);
  if (data) recentBids.value = data;
};

const fetchProductDetail = async () => {
  loading.value = true;
  const { data } = await supabase
    .from("products")
    .select("*, profiles!owner_id(username, full_name, avatar_url)")
    .eq("id", route.params.id)
    .single();

  if (data) {
    product.value = data;
    // Set bid awal: harga sekarang + 10rb
    const currentPrice = data.current_bid || data.starting_bid || 0;
    bidAmount.value = currentPrice + 10000;
    await fetchBids();
  }
  loading.value = false;
};

const updateTimer = () => {
  if (!product.value?.end_time) return;
  const end = new Date(product.value.end_time).getTime();
  const now = new Date().getTime();
  const diff = end - now;
  if (diff <= 0) {
    timeLeft.value = "ENDED";
    return;
  }
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  timeLeft.value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const placeBid = async () => {
  if (!props.userProfile) return alert("Login dulu bosku!");
  if (isSubmitting.value) return;

  // CEK HARGA TERBARU (Anti-Double)
  const latestTopPrice = recentBids.value.length > 0 
    ? recentBids.value[0].amount 
    : (product.value.current_bid || product.value.starting_bid);

  if (bidAmount.value <= latestTopPrice) {
    alert(`Gagal! Harga sudah naik ke ${formatPrice(latestTopPrice)}. Harap bid lebih tinggi.`);
    bidAmount.value = latestTopPrice + 10000;
    return;
  }

  try {
    isSubmitting.value = true;
    
    // 1. Kirim Bid
    const { error: bidErr } = await supabase.from("bids").insert({
      product_id: product.value.id,
      user_id: props.userProfile.id,
      amount: bidAmount.value,
    });
    if (bidErr) throw bidErr;

    // 2. Update Product (Sync)
    await supabase.from("products")
      .update({ current_bid: bidAmount.value, winner_id: props.userProfile.id })
      .eq("id", product.value.id);

  } catch (err) {
    alert(err.message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchProductDetail();
  timerInterval = setInterval(updateTimer, 1000);

  // REALTIME ENGINE (Anti-Bengong & Anti-Slow)
  bidSubscription = supabase.channel(`live-auction-${route.params.id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `product_id=eq.${route.params.id}` }, 
      (payload) => {
        // Begitu ada bid masuk, langsung tarik list dan update harga di layar
        fetchBids();
        if (product.value) {
          product.value.current_bid = payload.new.amount;
          // Otomatis saran harga naik
          if (bidAmount.value <= payload.new.amount) {
            bidAmount.value = payload.new.amount + 10000;
          }
        }
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${route.params.id}` }, 
      (payload) => {
        if (product.value) product.value.current_bid = payload.new.current_bid;
    })
    .subscribe();
});

onUnmounted(() => {
  clearInterval(timerInterval);
  if (bidSubscription) supabase.removeChannel(bidSubscription);
});
</script>

<template>
  <div class="bg-black min-h-screen text-white pb-32 selection:bg-yellow-500">
    <div class="fixed top-0 inset-x-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <button @click="router.back()" class="p-2 hover:bg-white/5 rounded-xl transition-all">
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div class="flex flex-col items-center">
        <span class="text-[10px] font-black uppercase text-yellow-500 tracking-[0.3em] italic leading-none mb-1">Live Auction</span>
        <h1 class="text-xs font-black italic uppercase tracking-tighter">Transmitting Signal</h1>
      </div>
      <div class="w-10"></div>
    </div>

    <div v-if="!loading && product" class="pt-24 px-5 max-w-6xl mx-auto space-y-8">
      <div class="relative group aspect-square md:aspect-video rounded-[40px] overflow-hidden border border-white/10 bg-[#0a0a0a]">
        <img :src="product.image_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        
        <div class="absolute bottom-6 left-6 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
          <ClockIcon class="w-4 h-4 text-yellow-500 animate-pulse" />
          <span class="text-xs font-[1000] italic tracking-widest">{{ timeLeft }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-7 space-y-6">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Live Status: Encrypted & Secure</span>
          </div>
          <h2 class="text-4xl font-[1000] italic uppercase tracking-tighter leading-none">{{ product.name }}</h2>
          <div class="p-6 bg-white/[0.02] border border-white/5 rounded-[32px]">
            <p class="text-[10px] font-black text-yellow-500 uppercase italic mb-3 tracking-widest">Dossier</p>
            <p class="text-gray-400 text-sm italic leading-relaxed">{{ product.description }}</p>
          </div>

          <div class="space-y-4 pt-4">
            <h4 class="text-xs font-black uppercase italic tracking-widest flex items-center gap-2">
              <FireIcon class="w-4 h-4 text-orange-500" />
              Live Feed
            </h4>
            <div class="space-y-3">
              <div v-for="(bid, index) in recentBids" :key="bid.id" 
                class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01] transition-all"
                :class="index === 0 ? 'border-yellow-500/40 bg-yellow-500/[0.03] scale-[1.02]' : ''">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center font-black text-xs text-yellow-500 italic uppercase">
                    {{ bid.profiles?.username?.[0] || '?' }}
                  </div>
                  <div>
                    <p class="text-xs font-black italic">{{ bid.profiles?.username }}</p>
                    <p class="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Rep: {{ bid.profiles?.reputation_score || 0 }} PTS</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-black italic" :class="index === 0 ? 'text-yellow-500' : 'text-white'">{{ formatPrice(bid.amount) }}</p>
                  <p class="text-[7px] text-gray-600 font-bold uppercase">{{ new Date(bid.created_at).toLocaleTimeString() }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5">
          <div class="sticky top-28 space-y-6">
            <div class="bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 shadow-2xl shadow-yellow-500/5">
              <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">Current Highest Bid</p>
              <h3 class="text-5xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                {{ formatPrice(product.current_bid || product.starting_bid) }}
              </h3>

              <div class="space-y-4">
                <div class="relative group">
                  <span class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs tracking-tighter">IDR</span>
                  <input v-model.number="bidAmount" type="number" 
                    class="w-full bg-black border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-2xl font-[1000] italic focus:border-yellow-500 transition-all text-white outline-none" />
                </div>
                
                <button @click="placeBid" :disabled="isSubmitting"
                  class="w-full bg-yellow-500 text-black py-6 rounded-2xl font-[1000] italic uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                  <ArrowPathIcon v-if="isSubmitting" class="w-6 h-6 animate-spin" />
                  <BanknotesIcon v-else class="w-6 h-6 stroke-[2.5px]" />
                  <span>{{ isSubmitting ? 'Transmitting...' : 'Place Your Bid' }}</span>
                </button>
              </div>
            </div>

            <div v-if="product.profiles" class="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                  <img v-if="product.profiles.avatar_url" :src="product.profiles.avatar_url" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full bg-gray-900 flex items-center justify-center text-xs font-black italic">TB</div>
                </div>
                <div>
                  <p class="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">Contractor</p>
                  <p class="text-sm font-black italic">{{ product.profiles.full_name || product.profiles.username }}</p>
                </div>
              </div>
              <ShieldCheckIcon class="w-6 h-6 text-blue-500 opacity-30" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <div class="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
      <p class="text-[9px] font-black uppercase text-yellow-500 mt-6 tracking-[0.5em] animate-pulse italic">Scanning Data...</p>
    </div>
  </div>
</template>

<style scoped>
/* Chrome, Safari, Edge, Opera - Hilangkan tombol panah di input number */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
