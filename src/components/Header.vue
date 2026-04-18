<script setup>
import { useCart } from "../store/cart.js";

const { totalItems } = useCart();
const props = defineProps({
  searchQuery: String,
});

const emit = defineEmits([
  "open-cart",
  "update:searchQuery",
  "update:selectedCategory",
]);

// Fungsi untuk reset ke semua kategori saat klik logo
const resetToHome = () => {
  emit("update:selectedCategory", "SEMUA");
};

const updateSearch = (e) => emit("update:searchQuery", e.target.value);
</script>

<template>
  <header
    class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100"
  >
    <div
      class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4"
    >
      <div
        class="flex items-center gap-2 cursor-pointer shrink-0"
        @click="resetToHome"
      >
        <router-link
          to="/"
          @click="resetToHome"
          class="flex items-center gap-2 cursor-pointer shrink-0 group"
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
      </div>

      <div class="flex-1 max-w-xl relative group">
        <span
          class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
        >
          🔍
        </span>
        <input
          type="text"
          :value="searchQuery"
          @input="updateSearch"
          placeholder="Cari gadget idamanmu..."
          class="w-full bg-gray-100 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all outline-none"
        />
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
            v-if="totalItems > 0"
            class="absolute -top-1 -right-1 bg-blue-500 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
          >
            {{ totalItems }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>
