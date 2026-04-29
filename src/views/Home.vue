<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import AuctionCard from "../components/AuctionCard.vue";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Squares2X2Icon,
  TagIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({
  userProfile: Object,
  authReady: Boolean,
});

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const scrollContainer = ref(null);
const priorityContainer = ref(null);
let productSubscription = null;

const MAX_PREMIUM_SLOTS = 5;
const currentSlide = ref(0);
const banners = ref([
  { id: 1, image: "/images/banner-pokemon.png", title: "ITEM" },
  { id: 2, image: "/images/banner-combo.png", title: "CARD COLLECTION" },
  { id: 3, image: "/images/banner-pakaian.png", title: "THRIFT" },
]);
let bannerInterval = null;

const selectedCategory = ref("Semua");

const startBannerAutoplay = () => {
  bannerInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % banners.value.length;
  }, 5000);
};

const fetchProducts = async () => {
  try {
    const { data: prodData } = await supabase
      .from("products")
      .select(`*, profiles!owner_id (username, full_name, avatar_url)`)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (prodData && prodData.length > 0) {
      const productIds = prodData.map((p) => p.id);
      const { data: latestBidsData } = await supabase
        .from("bids")
        .select("product_id, amount")
        .in("product_id", productIds)
        .order("amount", { ascending: false });

      products.value = prodData.map((p) => {
        const topBid = latestBidsData?.find((b) => b.product_id === p.id);
        return {
          ...p,
          current_bid: topBid
            ? topBid.amount
            : p.current_bid || p.starting_bid || 0,
        };
      });
    } else {
      products.value = [];
    }
  } finally {
    loading.value = false;
  }
};

const scroll = (containerRef, direction) => {
  if (containerRef) {
    const cardWidth =
      containerRef.querySelector(".card-container").offsetWidth + 12;
    containerRef.scrollBy({
      left: direction === "left" ? -cardWidth * 2 : cardWidth * 2,
      behavior: "smooth",
    });
  }
};

onMounted(async () => {
  await fetchProducts();
  startBannerAutoplay();

  productSubscription = supabase
    .channel("home-live")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "products" },
      (payload) => {
        if (payload.new.status === "banned") {
          products.value = products.value.filter(
            (p) => p.id !== payload.new.id,
          );
        } else {
          fetchProducts();
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bids" },
      (payload) => {
        const pIndex = products.value.findIndex(
          (p) => p.id === payload.new.product_id,
        );
        if (
          pIndex !== -1 &&
          payload.new.amount > (products.value[pIndex].current_bid || 0)
        ) {
          products.value[pIndex].current_bid = payload.new.amount;
        }
      },
    )
    .subscribe();
});

onUnmounted(() => {
  if (productSubscription) supabase.removeChannel(productSubscription);
  if (bannerInterval) clearInterval(bannerInterval);
});

const filteredByTime = computed(() => {
  const now = new Date().getTime();
  return products.value.filter((p) => new Date(p.end_time).getTime() > now);
});

const priorityProducts = computed(() => {
  return filteredByTime.value
    .filter((p) => p.is_priority)
    .slice(0, MAX_PREMIUM_SLOTS);
});

const regularProducts = computed(() => {
  // KODE SUCI: List lelang utama tetap normal
  return filteredByTime.value.filter((p) => !p.is_priority);
});

const isSlotAvailable = computed(
  () => priorityProducts.value.length < MAX_PREMIUM_SLOTS,
);
</script>

