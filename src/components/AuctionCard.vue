<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import {
  EyeIcon,
  BanknotesIcon,
  ClockIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/vue/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/vue/24/solid";

const props = defineProps({
  product: Object,
  isPremium: {
    type: Boolean,
    default: false,
  },
});

const timeLeft = ref("");
const router = useRouter();

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price || 0);
};

const goToDetail = () => {
  router.push(`/product/${props.product.id}`);
};

const goToSellerProfile = () => {
  if (props.product.profiles?.username) {
    router.push(`/user/${props.product.profiles.username}`);
  }
};

const placeBid = () => {
  router.push(`/product/${props.product.id}?action=bid`);
};

// --- LOGIKA TIMER DENGAN HARI (DAYS) ---
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

  // Hitung Hari, Jam, Menit, Detik
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  // Tampilkan Hari kalau masih > 0
  if (d > 0) {
    timeLeft.value = `${d}d ${h}h ${m}m`;
  } else {
    timeLeft.value = `${h}h ${m}m ${s}s`;
  }
};

let timerInterval;
onMounted(() => {
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
});

onUnmounted(() => {
  clearInterval(timerInterval);
});
</script>

<template>
  <div
    class="relative group bg-white/[0.03] border border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:border-yellow-500/30 hover:bg-white/[0.05]"
    :class="{
      'border-yellow-500/20 bg-yellow-500/[0.02] shadow-[0_20px_50px_rgba(234,179,8,0.1)]':
        isPremium,
    }"
  >
    <div
      v-if="isPremium"
      class="absolute top-4 left-4 z-10 bg-yellow-500 text-black text-[8px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg italic uppercase tracking-widest"
    >
      <SparklesIcon class="w-3 h-3" />
      Premium Slot
    </div>

    <div
      class="relative h-56 overflow-hidden cursor-pointer"
      @click="goToDetail"
    >
      <img
        :src="product.image_url"
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60"
      ></div>

      <div
        class="absolute bottom-4 left-4 right-4 flex justify-between items-center"
      >
        <div
          class="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl flex items-center gap-2"
        >
          <ClockIcon class="w-3.5 h-3.5 text-yellow-500" />
          <span
            class="text-[10px] text-white font-black italic tracking-tighter"
            >{{ timeLeft }}</span
          >
        </div>
        <div
          class="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/5"
        >
          <span
            class="text-[9px] text-gray-400 font-bold uppercase tracking-widest"
            >{{ product.category }}</span
          >
        </div>
      </div>
    </div>

    <div class="p-5">
      <div
        @click.stop="goToSellerProfile"
        class="flex items-center gap-2 mb-3 cursor-pointer group/seller w-fit"
      >
        <div
          class="w-6 h-6 rounded-full overflow-hidden border border-white/10 group-hover/seller:border-yellow-500 transition-colors bg-gray-900"
        >
          <img
            v-if="product.profiles?.avatar_url"
            :src="product.profiles.avatar_url"
            class="w-full h-full object-cover"
          />
          <UserCircleIcon v-else class="w-full h-full text-gray-700" />
        </div>
        <div class="flex flex-col">
          <span
            class="text-[9px] font-black uppercase italic tracking-tighter group-hover/seller:text-yellow-500 transition-colors text-white leading-none"
          >
            {{
              product.profiles?.full_name ||
              product.profiles?.username ||
              "Unknown Seller"
            }}
          </span>
          <div class="flex items-center gap-0.5 mt-0.5">
            <StarIconSolid class="w-2 h-2 text-yellow-500" />
            <span class="text-[7px] text-gray-500 font-bold tracking-tighter">
              {{ product.profiles?.reputation_score?.toFixed(1) || "5.0" }}
            </span>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <h3
          class="text-sm font-black text-white uppercase italic leading-tight group-hover:text-yellow-500 transition-colors"
        >
          {{ product.name }}
        </h3>
        <p
          class="text-[10px] text-gray-600 font-bold uppercase mt-1 tracking-[0.2em] italic opacity-60"
        >
          Live Transmission
        </p>
      </div>

      <div
        class="bg-white/[0.03] border border-white/5 rounded-2xl p-3 mb-5 shadow-inner"
      >
        <p
          class="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 italic"
        >
          Highest Bid
        </p>
        <p
          class="text-lg font-[1000] text-yellow-500 italic tracking-tighter leading-none"
        >
          {{ formatPrice(product.current_bid || product.price) }}
        </p>
      </div>

      <div class="flex gap-2">
        <button
          @click="goToDetail"
          class="flex-1 flex justify-center items-center py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-95"
        >
          <EyeIcon class="w-4 h-4" />
        </button>
        <button
          @click="placeBid"
          class="flex-[2.5] flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest italic transition-all active:scale-95"
          :class="
            isPremium
              ? 'bg-yellow-500 text-black shadow-[0_5px_15px_rgba(234,179,8,0.3)]'
              : 'bg-white text-black hover:bg-yellow-500'
          "
        >
          <BanknotesIcon class="w-4 h-4" />
          Bid Now
        </button>
      </div>
    </div>
  </div>
</template>
