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
  UserCircleIcon,
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
    .limit(10);
  recentBids.value = data || [];
};

// --- PERBAIKAN SINKRONISASI REAL TIME ---
const setupRealtime = () => {
  bidSubscription = supabase
    .channel(`public:bids:product_id=eq.${route.params.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bids",
        filter: `product_id=eq.${route.params.id}`,
      },
      async (payload) => {
        // Ambil data bidder baru untuk list bawah
        const { data: newBidWithProfile } = await supabase
          .from("profiles")
          .select("username, reputation_score")
          .eq("id", payload.new.bidder_id)
          .single();

        const fullBid = { ...payload.new, profiles: newBidWithProfile };

        // 1. Update List Bids di bawah secara reaktif
        recentBids.value = [fullBid, ...recentBids.value.slice(0, 9)];

        // 2. SINKRONISASI CURRENT BID UTAMA (PENTING UNTUK HP)
        if (product.value && payload.new.amount > product.value.current_bid) {
          product.value.current_bid = payload.new.amount;
        }
      },
    )
    .subscribe();
};

const fetchData = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, profiles(username, avatar_url)")
      .eq("id", route.params.id)
      .single();

    if (error) throw error;
    product.value = data;

    await fetchBids();
    setupRealtime();
    startTimer();
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    loading.value = false;
  }
};

const handleBid = async () => {
  if (!props.userProfile) return alert("Login dulu Mas.");

  if (bidAmount.value <= product.value.current_bid) {
    return alert("Bid harus lebih tinggi dari harga saat ini!");
  }

  isSubmitting.value = true;
  try {
    // 1. Catat Bid ke history
    const { error: bidError } = await supabase.from("bids").insert({
      product_id: product.value.id,
      bidder_id: props.userProfile.id,
      amount: bidAmount.value,
    });

    if (bidError) throw bidError;

    // 2. UPDATE TABEL PRODUCTS AGAR SYNC KE HOME/CARD
    const { error: productError } = await supabase
      .from("products")
      .update({ current_bid: bidAmount.value })
      .eq("id", product.value.id);

    if (productError) throw productError;

    // 3. OPTIMISTIC UPDATE (Langsung rubah angka di layar tanpa tunggu refresh)
    product.value.current_bid = bidAmount.value;
    bidAmount.value = 0;
  } catch (error) {
    alert(error.message);
  } finally {
    isSubmitting.value = false;
  }
};

const startTimer = () => {
  timerInterval = setInterval(() => {
    if (!product.value?.end_time) return;
    const now = new Date().getTime();
    const end = new Date(product.value.end_time).getTime();
    const diff = end - now;

    if (diff <= 0) {
      timeLeft.value = "CLOSED";
      clearInterval(timerInterval);
      return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    timeLeft.value = `${h}:${m}:${s}`;
  }, 1000);
};

onMounted(fetchData);
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (bidSubscription) supabase.removeChannel(bidSubscription);
});
</script>

<template>
  <div
    class="min-h-screen bg-black text-white font-sans uppercase italic font-[1000] pb-20"
  >
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center min-h-screen"
    >
      <div
        class="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"
      ></div>
    </div>

    <div
      v-else-if="product"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24"
    >
      <button
        @click="router.back()"
        class="flex items-center gap-2 text-gray-500 hover:text-white mb-10 transition-all group"
      >
        <ArrowLeftIcon
          class="w-5 h-5 group-hover:-translate-x-1 transition-transform"
        />
        <span class="text-[10px] tracking-widest font-black uppercase italic"
          >Back to Chamber</span
        >
      </button>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div class="space-y-6">
          <div
            class="aspect-square rounded-[40px] overflow-hidden border border-white/5 bg-white/[0.02] shadow-2xl relative group"
          >
            <img
              :src="product.image_url"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div class="absolute top-8 left-8 flex gap-3">
              <div
                class="px-6 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3"
              >
                <div
                  class="w-2 h-2 rounded-full bg-red-600 animate-pulse"
                ></div>
                <span
                  class="text-[10px] tracking-widest text-white uppercase italic"
                  >{{ timeLeft }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col">
          <div class="mb-10">
            <h1
              class="text-5xl tracking-tighter leading-none mb-4 uppercase italic"
            >
              {{ product.name }}
            </h1>
            <div class="flex items-center gap-3 text-yellow-500">
              <span
                class="text-[10px] tracking-[0.4em] font-black uppercase italic"
                >{{ product.category }}</span
              >
            </div>
          </div>

          <div
            class="bg-white/[0.02] border border-white/5 rounded-[40px] p-10 mb-8 backdrop-blur-3xl shadow-inner"
          >
            <p
              class="text-[10px] text-gray-500 tracking-[0.4em] mb-4 uppercase italic font-black"
            >
              Current Signal Value
            </p>
            <div class="flex items-baseline gap-4">
              <h2 class="text-6xl tracking-tighter text-white uppercase italic">
                {{ formatPrice(product.current_bid) }}
              </h2>
            </div>
          </div>

          <div class="flex gap-4 mb-10">
            <div class="flex-1 relative group">
              <input
                v-model.number="bidAmount"
                type="number"
                placeholder="ENTER BID AMOUNT..."
                class="w-full bg-white/[0.03] border border-white/10 rounded-3xl py-6 px-8 text-white outline-none focus:border-yellow-500/50 transition-all font-[1000] italic text-lg uppercase"
              />
            </div>
            <button
              @click="handleBid"
              :disabled="isSubmitting"
              class="px-12 bg-yellow-500 hover:bg-yellow-400 text-black rounded-3xl font-[1000] text-[11px] tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 uppercase italic"
            >
              <ArrowPathIcon v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <span>PLACE BID</span>
            </button>
          </div>

          <div class="border-t border-white/5 pt-10">
            <div class="flex items-center gap-3 mb-8">
              <div
                class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"
              ></div>
              <h3
                class="text-[10px] text-gray-500 tracking-[0.2em] uppercase italic font-black"
              >
                Live Bids
              </h3>
            </div>
            <div class="space-y-3">
              <div
                v-for="bid in recentBids"
                :key="bid.id"
                class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01]"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-gray-900 border border-white/10 flex items-center justify-center font-black text-[10px] text-yellow-500 italic"
                  >
                    {{ bid.profiles?.username?.[0].toUpperCase() }}
                  </div>
                  <p class="text-xs font-black italic uppercase">
                    {{ bid.profiles?.username }}
                  </p>
                </div>
                <p class="text-sm font-black italic text-yellow-500 uppercase">
                  {{ formatPrice(bid.amount) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
