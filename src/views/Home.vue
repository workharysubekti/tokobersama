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

const products = ref([]);
const scrollContainer = ref(null);
const priorityContainer = ref(null);
let productSubscription = null;

// --- SETTING SLOT PREMIUM ---
const MAX_PREMIUM_SLOTS = 5; // Mas bisa ganti ke 7 kalau mau lebih banyak

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
  // Kita tambahkan tanda ! agar Supabase tahu ini relasi foreign key
  const { data, error } = await supabase
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

  if (error) {
    console.error("Gagal tarik produk:", error.message);
  } else {
    products.value = data;
  }
};

// Filter Produk
const priorityProducts = computed(() =>
  products.value.filter((p) => p.is_priority).slice(0, MAX_PREMIUM_SLOTS),
);
const regularProducts = computed(() =>
  products.value.filter((p) => !p.is_priority),
);

// Cek apakah slot iklan masih tersedia
const isSlotAvailable = computed(
  () => priorityProducts.value.length < MAX_PREMIUM_SLOTS,
);

const scroll = (containerRef, direction) => {
  if (containerRef) {
    const cardWidth =
      containerRef.querySelector(".card-container").offsetWidth + 20;
    const scrollStep = cardWidth * 2;
    containerRef.scrollBy({
      left: direction === "left" ? -scrollStep : scrollStep,
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
      { event: "*", schema: "public", table: "products" },
      fetchProducts,
    )
    .subscribe();
});

onUnmounted(() => {
  if (productSubscription) supabase.removeChannel(productSubscription);
  if (bannerInterval) clearInterval(bannerInterval);
});
</script>

<template>
  <div class="bg-black min-h-screen text-white antialiased overflow-x-hidden">
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

    <div class="relative z-30 -mt-10 pb-32 space-y-20">
      <section class="max-w-[1440px] mx-auto px-6">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center space-x-4">
            <div
              class="w-2 h-8 bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
            ></div>
            <div>
              <h2
                class="text-2xl md:text-4xl font-[1000] italic uppercase tracking-tighter text-white"
              >
                Elite <span class="text-yellow-500">Selections</span>
              </h2>
              <p
                class="text-[8px] tracking-[0.3em] text-gray-500 font-bold uppercase italic"
              >
                Priority Member Placements
              </p>
            </div>
          </div>
        </div>

        <div ref="priorityContainer" class="carousel-wrapper no-scrollbar">
          <div
            v-for="product in priorityProducts"
            :key="product.id"
            class="card-container group"
          >
            <div
              class="relative p-1 rounded-[32px] bg-gradient-to-br from-yellow-500/30 to-transparent transition-all duration-500 hover:from-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.05)]"
            >
              <AuctionCard :product="product" :isPremium="true" />
              <div
                class="absolute top-4 right-4 bg-yellow-500 text-black p-1.5 rounded-lg shadow-xl"
              >
                <StarIcon class="w-4 h-4 fill-current" />
              </div>
            </div>
          </div>

          <div v-if="isSlotAvailable" class="card-container min-h-[300px]">
            <div
              class="h-full border border-dashed border-yellow-500/20 bg-yellow-500/[0.02] rounded-[32px] flex flex-col items-center justify-center text-center p-6 transition-all hover:bg-yellow-500/[0.05] group"
            >
              <div
                class="w-10 h-10 mb-3 bg-yellow-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              >
                <PlusIcon class="w-5 h-5 text-yellow-500" />
              </div>
              <h3
                class="text-yellow-500 font-black italic uppercase tracking-widest text-[10px] mb-1"
              >
                Slot Iklan Tersedia
              </h3>
              <p
                class="text-gray-500 text-[8px] uppercase tracking-widest leading-relaxed mb-4"
              >
                Tampilkan barangmu di sini
              </p>
              <a
                href="https://wa.me/xxx"
                class="bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all"
                >Hubungi Admin</a
              >
            </div>
          </div>

          <div class="min-w-[40px] md:hidden"></div>
        </div>
      </section>

      <section class="max-w-[1440px] mx-auto px-6">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center space-x-3">
            <div class="w-1.5 h-6 bg-white/20"></div>
            <h2
              class="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-gray-300"
            >
              Live <span class="text-white">Auctions</span>
            </h2>
          </div>

          <div
            v-if="regularProducts.length > 0"
            class="hidden md:flex items-center space-x-3"
          >
            <button
              @click="scroll(scrollContainer, 'left')"
              class="p-2.5 bg-white/5 hover:bg-yellow-500 hover:text-black text-white rounded-xl border border-white/5 transition-all"
            >
              <ChevronLeftIcon class="w-5 h-5" />
            </button>
            <button
              @click="scroll(scrollContainer, 'right')"
              class="p-2.5 bg-white/5 hover:bg-yellow-500 hover:text-black text-white rounded-xl border border-white/5 transition-all"
            >
              <ChevronRightIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          v-if="regularProducts.length > 0"
          ref="scrollContainer"
          class="carousel-wrapper no-scrollbar"
        >
          <div
            v-for="product in regularProducts"
            :key="product.id"
            class="card-container"
          >
            <AuctionCard :product="product" />
          </div>
          <div class="min-w-[40px] md:hidden"></div>
        </div>

        <div
          v-else
          class="py-20 text-center border border-white/5 bg-white/[0.02] rounded-[40px]"
        >
          <p
            class="text-gray-600 font-black uppercase italic tracking-[0.3em] text-[9px]"
          >
            No Active Transmissions Found
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
  padding: 10px 0;
  -webkit-overflow-scrolling: touch;
}

.card-container {
  flex: 0 0 auto !important;
  scroll-snap-align: center !important;
  width: 46% !important; /* Mobile: 2 kartu pas */
}

@media (min-width: 1024px) {
  .card-container {
    width: 23.5% !important;
  } /* Desktop: 4 kartu pas */
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
