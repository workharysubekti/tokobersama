<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { useSearchStore } from "../store/search.js"; // Pastikan path ini benar
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const searchStore = useSearchStore();
const products = ref([]);
const loading = ref(false);

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

const fetchSearch = async () => {
  const searchQuery = route.query.q || searchStore.searchQuery;

  if (!searchQuery) {
    products.value = [];
    return;
  }

  loading.value = true;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${searchQuery}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error.message);
    products.value = [];
  } else {
    products.value = data;
  }
  loading.value = false;
};

onMounted(() => {
  fetchSearch();
});

watch(
  () => route.query.q,
  () => {
    fetchSearch();
  },
);
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] pt-24 pb-32 px-4 sm:px-6">
    <div class="md:hidden mb-6 sticky top-20 z-[60]">
      <div class="relative group">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
        >
          <MagnifyingGlassIcon class="h-5 w-5 text-yellow-500/50" />
        </div>

        <input
          v-model="searchStore.searchQuery"
          @keyup.enter="fetchSearch"
          type="text"
          placeholder="Cari koleksi..."
          class="w-full bg-[#16191e] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-black italic uppercase text-sm shadow-2xl"
        />

        <button
          @click="fetchSearch"
          class="absolute inset-y-2 right-2 px-4 bg-yellow-500 text-black rounded-xl text-[10px] font-[900] uppercase italic transition-all active:scale-95"
        >
          GO!
        </button>
      </div>
    </div>

    <div class="mb-8 px-2">
      <h2
        class="text-2xl font-[900] italic text-white uppercase tracking-tighter"
      >
        Search <span class="text-yellow-500 text-sm ml-2">// Results</span>
      </h2>
      <p
        class="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-widest"
      >
        Query: "{{ route.query.q || "None" }}"
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500"
      ></div>
    </div>

    <div v-else-if="products.length > 0" class="space-y-4">
      <div
        v-for="item in products"
        :key="item.id"
        class="group flex items-center bg-[#16191e] border border-white/5 p-4 rounded-[24px] hover:border-yellow-500/40 transition-all duration-300"
      >
        <img
          :src="item.image_url"
          class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl border border-white/10"
        />

        <div class="flex-1 ml-4 sm:ml-6">
          <h4
            class="text-white font-black uppercase italic text-xs sm:text-sm tracking-tight group-hover:text-yellow-500 transition-colors"
          >
            {{ item.name }}
          </h4>
          <p class="text-[9px] text-gray-600 font-mono mt-1 uppercase">
            Ref: #{{ String(item.id).split("-")[0] }}
          </p>
        </div>

        <div class="text-right mr-4 sm:mr-10">
          <p
            class="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-0.5"
          >
            Bid
          </p>
          <p
            class="text-yellow-500 font-black text-sm sm:text-xl italic leading-none"
          >
            {{ formatPrice(item.current_bid) }}
          </p>
        </div>

        <button
          @click="router.push(`/product/${item.id}`)"
          class="bg-yellow-500 hover:bg-white text-black px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all active:scale-95 flex items-center space-x-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
        >
          <span class="text-[10px] font-black uppercase tracking-tighter"
            >Bid / View</span
          >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3 hidden sm:block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-else
      class="text-center py-20 border border-dashed border-white/5 rounded-[40px]"
    >
      <div class="text-gray-700 mb-4 flex justify-center">
        <MagnifyingGlassIcon class="w-12 h-12 opacity-20" />
      </div>
      <p
        class="text-gray-600 font-black italic uppercase tracking-widest text-xs"
      >
        Target Tidak Ditemukan
      </p>
    </div>
  </div>
</template>
