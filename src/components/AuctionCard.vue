<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify.js";
import { EyeIcon, BanknotesIcon, ClockIcon } from "@heroicons/vue/24/outline";

const props = defineProps(["product"]);
const timeLeft = ref("");
const router = useRouter();

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

const goToDetail = () => {
  router.push(`/product/${props.product.id}`);
};

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

  // LOGIKA HARI (DAYS) - Biar muncul 2D, 1D, dst
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  timeLeft.value = `${d > 0 ? d + "D " : ""}${h}H ${m}M ${s}S`;
};

const placeBid = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notify.error("Akses Ditolak", "Login dulu ya!");
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

    if (productError) return notify.error("Gagal!", "Sistem menolak bid.");

    await supabase
      .from("bids")
      .insert([
        { product_id: props.product.id, user_id: user.id, amount: amount },
      ]);
    notify.success("GACOR!", "Bid berhasil terpasang!");
  }
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
    class="bg-[#16191e] border border-white/5 rounded-[24px] overflow-hidden flex flex-col h-full shadow-2xl transition-all hover:border-yellow-500/30"
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
        class="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg"
      >
        <p
          class="text-[7px] font-black text-yellow-500 uppercase italic tracking-widest"
        >
          {{ product.category }}
        </p>
      </div>
    </div>

    <div class="p-3 md:p-4 flex flex-col flex-grow">
      <div class="mb-3">
        <h3
          class="text-white font-black italic uppercase tracking-tighter text-[10px] md:text-xs truncate mb-1"
        >
          {{ product.name }}
        </h3>
        <div class="flex items-center text-yellow-500/80 space-x-1.5">
          <ClockIcon class="w-3 h-3" />
          <span
            class="text-[8px] md:text-[9px] font-bold uppercase tracking-wider truncate"
          >
            {{ timeLeft === "ENDED" ? "ENDED" : timeLeft }}
          </span>
        </div>
      </div>

      <div
        class="bg-black/40 border border-white/5 rounded-xl p-2 md:p-3 mb-4 mt-auto"
      >
        <p
          class="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-0.5"
        >
          Highest Bid
        </p>
        <p
          class="text-yellow-500 font-[900] italic text-xs md:text-sm tracking-tighter truncate leading-none"
        >
          {{ formatPrice(product.current_bid) }}
        </p>
      </div>

      <div class="flex gap-1.5">
        <button
          @click="goToDetail"
          class="flex-1 flex justify-center items-center py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all active:scale-95"
        >
          <EyeIcon class="w-4 h-4" />
        </button>

        <button
          @click="placeBid"
          class="flex-[2] flex items-center justify-center gap-1.5 py-2.5 bg-yellow-500 hover:bg-white text-black rounded-lg font-[1000] transition-all active:scale-95"
        >
          <BanknotesIcon class="w-3.5 h-3.5" />
          <span
            class="text-[8px] md:text-[9px] uppercase italic tracking-widest"
            >Bid</span
          >
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS dibersihkan agar tidak berat */
</style>
