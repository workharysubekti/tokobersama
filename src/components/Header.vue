<script setup>
import { ref, computed, onMounted } from "vue"; // Tambahkan computed
import { useSearchStore } from "../store/search.js";
import { useRouter } from "vue-router";
import {
  UserCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
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
      'bg-black/60 backdrop-blur-xl border-b border-white/10',
      'hover:bg-black/90',
    ]"
  >
    <div
      class="h-[2px] w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent shadow-[0_0_15px_#eab308]"
    ></div>

    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between"
    >
      <router-link to="/" class="shrink-0 group">
        <h1
          class="text-xl sm:text-2xl font-[900] italic tracking-tighter text-white group-hover:text-yellow-500 transition-all uppercase leading-none"
        >
          TOKO<span class="text-yellow-500 group-hover:text-white"
            >BERSAMA</span
          >
        </h1>
      </router-link>

      <div class="hidden md:flex flex-1 max-w-md mx-8 relative group">
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
          class="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 focus:bg-black transition-all font-medium"
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <span
            class="text-[9px] font-black text-gray-600 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-tighter"
            >Search</span
          >
        </div>
      </div>

      <div class="flex items-center space-x-3 sm:space-x-6">
        <template v-if="userProfile">
          <router-link
            to="/admin-tambah"
            class="flex items-center justify-center bg-yellow-500 hover:bg-white text-black h-9 w-9 sm:w-auto sm:px-5 sm:py-2 rounded-xl sm:rounded-full transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] active:scale-90"
          >
            <PlusIcon class="w-5 h-5 sm:w-4 sm:h-4" />
            <span
              class="hidden sm:block ml-2 text-[10px] font-[900] uppercase italic tracking-widest"
              >Open Bid</span
            >
          </router-link>

          <div
            class="flex items-center space-x-3 border-l border-white/10 pl-3 sm:pl-6"
          >
            <div class="text-right">
              <p
                class="text-[8px] text-gray-600 uppercase font-black tracking-widest leading-none mb-1"
              >
                Reputation
              </p>
              <p
                class="text-[11px] sm:text-xs font-[900] text-yellow-500 uppercase italic leading-none"
              >
                {{ userProfile.reputation_score }}
                <span class="text-[8px] text-gray-400">PTS</span>
              </p>
            </div>

            <button
              @click="handleLogout"
              class="p-2 bg-white/5 hover:bg-red-500/20 text-white hover:text-red-500 rounded-xl transition-all border border-white/5"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon class="w-5 h-5" />
            </button>
          </div>
        </template>

        <router-link
          v-else
          to="/login"
          class="bg-yellow-500 text-black px-6 py-2 rounded-xl font-[900] text-[11px] uppercase italic tracking-widest active:scale-95 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
        >
          Login
        </router-link>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Paksa font black render maksimal di semua browser */
h1,
span,
p,
button {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
</style>
