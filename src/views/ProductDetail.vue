<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import {
  ClockIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TrophyIcon,
  FireIcon,
  BanknotesIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({
  userProfile: Object,
});

const recentBids = ref([]);
const route = useRoute();
const router = useRouter();
const product = ref(null);
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

const fetchProductDetail = async () => {
  try {
    const { id } = route.params;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    product.value = data;
    bidAmount.value = (data.current_bid || data.starting_bid) + 10000;
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    loading.value = false;
  }
};

const fetchBids = async () => {
  try {
    const { id } = route.params;
    const { data, error } = await supabase
      .from("bids")
      .select("*, profiles(username, reputation_score)")
      .eq("product_id", id)
      .order("amount", { ascending: false })
      .limit(5);

    if (error) throw error;
    recentBids.value = data;
  } catch (error) {
    console.error("Gagal ambil history bid:", error.message);
  }
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
  if (!props.userProfile) {
    alert("Login dulu bosku!");
    return;
  }

  const currentPrice = product.value.current_bid || product.value.starting_bid;
  if (bidAmount.value <= currentPrice) {
    alert("Bid harus lebih tinggi dari harga saat ini!");
    return;
  }

  try {
    isSubmitting.value = true;

    const { error: bidError } = await supabase.from("bids").insert([
      {
        product_id: product.value.id,
        user_id: props.userProfile.id,
        amount: bidAmount.value,
      },
    ]);
    if (bidError) throw bidError;

    const { error: productError } = await supabase
      .from("products")
      .update({ current_bid: bidAmount.value })
      .eq("id", product.value.id);
    if (productError) throw productError;

    bidAmount.value += 10000;
  } catch (error) {
    alert(error.message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchProductDetail();
  fetchBids();
  timerInterval = setInterval(updateTimer, 1000);

  bidSubscription = supabase
    .channel(`bids-live-${route.params.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bids",
        filter: `product_id=eq.${route.params.id}`,
      },
      (payload) => {
        fetchBids();
        if (product.value) {
          product.value.current_bid = payload.new.amount;
        }
      },
    )
    .subscribe();
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (bidSubscription) supabase.removeChannel(bidSubscription);
});
</script>

<template>
  <div class="bg-black min-h-screen text-white pb-32">
    <div
      class="fixed top-0 inset-x-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between"
    >
      <button
        @click="router.back()"
        class="p-2 hover:bg-white/10 rounded-xl transition-all"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <h1 class="text-sm font-black italic uppercase tracking-tighter">
        Auction <span class="text-yellow-500">Details</span>
      </h1>
      <div class="w-10"></div>
    </div>

    <div
      v-if="!loading && product"
      class="pt-24 px-6 max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
    >
      <div class="lg:col-span-7 space-y-8">
        <div
          class="relative aspect-video lg:aspect-auto lg:h-[500px] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl bg-white/5"
        >
          <img :src="product.image_url" class="w-full h-full object-cover" />
          <div
            class="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2"
          >
            <ClockIcon class="w-4 h-4 text-yellow-500" />
            <span class="text-xs font-[1000] italic uppercase">{{
              timeLeft
            }}</span>
          </div>
        </div>

        <div class="hidden lg:block space-y-4">
          <h4
            class="text-xs font-black uppercase italic tracking-widest flex items-center gap-2 text-gray-400"
          >
            <FireIcon class="w-4 h-4 text-orange-500" />
            Live Transmission Feed
          </h4>
          <div class="grid grid-cols-1 gap-3">
            <div
              v-if="recentBids.length > 0"
              v-for="(bid, index) in recentBids"
              :key="bid.id"
              class="flex items-center justify-between p-5 rounded-3xl border border-white/5 bg-white/[0.02]"
              :class="
                index === 0
                  ? 'border-yellow-500/30 bg-yellow-500/5 shadow-[0_10px_30px_rgba(234,179,8,0.05)]'
                  : ''
              "
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center font-black text-xs italic text-yellow-500 border border-white/10 uppercase"
                >
                  {{ bid.profiles?.username?.charAt(0) || "A" }}
                </div>
                <div>
                  <p class="text-sm font-black italic">
                    {{ bid.profiles?.username?.split("@")[0] }}
                  </p>
                  <p
                    class="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]"
                  >
                    Rep: {{ bid.profiles?.reputation_score || 0 }} PTS
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p
                  class="text-md font-[1000] italic"
                  :class="index === 0 ? 'text-yellow-500' : 'text-white'"
                >
                  {{ formatPrice(bid.amount) }}
                </p>
                <p class="text-[8px] text-gray-600 font-bold uppercase">
                  {{ new Date(bid.created_at).toLocaleTimeString() }}
                </p>
              </div>
            </div>
            <p
              v-else
              class="text-gray-600 text-[10px] font-black uppercase italic tracking-widest py-8 border border-dashed border-white/10 rounded-3xl text-center"
            >
              No bids recorded.
            </p>
          </div>
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col space-y-8">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <ShieldCheckIcon class="w-4 h-4 text-blue-500" />
            <span
              class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]"
              >Verified Authenticity</span
            >
          </div>
          <h2
            class="text-4xl lg:text-5xl font-[1000] italic uppercase tracking-tighter leading-[0.9] mb-6"
          >
            {{ product.name }}
          </h2>

          <div
            class="bg-white/5 border border-white/5 rounded-3xl p-6 relative overflow-hidden group"
          >
            <p
              class="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3 italic"
            >
              Product Dossier
            </p>
            <p class="text-gray-400 text-sm leading-relaxed font-medium">
              {{ product.description }}
            </p>
            <div
              class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"
            >
              <TrophyIcon class="w-20 h-20" />
            </div>
          </div>
        </div>

        <div
          class="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 space-y-8 shadow-2xl"
        >
          <div class="flex justify-between items-end">
            <div>
              <p
                class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2"
              >
                Current Bid
              </p>
              <h3
                class="text-5xl font-[1000] italic text-yellow-500 tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]"
              >
                {{ formatPrice(product.current_bid || product.starting_bid) }}
              </h3>
            </div>
          </div>

          <div class="space-y-4 pt-4">
            <div class="relative">
              <span
                class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs"
                >IDR</span
              >
              <input
                v-model.number="bidAmount"
                type="number"
                class="w-full bg-black/40 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-2xl font-[1000] focus:outline-none focus:border-yellow-500 transition-all text-white"
              />
            </div>
            <button
              @click="placeBid"
              :disabled="isSubmitting"
              class="w-full bg-yellow-500 hover:bg-white text-black py-6 rounded-2xl font-[1000] italic uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(234,179,8,0.2)]"
            >
              <BanknotesIcon class="w-7 h-7" />
              {{ isSubmitting ? "Transmitting..." : "Place Your Bid" }}
            </button>
          </div>
        </div>

        <div class="lg:hidden space-y-4">
          <h4
            class="text-xs font-black uppercase italic tracking-widest flex items-center gap-2"
          >
            <FireIcon class="w-4 h-4 text-orange-500" />
            Recent Bids
          </h4>
          <div class="space-y-3">
            <div
              v-for="(bid, index) in recentBids"
              :key="bid.id"
              class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-black text-[10px] italic text-yellow-500"
                >
                  {{ bid.profiles?.username?.charAt(0).toUpperCase() }}
                </div>
                <p class="text-xs font-black italic">
                  {{ bid.profiles?.username?.split("@")[0] }}
                </p>
              </div>
              <p class="text-sm font-black italic text-yellow-500">
                {{ formatPrice(bid.amount) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
