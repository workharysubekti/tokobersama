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
  ArrowPathIcon,
  UserCircleIcon
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
    .select("*, profiles!owner_id(username, full_name, avatar_url, reputation_score)")
    .eq("id", route.params.id)
    .single();

  if (data) {
    product.value = data;
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

const goToSeller = () => {
  if (product.value?.profiles?.username) {
    router.push(`/user/${product.value.profiles.username}`);
  }
};

const placeBid = async () => {
  if (!props.userProfile) return alert("Login dulu bosku!");
  if (isSubmitting.value) return;

  const latestTopPrice = recentBids.value.length > 0 
    ? recentBids.value[0].amount 
    : (product.value.current_bid || product.value.starting_bid);

  if (bidAmount.value <= latestTopPrice) {
    alert(`Waduh! Harga sudah naik ke ${formatPrice(latestTopPrice)}. Harap bid lebih tinggi.`);
    bidAmount.value = latestTopPrice + 10000;
    return;
  }

  try {
    isSubmitting.value = true;
    const { error: bidErr } = await supabase.from("bids").insert({
      product_id: product.value.id,
      user_id: props.userProfile.id,
      amount: bidAmount.value,
    });
    if (bidErr) throw bidErr;

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

  bidSubscription = supabase.channel(`live-auction-${route.params.id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `product_id=eq.${route.params.id}` }, 
      (payload) => {
        fetchBids();
        if (product.value) {
          product.value.current_bid = payload.new.amount;
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
  <div class="bg-black min-h-screen text-white pb-32">
    <div class="fixed top-0 inset-x-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <button @click="router.back()" class="p-2 hover:bg-white/10 rounded-xl transition-all">
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div class="text-center">
        <p class="text-[8px] font-black uppercase text-yellow-500 tracking-[0.4em] italic mb-0.5">Transmission</p>
        <h1 class="text-[10px] font-black uppercase tracking-widest italic">Live Auction Feed</h1>
      </div>
      <div class="w-10"></div>
    </div>

    <div v-if="!loading && product" class="pt-24 px-5 max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        <div class="lg:col-span-7 space-y-10">
          <div class="relative aspect-square md:aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-2xl bg-[#080808]">
            <img :src="product.image_url" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
            
            <div class="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
              <ClockIcon class="w-4 h-4 text-yellow-500 animate-pulse" />
              <span class="text-xs font-[1000] italic tracking-widest uppercase">{{ timeLeft }}</span>
            </div>
          </div>

          <div class="hidden lg:block space-y-6">
            <div class="flex items-center gap-3">
              <FireIcon class="w-5 h-5 text-orange-500" />
              <h3 class="text-sm font-[1000] italic uppercase tracking-widest">Live Transmission Feed</h3>
            </div>
            <div class="space-y-3">
              <div v-for="(bid, index) in recentBids" :key="bid.id" 
                class="flex items-center justify-between p-5 rounded-3xl border border-white/5 bg-white/[0.02] transition-all"
                :class="index === 0 ? 'border-yellow-500/30 bg-yellow-500/5 shadow-[0_10px_40px_rgba(234,179,8,0.05)]' : ''">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center font-black text-xs text-yellow-500 italic">
                    {{ bid.profiles?.username?.[0].toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-xs font-black italic">{{ bid.profiles?.username }}</p>
                    <p class="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Rep: {{ bid.profiles?.reputation_score || 0 }} PTS</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-md font-[1000] italic" :class="index === 0 ? 'text-yellow-500' : 'text-white'">{{ formatPrice(bid.amount) }}</p>
                  <p class="text-[8px] text-gray-700 font-bold uppercase italic">{{ new Date(bid.created_at).toLocaleTimeString() }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 space-y-8">
          <div class="space-y-6">
            <div class="flex items-center gap-2">
              <ShieldCheckIcon class="w-4 h-4 text-blue-500" />
              <span class="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Authentic Asset</span>
            </div>
            
            <h2 class="text-4xl lg:text-5xl font-[1000] italic uppercase tracking-tighter leading-[0.85]">{{ product.name }}</h2>

            <div @click="goToSeller" class="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-3xl cursor-pointer hover:border-yellow-500/30 transition-all w-fit group">
              <div class="w-10 h-10 rounded-full overflow-hidden border border-white/10 group-hover:border-yellow-500/50 transition-all">
                <img v-if="product.profiles?.avatar_url" :src="product.profiles.avatar_url" class="w-full h-full object-cover" />
                <UserCircleIcon v-else class="w-full h-full text-gray-700" />
              </div>
              <div>
                <p class="text-[7px] font-black text-gray-600 uppercase tracking-[0.2em] mb-0.5 leading-none">Contractor</p>
                <p class="text-xs font-black italic group-hover:text-yellow-500 transition-colors uppercase">{{ product.profiles?.full_name || product.profiles?.username }}</p>
              </div>
            </div>
          </div>

          <div class="bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 shadow-2xl shadow-yellow-500/5 relative overflow-hidden">
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">Top Current Bid</p>
            <h3 class="text-5xl lg:text-6xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.2)]">
              {{ formatPrice(product.current_bid || product.starting_bid) }}
            </h3>

            <div class="space-y-4">
              <div class="relative group">
                <span class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs italic tracking-tighter">IDR</span>
                <input v-model.number="bidAmount" type="number" 
                  class="w-full bg-black border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-2xl font-[1000] italic focus:border-yellow-500 transition-all text-white outline-none appearance-none" />
              </div>
              
              <button @click="placeBid" :disabled="isSubmitting"
                class="w-full bg-yellow-500 text-black py-6 rounded-2xl font-[1000] italic uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                <ArrowPathIcon v-if="isSubmitting" class="w-6 h-6 animate-spin" />
                <BanknotesIcon v-else class="w-6 h-6 stroke-[2.5px]" />
                <span>{{ isSubmitting ? 'Transmitting...' : 'Place Your Bid' }}</span>
              </button>
            </div>
          </div>

          <div class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6">
            <p class="text-[10px] font-black text-yellow-500 uppercase italic mb-3 tracking-widest">Asset Dossier</p>
            <p class="text-gray-400 text-sm italic leading-relaxed">{{ product.description }}</p>
          </div>

          <div class="lg:hidden space-y-4 pt-6 pb-10">
            <div class="flex items-center gap-2 mb-4">
              <FireIcon class="w-4 h-4 text-orange-500" />
              <h3 class="text-[10px] font-[1000] italic uppercase tracking-[0.2em]">Live Bids</h3>
            </div>
            <div class="space-y-3">
              <div v-for="(bid, index) in recentBids.slice(0, 5)" :key="bid.id" 
                class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-gray-900 border border-white/10 flex items-center justify-center font-black text-[10px] text-yellow-500 italic">
                    {{ bid.profiles?.username?.[0].toUpperCase() }}
                  </div>
                  <p class="text-xs font-black italic">{{ bid.profiles?.username }}</p>
                </div>
                <p class="text-sm font-black italic text-yellow-500">{{ formatPrice(bid.amount) }}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div v-else class="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <div class="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
      <p class="text-[8px] font-black uppercase text-yellow-500 mt-6 tracking-[0.5em] animate-pulse italic">Scanning Frequency...</p>
    </div>
  </div>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
