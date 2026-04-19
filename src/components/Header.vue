<script setup>
import { ref, computed, onMounted } from "vue"; // Tambahkan computed
import { useSearchStore } from "../store/search.js";
import { useRouter } from "vue-router";
import {
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from "@heroicons/vue/24/outline";
import { supabase } from "../lib/supabase.js";

const userProfile = ref(null);
const getProfile = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    userProfile.value = data;
  }
};

//Router
const router = useRouter();
// Fungsi Search
const searchStore = useSearchStore();

const props = defineProps({
  searchQuery: String,
});

const emit = defineEmits(["update:searchQuery", "update:selectedCategory"]);

const isSearchFocused = ref(false);
const categories = ["SEMUA", "GADGET", "PHOTOGRAPHY", "AUDIO"];

// Pindahkan logic show ke computed biar Vue gak pusing baca flags
const showRecs = computed(() => {
  return (
    isSearchFocused.value &&
    (!props.searchQuery || props.searchQuery.length === 0)
  );
});

const resetToHome = () => {
  emit("update:selectedCategory", "SEMUA");
};

// Fungsi pencet rekomendasi yang bener (pakai emit)
const selectTag = (tag) => {
  emit("update:searchQuery", tag);
  isSearchFocused.value = false;
};

// Handle Blur
const handleBlur = () => {
  // Gunakan window.setTimeout agar jelas ini fungsi browser
  window.setTimeout(() => {
    isSearchFocused.value = false;
  }, 200);
};

// Handle Search Enter
// Di dalam <script setup> Header.vue
const handleSearch = () => {
  if (searchStore.searchQuery) {
    router.push({ name: "Search", query: { q: searchStore.searchQuery } });
  }
};

// src/components/Header.vue
onMounted(() => {
  getProfile();

  // Pantau perubahan login biar header langsung berubah
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN") {
      getProfile();
    } else if (event === "SIGNED_OUT") {
      userProfile.value = null;
    }
  });
});

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/login");
};
</script>

<template>
  <nav
    :class="[
      'fixed top-0 inset-x-0 z-[100] transition-all duration-500 ease-in-out',
      'bg-black/40 backdrop-blur-md border-b border-white/5',
      'hover:bg-black/80',
    ]"
  >
    <div
      class="h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"
    ></div>

    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <router-link to="/" class="group">
        <h1
          class="text-2xl font-black italic tracking-tighter text-white group-hover:text-yellow-500 transition-colors"
        >
          TOKO<span class="text-yellow-500 group-hover:text-white"
            >BERSAMA</span
          >
        </h1>
      </router-link>

      <div class="hidden md:flex flex-1 max-w-md mx-10 relative group">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
        >
          <MagnifyingGlassIcon
            class="h-4 w-4 text-gray-500 group-focus-within:text-yellow-500 transition-colors"
          />
        </div>

        <input
          v-model="searchStore.searchQuery"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="Cari koleksi langka..."
          class="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 focus:bg-black transition-all"
        />

        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <span
            class="text-[9px] font-black text-gray-600 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-tighter"
          >
            Search
          </span>
        </div>
      </div>

      <div class="flex items-center space-x-8">
        <router-link
          v-if="userProfile"
          to="/admin-tambah"
          class="hidden md:flex items-center space-x-2 bg-yellow-500 hover:bg-white text-black px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-widest transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
        >
          <PlusIcon class="w-4 h-4" />
          <span>Open Bid</span>
        </router-link>

        <div
          v-if="userProfile"
          class="flex items-center space-x-4 border-l border-white/10 pl-8"
        >
          <div class="text-right hidden md:block">
            <p class="text-[8px] text-gray-500 uppercase tracking-[0.3em]">
              Vault Status
            </p>
            <p class="text-xs font-bold text-yellow-500 uppercase italic">
              ⭐ {{ userProfile.reputation_score }} PTS
            </p>
          </div>
          <button
            @click="handleLogout"
            class="p-2 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all border border-white/5"
          >
            <UserIcon class="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
