<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import {
  MagnifyingGlassIcon,
  FireIcon,
  SparklesIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const products = ref([]);
const loading = ref(false);

const fetchSearch = async () => {
  // Ambil query langsung dari URL
  const searchQuery = route.query.q;

  if (!searchQuery) {
    products.value = [];
    loading.value = false;
    return;
  }

  loading.value = true;

  // TIPS: Pastikan kolomnya namanya 'name' dan tabelnya 'products'
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${searchQuery}%`) // ilike itu Case-Insensitive (nike = Nike)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error:", error.message);
    products.value = [];
  } else {
    console.log("Data Ditemukan:", data); // Cek di console log buat mastiin data masuk
    products.value = data;
  }

  loading.value = false;
};

const formatPrice = (price) => {
  return price ? price.toLocaleString("id-ID") : "0";
};

// Search
onMounted(() => {
  fetchSearch();
});

// Jalankan SETIAP KALI isi ?q= berubah
watch(
  () => route.query.q,
  (newQuery) => {
    fetchSearch();
  },
);

watch(() => route.query.q, fetchSearch);
</script>

<template>
  <div
    class="min-h-screen bg-[#0f1115] pt-28 pb-32 px-6 relative overflow-hidden"
  >
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-yellow-500/5 blur-[120px] -z-10"
    ></div>

    <div class="max-w-5xl mx-auto relative z-10">
      <div
        v-if="!route.query.q"
        class="py-12 flex flex-col items-center text-center"
      >
        <div
          class="w-20 h-20 bg-yellow-500/10 rounded-[30px] flex items-center justify-center border border-yellow-500/20 mb-8 animate-pulse"
        >
          <MagnifyingGlassIcon class="w-10 h-10 text-yellow-500" />
        </div>

        <h2
          class="text-4xl font-black italic text-white uppercase tracking-tighter mb-4"
        >
          Ready to <span class="text-yellow-500">Hunt?</span>
        </h2>
        <p
          class="text-gray-500 text-xs uppercase tracking-[0.4em] mb-12 max-w-xs leading-loose"
        >
          Masukkan kata kunci di atas untuk menemukan barang lelang impianmu.
        </p>

        <div class="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div
            class="bg-[#16191e] border border-white/5 p-4 rounded-2xl flex items-center space-x-3 opacity-50"
          >
            <FireIcon class="w-5 h-5 text-orange-500" />
            <span
              class="text-[10px] font-bold text-white uppercase tracking-widest"
              >Trending</span
            >
          </div>
          <div
            class="bg-[#16191e] border border-white/5 p-4 rounded-2xl flex items-center space-x-3 opacity-50"
          >
            <SparklesIcon class="w-5 h-5 text-blue-500" />
            <span
              class="text-[10px] font-bold text-white uppercase tracking-widest"
              >New Items</span
            >
          </div>
        </div>
      </div>

      <div v-else-if="loading" class="flex flex-col items-center py-20">
        <div
          class="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"
        ></div>
        <p
          class="mt-4 text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]"
        >
          Accessing Vault...
        </p>
      </div>

      <div v-else>
        <div
          class="mb-10 flex items-end justify-between border-b border-white/5 pb-6"
        >
          <div>
            <p
              class="text-yellow-500 text-[9px] font-black uppercase tracking-[0.4em] mb-2 text-glow"
            >
              Search Results
            </p>
            <h2
              class="text-2xl text-white font-black italic uppercase tracking-tighter"
            >
              Keyword: <span class="text-gray-500">"{{ route.query.q }}"</span>
            </h2>
          </div>
          <p class="text-gray-600 text-[10px] font-bold">
            {{ products.length }} ITEMS FOUND
          </p>
        </div>

        <div v-if="products.length > 0" class="space-y-4">
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-glow {
  text-shadow: 0 0 10px rgba(234, 179, 8, 0.3);
}
</style>
