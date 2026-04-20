<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import {
  EyeIcon,
  BanknotesIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/vue/24/outline";

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

const placeBid = () => {
  router.push(`/product/${props.product.id}?action=bid`);
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

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  if (d > 0) {
    timeLeft.value = `${d}D ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  } else {
    timeLeft.value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
};

let timer = null;
onMounted(() => {
  updateTimer();
  timer = setInterval(updateTimer, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div
    class="group relative flex flex-col rounded-[32px] transition-all duration-500 overflow-hidden h-full"
    :class="[
      isPremium
        ? 'bg-[#0f0f0f] border-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.15)]'
        : 'bg-white/5 border border-white/5 hover:border-white/10',
    ]"
  >
    <div
      v-if="isPremium"
      class="absolute -inset-4 bg-yellow-500/5 rounded-[40px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"
    ></div>

    <div class="relative aspect-square overflow-hidden m-2 rounded-[24px]">
      <img
        :src="product.image_url"
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />

      <div
        class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"
      ></div>

      <div v-if="!isPremium" class="absolute top-3 right-3 z-20">
        <div
          class="bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg"
        >
          <span
            class="text-[8px] font-black uppercase tracking-[0.2em] text-white/90"
          >
            {{ product.category || "General" }}
          </span>
        </div>
      </div>

      <div
        v-if="isPremium"
        class="absolute top-3 left-3 bg-yellow-500 text-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xl z-20"
      >
        <SparklesIcon class="w-3 h-3 fill-current" />
        <span class="text-[8px] font-black uppercase tracking-tighter italic"
          >Elite</span
        >
      </div>

      <div class="absolute bottom-3 left-3 z-10">
        <div
          class="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"
        >
          <ClockIcon class="w-3 h-3 text-yellow-500" />
          <span
            class="text-[9px] font-[1000] text-white uppercase tracking-wider"
          >
            {{ timeLeft }}
          </span>
        </div>
      </div>

      <div
        v-if="isPremium"
        class="absolute inset-0 shine-effect z-10 pointer-events-none"
      ></div>
    </div>

    <div class="px-4 pb-4 flex flex-col flex-1 relative z-20">
      <h3
        class="font-black italic uppercase tracking-tighter mb-3 leading-tight truncate"
        :class="
          isPremium
            ? 'text-sm text-yellow-500'
            : 'text-xs text-white group-hover:text-yellow-500 transition-colors'
        "
      >
        {{ product.name }}
      </h3>

      <div
        class="border rounded-2xl p-3 mb-4 mt-auto transition-colors"
        :class="
          isPremium
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-black/40 border-white/5'
        "
      >
        <p
          class="text-[7px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1"
        >
          Current Bid
        </p>
        <p
          class="font-[1000] italic text-sm tracking-tighter truncate leading-none"
          :class="isPremium ? 'text-yellow-500' : 'text-white'"
        >
          {{ formatPrice(product.current_bid || product.start_price) }}
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

<style scoped>
.shine-effect {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0) 30%,
    rgba(255, 255, 255, 0.15) 40%,
    rgba(255, 255, 255, 0) 50%
  );
  background-size: 200% 100%;
  animation: shine 5s infinite;
}

@keyframes shine {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
