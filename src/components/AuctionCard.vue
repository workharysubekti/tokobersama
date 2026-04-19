<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify.js";
import { useRouter } from "vue-router";
import { EyeIcon, BanknotesIcon, ClockIcon } from "@heroicons/vue/24/outline";

const props = defineProps(["product"]);
const timeLeft = ref("");
const bidHistory = ref([]);
const router = useRouter();

// --- LOGIKA NAVIGASI (Logika Baru) ---
const goToDetail = () => {
  router.push(`/product/${props.product.id}`);
};

// --- LOGIKA FUNGSI (TIDAK BERUBAH/KEPAKE) ---
const placeBid = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notify.error("Akses Ditolak", "Login dulu ya buat ikutan lelang!");
    return;
  }

  const { value: bidAmount } = await notify.confirmBid(
    props.product.current_bid,
  );

  if (bidAmount) {
    const amount = parseInt(bidAmount);
    const { error: productError } = await supabase
      .from("products")
      .update({ current_bid: amount })
      .eq("id", props.product.id);

    if (productError) {
      notify.error("Gagal!", "Sistem menolak bid kamu.");
      return;
    }

    const { error: historyError } = await supabase
      .from("bids")
      .insert([
        { product_id: props.product.id, user_id: user.id, amount: amount },
      ]);

    if (!historyError) {
      notify.success(
        "Berhasil!",
        `Bid Rp ${amount.toLocaleString()} terpasang.`,
      );
    }
  }
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

// Logika Timer Bawaan
const updateTimer = () => {
  if (!props.product.end_time) {
    timeLeft.value = "OPEN";
    return;
  }
  const end = new Date(props.product.end_time).getTime();
  const now = new Date().getTime();
  const diff = end - now;

  if (diff <= 0) {
    timeLeft.value = "ENDED";
    return;
  }

  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  timeLeft.value = `${h}h ${m}m ${s}s`;
};

let timer;
onMounted(() => {
  updateTimer();
  timer = setInterval(updateTimer, 1000);
});

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div
    class="group relative bg-[#16191e] border border-white/5 rounded-[32px] overflow-hidden hover:border-yellow-500/30 transition-all duration-500 shadow-2xl"
  >
    <div
      class="relative aspect-square overflow-hidden cursor-pointer"
      @click="goToDetail"
    >
      <img
        :src="product.image_url"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-[#16191e] via-transparent to-transparent opacity-60"
      ></div>

      <div
        class="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl"
      >
        <p
          class="text-[8px] font-black text-yellow-500 uppercase italic tracking-widest"
        >
          {{ product.category }}
        </p>
      </div>
    </div>

    <div class="p-5">
      <div class="mb-4">
        <h3
          class="text-white font-black italic uppercase tracking-tighter text-sm truncate mb-1"
        >
          {{ product.name }}
        </h3>
        <div class="flex items-center text-gray-500 space-x-2">
          <ClockIcon class="w-3 h-3 text-yellow-500/50" />
          <span
            class="text-[13px] font-bold uppercase tracking-widest"
            :class="timeLeft === 'ENDED' ? 'text-red-500' : 'text-yellow-500'"
          >
            {{ timeLeft === "ENDED" ? "Auction Ended" : "Sisa: " + timeLeft }}
          </span>
        </div>
      </div>

      <div class="bg-black/40 border border-white/5 rounded-2xl p-3 mb-5">
        <p
          class="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1"
        >
          Highest Bid
        </p>
        <p class="text-yellow-500 font-[900] italic text-lg tracking-tighter">
          {{ formatPrice(product.current_bid) }}
        </p>
      </div>

      <div class="flex gap-2">
        <button
          @click="goToDetail"
          class="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/5 transition-all active:scale-95"
        >
          <EyeIcon class="w-4 h-4" />
          <span class="text-[9px] font-black uppercase italic tracking-widest"
            >Info Lengkap</span
          >
        </button>

        <button
          @click="placeBid"
          class="flex-[1.5] flex items-center justify-center gap-2 py-3 bg-yellow-500 hover:bg-white text-black rounded-xl font-[900] transition-all shadow-[0_5px_15px_rgba(234,179,8,0.2)] active:scale-95"
        >
          <BanknotesIcon class="w-4 h-4" />
          <span class="text-[9px] font-black uppercase italic tracking-widest"
            >Place Bid</span
          >
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shine {
  from {
    left: -100%;
  }
  to {
    left: 100%;
  }
}

.group\/btn:hover::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transform: skewX(-25deg);
  animation: shine 0.8s infinite;
}
</style>
