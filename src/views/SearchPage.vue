<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { useSearchStore } from "../store/search.js";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  TagIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const searchStore = useSearchStore();

const products = ref([]);
const users = ref([]);
const loading = ref(false);

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price || 0);
};

const fetchSearch = async () => {
  const searchQuery = route.query.q || searchStore.searchQuery;

  if (!searchQuery) {
    products.value = [];
    users.value = [];
    return;
  }

  loading.value = true;

  try {
    // LOGIKA SEARCH @USER
    if (searchQuery.startsWith("@")) {
      const cleanUsername = searchQuery.substring(1);
      const { data: userData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .ilike("username", `%${cleanUsername}%`)
        .limit(10);

      users.value = userData || [];
      products.value = [];
    } else {
      // LOGIKA HYBRID SEARCH (BARANG + NAMA USER)
      const [prodRes, userRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .ilike("name", `%${searchQuery}%`)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .ilike("full_name", `%${searchQuery}%`)
          .limit(5),
      ]);

      products.value = prodRes.data || [];
      users.value = userRes.data || [];
    }
  } catch (error) {
    console.error("Search Intel Error:", error.message);
  } finally {
    loading.value = false;
  }
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
  <div
    class="min-h-screen bg-[#0a0a0a] pt-24 pb-32 px-4 sm:px-6 font-sans uppercase italic font-[1000]"
  >
    <div class="md:hidden mb-10 sticky top-20 z-[60]">
      <div class="relative group">
        <div
          class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"
        >
          <MagnifyingGlassIcon class="h-5 w-5 text-yellow-500" />
        </div>
        <input
          v-model="searchStore.searchQuery"
          @keyup.enter="fetchSearch"
          type="text"
          placeholder="Cari user @ atau barang..."
          class="w-full bg-white/[0.03] border border-white/10 rounded-[24px] py-5 pl-14 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all shadow-2xl"
        />
      </div>
    </div>

    <div class="mb-12">
      <h2 class="text-4xl tracking-tighter text-white">
        Search <span class="text-yellow-500">// Results</span>
      </h2>
      <p class="text-[10px] text-gray-600 mt-2 tracking-[0.4em]">
        SIGNAL: "{{ route.query.q || "IDLE" }}"
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-24">
      <div
        class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-500"
      ></div>
    </div>

    <div v-else class="space-y-12">
      <div v-if="users.length > 0">
        <h3
          class="text-[10px] text-gray-500 tracking-[0.5em] mb-6 px-2 flex items-center gap-2"
        >
          <UserCircleIcon class="w-4 h-4" /> Users Found
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="user in users"
            :key="user.id"
            @click="router.push(`/user/${user.username}`)"
            class="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-[28px] hover:border-blue-500/30 transition-all cursor-pointer group"
          >
            <div
              class="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0"
            >
              <img
                v-if="user.avatar_url"
                :src="user.avatar_url"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full bg-gray-900 flex items-center justify-center text-xs text-gray-600"
              >
                ?
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h4
                class="text-sm text-white group-hover:text-blue-400 transition-colors truncate"
              >
                {{ user.full_name || user.username }}
              </h4>
              <p class="text-[9px] text-yellow-500/50 tracking-widest mt-0.5">
                @{{ user.username }}
              </p>
            </div>
            <ChevronRightIcon class="w-4 h-4 text-gray-800" />
          </div>
        </div>
      </div>

      <div v-if="products.length > 0">
        <h3
          class="text-[10px] text-gray-500 tracking-[0.5em] mb-6 px-2 flex items-center gap-2"
        >
          <TagIcon class="w-4 h-4" /> Items Found
        </h3>
        <div class="space-y-4">
          <div
            v-for="item in products"
            :key="item.id"
            @click="router.push(`/product/${item.id}`)"
            class="group flex items-center bg-white/[0.02] border border-white/5 p-4 pr-10 rounded-[32px] hover:border-yellow-500/30 transition-all duration-300 cursor-pointer"
          >
            <img
              :src="item.image_url"
              class="w-20 h-20 object-cover rounded-[20px] border border-white/5 shadow-inner"
            />
            <div class="flex-1 ml-6 min-w-0">
              <h4
                class="text-sm text-white group-hover:text-yellow-500 transition-colors truncate tracking-tight"
              >
                {{ item.name }}
              </h4>
              <p class="text-[9px] text-gray-700 mt-2 tracking-widest">
                REF: #{{ String(item.id).split("-")[0] }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-[8px] text-gray-700 tracking-widest mb-1">
                CURRENT BID
              </p>
              <p class="text-xl text-yellow-500 font-black italic leading-none">
                {{ formatPrice(item.current_bid) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="users.length === 0 && products.length === 0"
        class="text-center py-32 border-2 border-dashed border-white/5 rounded-[48px]"
      >
        <MagnifyingGlassIcon
          class="w-16 h-16 text-gray-900 mx-auto mb-6 opacity-20"
        />
        <p class="text-gray-700 tracking-[0.5em] text-xs">
          NO SIGNALS DETECTED
        </p>
      </div>
    </div>
  </div>
</template>
