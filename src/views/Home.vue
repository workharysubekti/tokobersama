<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import AuctionCard from "../components/AuctionCard.vue";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

const products = ref([]);
const scrollContainer = ref(null);
let productSubscription = null;

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

// Fungsi Scroll untuk Navigasi Desktop
const scroll = (direction) => {
  if (scrollContainer.value) {
    const scrollAmount = direction === "left" ? -500 : 500;
    scrollContainer.value.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }
};

onMounted(async () => {
  await fetchProducts();

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
});
</script>

<template>
  <div class="bg-black min-h-screen text-white antialiased overflow-x-hidden">
    <section
      class="relative w-full h-[55vh] flex items-center justify-center overflow-hidden z-10"
    >
      <img
        src="/images/banner-pokemon.png"
        class="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <div class="relative z-20 text-center px-4">
        <h1
          class="text-6xl md:text-8xl font-[1000] italic tracking-tighter leading-none mb-2 drop-shadow-2xl"
        >
          TOKOBERSAMA
        </h1>
        <p
          class="text-[9px] md:text-xs font-black tracking-[0.6em] uppercase text-yellow-500 italic"
        >
          High-Value Collector Auctions
        </p>
      </div>
      <div
        class="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/90 to-transparent"
      ></div>
    </section>

    <div class="relative z-30 -mt-24 pb-24">
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
            v-if="products.length > 4"
            class="hidden lg:flex items-center space-x-3"
          >
            <button
              @click="scroll('left')"
              class="p-2.5 bg-white/5 hover:bg-yellow-500 hover:text-black rounded-full transition-all border border-white/5"
            >
              <ChevronLeftIcon class="w-5 h-5" />
            </button>
            <button
              @click="scroll('right')"
              class="p-2.5 bg-white/5 hover:bg-yellow-500 hover:text-black rounded-full transition-all border border-white/5"
            >
              <ChevronRightIcon class="w-5 h-5" />
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
            class="card-container transition-all duration-500"
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
  scroll-snap-type: x mandatory !important;
  gap: 16px !important;
  padding-bottom: 20px;
}

.card-container {
  flex: 0 0 auto !important;
  scroll-snap-align: start !important;
  /* MOBILE FIX: 2 kartu pas, kartu 3 ngintip manis */
  width: 47% !important;
}

@media (min-width: 1024px) {
  .card-container {
    /* DESKTOP FIX: 4 kartu simetris rapi */
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
