<script setup>
import { ref, computed } from "vue"; // Tambahkan computed
import { useCartStore } from "../store/cart.js";
import { useSearchStore } from "../store/search.js";
import { useRouter } from "vue-router";

//Router
const router = useRouter();
// Fungsi Search
const searchStore = useSearchStore();

const cartStore = useCartStore();
const props = defineProps({
  searchQuery: String,
});

const emit = defineEmits([
  "open-cart",
  "update:searchQuery",
  "update:selectedCategory",
]);

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
const handleSearch = () => {
  if (searchStore.query.trim() !== "") {
    isSearchFocused.value = false;
    document.activeElement.blur();

    //Pindah ke Halaman Search
    router.push("/search");
  }
};
</script>

<template>
  <header
    class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100"
  >
    <div
      class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4"
    >
      <router-link
        to="/"
        @click="resetToHome"
        class="flex items-center gap-2 shrink-0 group"
      >
        <div
          class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform"
        >
          <span class="text-white font-black text-xl">T</span>
        </div>
        <h1 class="font-black text-xl tracking-tighter hidden sm:block">
          TOKO<span class="text-blue-600">BERSAMA</span>
        </h1>
      </router-link>

      <div class="relative w-full max-w-xl">
        <input
          v-model="searchStore.query"
          @focus="isSearchFocused = true"
          @blur="handleBlur"
          @keydown.enter="handleSearch"
          type="text"
          placeholder="Cari gadget impianmu..."
          class="w-full px-6 py-4 rounded-2xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 transition-all"
        />

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div
            v-if="showRecs"
            key="search-box"
            class="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-[110]"
          >
            <p
              class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4"
            >
              Pencarian Populer
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tag in [
                  'iPhone 15',
                  'Mechanical Keyboard',
                  'Sony A7II',
                  'Airpods Pro',
                ]"
                :key="tag"
                @click="selectTag(tag)"
                class="px-4 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-xs font-bold transition-colors"
              >
                🔥 {{ tag }}
              </button>
            </div>

            <div class="mt-6">
              <p
                class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4"
              >
                Kategori Cepat
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div
                  v-for="c in categories"
                  :key="c"
                  @click="
                    emit('update:selectedCategory', c);
                    isSearchFocused = false;
                  "
                  class="p-3 bg-blue-50 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-blue-100 transition-all"
                >
                  <div
                    class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs"
                  >
                    {{ c[0] }}
                  </div>
                  <span class="text-xs font-bold text-blue-900">{{ c }}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div class="flex items-center shrink-0">
        <button
          @click="$emit('open-cart')"
          class="relative p-3 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200 active:scale-95 transition-all hover:bg-slate-800"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            ></path>
          </svg>
          <span
            v-if="cartStore.totalItems > 0"
            class="absolute -top-1 -right-1 bg-blue-500 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
          >
            {{ cartStore.totalItems }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>
