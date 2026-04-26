<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router"; // Tambah useRouter
import { supabase } from "../../lib/supabase.js";
import AuctionCard from "../../components/AuctionCard.vue";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  TagIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const products = ref([]);
const loading = ref(true);
const totalCount = ref(0);
const currentPage = ref(1);
const itemsPerPage = 12;
let productSubscription = null;

// DAFTAR KATEGORI UNTUK NAVIGASI MOBILE
const categories = [
  "TCG & Kartu",
  "Action Figure",
  "Diecast & Miniatur",
  "Virtual Item",
  "Fashion & Thrift",
  "Hobi & kolektibel",
];

const fetchCategoryProducts = async () => {
  loading.value = true;
  const from = (currentPage.value - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  try {
    const { data, count, error } = await supabase
      .from("products")
      .select(
        `*, profiles!owner_id (username, full_name, avatar_url, reputation_score)`,
        { count: "exact" },
      )
      .eq("status", "active")
      .neq("status", "banned")
      .eq("category", route.params.name)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch latest bids logic tetap sama (Kode Suci)
    if (data && data.length > 0) {
      const productIds = data.map((p) => p.id);
      const { data: latestBidsData } = await supabase
        .from("bids")
        .select("product_id, amount")
        .in("product_id", productIds)
        .order("amount", { ascending: false });

      products.value = data.map((p) => {
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
    totalCount.value = count || 0;
  } finally {
    loading.value = false;
  }
};

const setupRealtime = () => {
  if (productSubscription) supabase.removeChannel(productSubscription);
  productSubscription = supabase
    .channel(`category-${route.params.name}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "products" },
      (payload) => {
        if (payload.new.status === "banned") {
          products.value = products.value.filter(
            (p) => p.id !== payload.new.id,
          );
          totalCount.value--;
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
};

watch(
  () => route.params.name,
  () => {
    currentPage.value = 1;
    fetchCategoryProducts();
    setupRealtime();
  },
);

onMounted(() => {
  fetchCategoryProducts();
  setupRealtime();
});

onUnmounted(() => {
  if (productSubscription) supabase.removeChannel(productSubscription);
});

const totalPages = computed(() => Math.ceil(totalCount.value / itemsPerPage));
</script>

<template>
  <div class="min-h-screen bg-black pt-6 pb-20 px-4 sm:px-8">
    <div class="max-w-[1440px] mx-auto">
      <section class="md:hidden w-full overflow-hidden mb-8">
        <div class="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          <button
            v-for="cat in categories"
            :key="cat"
            @click="router.push('/category/' + cat)"
            :class="
              route.params.name === cat
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-white/5 text-gray-500 border-white/10'
            "
            class="flex-shrink-0 px-4 py-2 rounded-xl border text-[9px] font-black uppercase italic transition-all active:scale-95"
          >
            {{ cat }}
          </button>
        </div>
      </section>

      <div class="mb-10">
        <p
          class="text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.4em] mb-2 italic"
        >
          Collection Hub
        </p>
        <h1
          class="text-3xl md:text-6xl font-[1000] text-white uppercase italic tracking-tighter leading-tight"
        >
          {{ route.params.name }}
          <span class="text-gray-800 text-xl md:text-3xl"
            >/ {{ totalCount }} items</span
          >
        </h1>
      </div>

      <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="i in 8"
          :key="i"
          class="h-80 bg-white/5 animate-pulse rounded-[32px]"
        ></div>
      </div>

      <div
        v-else-if="products.length > 0"
        class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
      >
        <div v-for="product in products" :key="product.id">
          <AuctionCard :product="product" />
        </div>
      </div>
    </div>
  </div>
</template>
