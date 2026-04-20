<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
// Kita tidak import supabase di sini lagi untuk menjaga performa
import {
  EyeIcon,
  BanknotesIcon,
  ClockIcon,
  SparklesIcon,
  UserCircleIcon,
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

const goToSellerProfile = () => {
  if (props.product.profiles?.username) {
    router.push(`/user/${props.product.profiles.username}`);
  }
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
    timeLeft.value = `${d}D ${h}H`;
  } else {
    timeLeft.value = `${h}H ${m}M ${s}S`;
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
    class="relative group bg-white/[0.03] border border-white/5 rounded-[24px] overflow-hidden transition-all duration-500 hover:border-yellow-500/30 flex flex-col h-full"
    :class="{ 'border-yellow-500/40 bg-yellow-500/[0.02] shadow-[0_0_30px_rgba(234,179,8,0.05)]': isPremium }"
  >
    <div
      v-if="isPremium"
      class="absolute top-2 left-2 z-30 bg-yellow-500 text-black text-[7px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg italic uppercase tracking-tighter"
    >
      <SparklesIcon class="w-2.5 h-2.5" />
      <span>Elite Item</span>
    </div>

    <div class="relative h-44 md:h-56 overflow-hidden cursor-pointer shrink-0" @click="goToDetail">
      <img :src="product.image_url" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      
      <div v-if="isPremium" class="glossy-overlay"></div>

      <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80"></div>

      <div class="absolute bottom-2 left-2 right-2 flex justify-between items-center gap-1 z-20">
        <div class="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-xl flex items-center gap-1.5 shrink-0">
          <ClockIcon class="w-3 h-3 text-yellow-500" />
          <span class="text-[8px] md:text-[10px] text-white font-black italic tracking-tighter">{{ timeLeft }}</span>
        </div>
        <div class="bg-white/10 backdrop-blur-md px-2 py-1 rounded-xl border border-white/5 truncate max-w-[40%]">
          <span class="text-[7px] md:text-[9px] text-gray-300 font-bold uppercase tracking-widest truncate block">{{ product.category }}</span>
        </div>
      </div>
    </div>

    <div class="p-3 md:p-5 flex flex-col flex-1">
      <div @click.stop="goToSellerProfile" class="flex items-center gap-2 mb-2 cursor-pointer group/seller w-fit">
        <div class="w-5 h-5 rounded-full overflow-hidden border border-white/10 bg-gray-900 shrink-0">
          <img v-if="product.profiles?.avatar_url" :src="product.profiles.avatar_url" class="w-full h-full object-cover" />
          <UserCircleIcon v-else class="w-full h-full text-gray-700" />
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-[8px] font-black uppercase italic tracking-tighter text-white/70 group-hover/seller:text-yellow-500 truncate">
            {{ product.profiles?.username || "Anonymous" }}
          </span>
        </div>
      </div>

      <div class="mb-3">
        <h3 class="text-[11px] md:text-sm font-black text-white uppercase italic leading-tight group-hover:text-yellow-500 transition-colors line-clamp-2 min-h-[2.4em]">
          {{ product.name }}
        </h3>
      </div>

      <div class="bg-white/[0.03] border border-white/5 rounded-xl p-2 md:p-3 mb-4 mt-auto">
        <p class="text-[7px] md:text-[9px] text-gray-600 font-black uppercase tracking-widest mb-0.5 italic">Current High Bid</p>
        <p class="text-[11px] md:text-lg font-[1000] text-yellow-500 italic tracking-tighter leading-none truncate">
          {{ formatPrice(product.current_bid || product.starting_bid) }}
        </p>
      </div>

      <div class="flex gap-1.5">
        <button @click="goToDetail" class="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all shrink-0">
          <EyeIcon class="w-4 h-4" />
        </button>
        <button
          @click="placeBid"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-tighter italic transition-all shadow-lg active:scale-95"
          :class="isPremium ? 'bg-yellow-500 text-black shadow-yellow-500/10' : 'bg-white text-black hover:bg-yellow-500'"
        >
          <BanknotesIcon class="w-3.5 h-3.5" />
          <span>Place Bid</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* --- ANIMASI GLOSSY / SHINE --- */
.glossy-overlay {
  position: absolute;
  top: 0;
  left: -150%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.4),
    rgba(255, 255, 255, 0.1),
    transparent
  );
  z-index: 10;
  transition: all 0.1s;
  animation: shine 4s infinite linear;
}

@keyframes shine {
  0% { left: -150%; }
  30% { left: 150%; } /* Lewat cepat */
  100% { left: 150%; } /* Nunggu bentar baru mulai lagi */
}

/* Hilangkan highlight biru di mobile */
div {
  -webkit-tap-highlight-color: transparent;
}
</style>
