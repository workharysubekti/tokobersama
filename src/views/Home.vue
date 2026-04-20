<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import AuctionCard from "../components/AuctionCard.vue";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

const products = ref([]);
const scrollContainer = ref(null);
let productSubscription = null;

// --- LOGIKA SLIDE BANNER ---
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
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (data) {
    products.value = data;
  }
};

const scroll = (direction) => {
  if (scrollContainer.value) {
    const container = scrollContainer.value;
    const cardWidth =
      container.querySelector(".card-container").offsetWidth + 16;
    const scrollStep = cardWidth * 3;

    const currentScroll = container.scrollLeft;
    const targetScroll =
      direction === "left"
        ? currentScroll - scrollStep
        : currentScroll + scrollStep;

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  }
};

onMounted(async () => {
  await fetchProducts();
  startBannerAutoplay();

  productSubscription = supabase
    .channel("room-produk")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "products" },
      (payload) => {
        const index = products.value.findIndex((p) => p.id === payload.new.id);
        if (index !== -1) {
          products.value[index] = payload.new;
        }
      },
    )
    .subscribe();
});

onUnmounted(() => {
  if (productSubscription) {
    supabase.removeChannel(productSubscription);
  }
  if (bannerInterval) {
    clearInterval(bannerInterval);
  }
});
</script>

<template>
  <div class="bg-black min-h-screen text-white antialiased overflow-x-hidden">
    <section
      class="relative w-full h-[35vh] md:h-[55vh] flex items-center justify-center overflow-hidden z-10 bg-[#111]"
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
            class="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]"
            >BERSAMA</span
          >
        </h1>
        <p
          class="text-[9px] md:text-xs font-black tracking-[0.5em] md:tracking-[0.6em] uppercase text-yellow-500 italic"
        >
          High-Value {{ banners[currentSlide].title }} Auctions
        </p>
      </div>

      <div
        class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent"
      ></div>
    </section>

    <div class="relative z-30 -mt-16 pb-24">
      <section class="max-w-[1440px] mx-auto px-6">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center space-x-3">
            <div
              class="w-1.5 h-6 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
            ></div>
            <h2 class="text-xl font-black italic uppercase tracking-tighter">
              Live <span class="text-yellow-500">Auctions</span>
            </h2>
          </div>

          <div
            v-if="products.length > 0"
            class="hidden lg:flex items-center space-x-3"
          >
            <button
              @click="scroll('left')"
              class="p-2.5 bg-yellow-500 hover:bg-white text-black rounded-full transition-all border-none shadow-[0_0_15px_rgba(234,179,8,0.3)]"
            >
              <ChevronLeftIcon class="w-5 h-5 stroke-[3px]" />
            </button>
            <button
              @click="scroll('right')"
              class="p-2.5 bg-yellow-500 hover:bg-white text-black rounded-full transition-all border-none shadow-[0_0_15px_rgba(234,179,8,0.3)]"
            >
              <ChevronRightIcon class="w-5 h-5 stroke-[3px]" />
            </button>
          </div>
        </div>

        <div
          v-if="products.length > 0"
          ref="scrollContainer"
          class="carousel-wrapper no-scrollbar"
          :class="
            products.length <= 4 ? 'lg:justify-center' : 'lg:justify-start'
          "
        >
          <div
            v-for="product in products"
            :key="product.id"
            class="card-container"
          >
            <div
              class="hover:translate-y-[-8px] transition-transform duration-300"
            >
              <AuctionCard :product="product" />
            </div>
          </div>
          <div class="min-w-[10px] lg:hidden"></div>
        </div>

        <div
          v-else
          class="mx-6 py-20 text-center border border-white/5 bg-white/5 rounded-[40px] backdrop-blur-sm"
        >
          <p
            class="text-gray-500 font-black uppercase italic tracking-widest text-[9px]"
          >
            No Active Transmissions...
          </p>
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
  scroll-snap-type: x proximity !important;
  gap: 20px !important;
  padding: 20px 0;
  -webkit-overflow-scrolling: touch;
}

.card-container {
  flex: 0 0 auto !important;
  scroll-snap-align: center !important;
  width: 47% !important;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

@media (min-width: 1024px) {
  .card-container {
    width: 23% !important;
  }
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

h1,
h2 {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
</style>
