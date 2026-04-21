<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "../lib/supabase.js";
import AuctionCard from "../components/AuctionCard.vue";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";

// INI DIA MAS, JANGAN SAMPAI KETINGGALAN
const props = defineProps({
  userProfile: Object,
  authReady: Boolean,
});

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

const startBannerAutoplay = () => {
  bannerInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % banners.value.length;
  }, 5000);
};

const fetchProducts = async () => {
  try {
    const { data } = await supabase
      .from("products")
      .select(
        `
        *,
        profiles!owner_id (
          username,
          full_name,
          avatar_url,
          reputation_score
        )
      `,
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data) products.value = data;
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
    // Dengerin perubahan tabel products (buat kalau ada produk baru/tutup)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      fetchProducts,
    )
    // SINKRONISASI BIDS (RAHASIA DARI MYBIDS): Dengerin langsung tabel bids!
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bids" },
      (payload) => {
        // Cari produk yang ditawar di layar Home
        const pIndex = products.value.findIndex(
          (p) => p.id === payload.new.product_id,
        );

        // Langsung timpa harga di UI Home dengan harga dari tabel Bids!
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

const priorityProducts = computed(() =>
  products.value.filter((p) => p.is_priority).slice(0, MAX_PREMIUM_SLOTS),
);
const regularProducts = computed(() =>
  products.value.filter((p) => !p.is_priority),
);
const isSlotAvailable = computed(
  () => priorityProducts.value.length < MAX_PREMIUM_SLOTS,
);
</script>

<template>
  <div
    class="bg-black min-h-screen text-white antialiased overflow-x-hidden pt-16 md:pt-20"
  >
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

    <div class="relative z-30 -mt-10 pb-32 space-y-12">
      <section class="max-w-[1440px] mx-auto px-4">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <div
              class="w-1.5 h-6 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
            ></div>
            <h2
              class="text-xl md:text-3xl font-[1000] italic uppercase tracking-tighter"
            >
              Elite <span class="text-yellow-500">Selection</span>
            </h2>
          </div>
          <div class="hidden md:flex items-center space-x-2">
            <button
              @click="scroll(priorityContainer, 'left')"
              class="p-2 bg-white/5 rounded-xl border border-white/10"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </button>
            <button
              @click="scroll(priorityContainer, 'right')"
              class="p-2 bg-white/5 rounded-xl border border-white/10"
            >
              <ChevronRightIcon class="w-4 h-4" />
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
            <div
              class="h-full min-h-[200px] border border-dashed border-yellow-500/20 bg-yellow-500/[0.02] rounded-[24px] flex flex-col items-center justify-center p-4"
            >
              <PlusIcon class="w-8 h-8 mb-2 text-yellow-500 opacity-30" />
              <p class="text-[7px] font-black uppercase text-yellow-500/30">
                Slot Tersedia
              </p>
            </div>
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
              class="p-2 bg-white/5 rounded-xl border border-white/10"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </button>
            <button
              @click="scroll(scrollContainer, 'right')"
              class="p-2 bg-white/5 rounded-xl border border-white/10"
            >
              <ChevronRightIcon class="w-4 h-4" />
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
            class="w-full py-20 text-center opacity-20"
          >
            <p class="text-[8px] font-black uppercase tracking-[0.4em]">
              Signal Lost
            </p>
          </div>
        </div>
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
  /* UKURAN PATEN: 45% supaya muat banyak di layar HP Mas */
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
</style>