<template>
  <div class="bg-black min-h-screen">
    <section
      class="relative w-full h-[35vh] md:h-[60vh] flex items-center justify-center overflow-hidden bg-[#050505]"
    >
      <div
        v-for="(banner, index) in banners"
        :key="banner.id"
        class="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
        :class="index === currentSlide ? 'opacity-40' : 'opacity-0'"
      >
        <img
          :src="banner.image"
          class="w-full h-full object-cover"
          alt="Banner"
        />
      </div>
      <div class="relative z-20 text-center px-6">
        <h1
          class="text-4xl md:text-8xl font-[1000] italic tracking-tighter leading-none mb-3 uppercase"
        >
          <span class="text-white">TOKO</span
          ><span
            class="text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]"
            >BERSAMA</span
          >
        </h1>
        <p
          class="text-[9px] md:text-xs font-black tracking-[0.5em] uppercase text-gray-400 italic"
        >
          Exclusive High-Value {{ banners[currentSlide].title }} Auctions
        </p>
      </div>
      <div
        class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent"
      ></div>
    </section>

    <div class="relative z-30 -mt-10 pb-32 space-y-10 md:space-y-16">
      <section class="md:hidden w-full overflow-hidden">
        <div class="px-5 flex items-center justify-between mb-4">
          <h2
            class="text-[10px] font-black uppercase tracking-[0.3em] text-white italic flex items-center gap-2"
          >
            <div
              class="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"
            ></div>
            Navigasi
          </h2>
        </div>

        <div class="flex items-start gap-4 px-5 pb-4">
          <button
            @click="selectedCategory = 'Semua'"
            class="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl active:scale-95 transition-all"
          >
            <div
              :class="
                selectedCategory === 'Semua'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white/10 text-yellow-500'
              "
              class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
            >
              <Squares2X2Icon class="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div class="text-left">
              <p
                class="text-[10px] font-black text-white uppercase italic leading-none"
              >
                Semua
              </p>
              <p
                class="text-[7px] font-bold text-gray-500 uppercase mt-1 italic"
              >
                Feed Utama
              </p>
            </div>
          </button>

          <button
            @click="router.push('/category/TCG & Kartu')"
            class="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl active:scale-95 transition-all"
          >
            <div
              class="w-10 h-10 rounded-xl bg-white/10 text-yellow-500 flex items-center justify-center"
            >
              <TagIcon class="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div class="text-left">
              <p
                class="text-[10px] font-black text-white uppercase italic leading-none"
              >
                Kategori
              </p>
              <p
                class="text-[7px] font-bold text-gray-500 uppercase mt-1 italic"
              >
                Cek Lainnya
              </p>
            </div>
          </button>
        </div>
      </section>

      <section class="max-w-[1440px] mx-auto px-4">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <div
              class="w-1.5 h-6 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
            ></div>
            <h2
              id="elite-section"
              class="text-xl md:text-3xl font-[1000] italic uppercase tracking-tighter"
            >
              Elite <span class="text-yellow-500">Selection</span>
            </h2>
          </div>
          <div class="hidden md:flex items-center space-x-2">
            <button
              @click="scroll(priorityContainer, 'left')"
              class="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
            >
              <ChevronLeftIcon class="w-4 h-4 text-white" />
            </button>
            <button
              @click="scroll(priorityContainer, 'right')"
              class="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
            >
              <ChevronRightIcon class="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div ref="priorityContainer" class="carousel-wrapper no-scrollbar">
          <div
            v-for="product in priorityProducts"
            :key="product.id"
            class="card-container"
          >
            <AuctionCard :product="product" :isPremium="true" />
          </div>
          <div v-if="isSlotAvailable" class="card-container">
            <router-link
              to="/ticketview"
              class="h-full min-h-[220px] border border-dashed border-yellow-500/20 bg-yellow-500/[0.02] rounded-[24px] flex flex-col items-center justify-center p-6 text-center group active:bg-yellow-500/[0.05] transition-all"
            >
              <PlusIcon class="w-8 h-8 mb-3 text-yellow-500 opacity-30" />
              <p
                class="text-[8px] font-black uppercase text-yellow-500/40 tracking-widest leading-relaxed italic"
              >
                Hubungi admin untuk<br />fitur premium ini
              </p>
            </router-link>
          </div>
        </div>
      </section>

      <section class="max-w-[1440px] mx-auto px-4">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <div class="w-1.5 h-6 bg-white/20"></div>
            <h2
              class="text-xl md:text-3xl font-[1000] italic uppercase tracking-tighter text-white"
            >
              Live <span class="text-gray-500">Auctions</span>
            </h2>
          </div>
          <div class="hidden md:flex items-center space-x-2">
            <button
              @click="scroll(scrollContainer, 'left')"
              class="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
            >
              <ChevronLeftIcon class="w-4 h-4 text-white" />
            </button>
            <button
              @click="scroll(scrollContainer, 'right')"
              class="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
            >
              <ChevronRightIcon class="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div ref="scrollContainer" class="carousel-wrapper no-scrollbar">
          <div
            v-for="product in regularProducts"
            :key="product.id"
            class="card-container"
          >
            <AuctionCard :product="product" />
          </div>
          <div
            v-if="regularProducts.length === 0 && !loading"
            class="w-full py-24 text-center border-2 border-dashed border-white/5 rounded-[40px]"
          >
            <p
              class="text-[10px] font-black uppercase tracking-[0.4em] text-gray-700 italic text-white"
            >
              Belum ada lelang aktif saat ini.
            </p>
          </div>
        </div>
      </section>

      <section class="max-w-7xl mx-auto px-4 py-1">
        <router-link
          to="/hall-of-fate"
          class="group block relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0a] transition-all hover:border-yellow-500/30"
        >
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/5 via-transparent to-transparent opacity-50 group-hover:scale-125 transition-transform duration-1000"
          ></div>

          <div
            class="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-8"
          >
            <div class="text-center md:text-left">
              <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/20 mb-4"
              >
                <span class="relative flex h-2 w-2">
                  <span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                  ></span>
                  <span
                    class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                  ></span>
                </span>
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-red-500"
                  >Live Judgment</span
                >
              </div>

              <h2
                class="text-4xl md:text-6xl font-[1000] italic uppercase tracking-tighter text-white leading-none"
              >
                Hall Of
                <span
                  class="text-yellow-500 italic drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  >Fate</span
                >
              </h2>
              <p
                class="text-gray-500 text-xs md:text-sm font-bold uppercase tracking-[0.3em] mt-3"
              >
                Pantau Pembayaran & Eksekusi Reputasi Secara Real-Time
              </p>
            </div>

            <div class="flex flex-col items-center md:items-end gap-4">
              <div class="flex -space-x-3 mb-2">
                <div
                  v-for="i in 3"
                  :key="i"
                  class="w-10 h-10 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center overflow-hidden"
                >
                  <img
                    :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`"
                  />
                </div>
                <div
                  class="w-10 h-10 rounded-full border-2 border-black bg-yellow-500 flex items-center justify-center text-black text-[10px] font-black italic"
                >
                  +5
                </div>
              </div>

              <div
                class="bg-yellow-500 text-black px-8 py-3 rounded-2xl font-[1000] italic uppercase text-sm shadow-[0_0_30px_rgba(234,179,8,0.2)] group-hover:scale-105 group-hover:shadow-yellow-500/40 transition-all"
              >
                Enter The Arena
              </div>
            </div>
          </div>

          <div class="bg-white/5 py-2 overflow-hidden border-t border-white/5">
            <div class="flex gap-10 animate-marquee whitespace-nowrap">
              <span
                v-for="n in 5"
                :key="n"
                class="text-[8px] font-bold uppercase italic text-gray-600 tracking-widest"
              >
                🚨 REPUTATION 5.0 IS ACTIVE • NO BID & RUN TOLERATED • CHECK
                YOUR STANDING •
              </span>
            </div>
          </div>
        </router-link>
      </section>
    </div>
  </div>
</template>

<style scoped>
.carousel-wrapper {
  display: flex !important;
  overflow-x: auto !important;
  scroll-behavior: smooth !important;
  gap: 12px !important;
  padding: 10px 0;
  -webkit-overflow-scrolling: touch;
}
.card-container {
  flex: 0 0 auto !important;
  width: 45% !important;
}
@media (min-width: 1024px) {
  .card-container {
    width: 23.5% !important;
  }
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-marquee {
  display: inline-flex;
  animation: marquee 30s linear infinite;
}
@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
