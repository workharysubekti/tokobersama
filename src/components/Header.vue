<script setup>
// Tambahkan 'openAdmin' di defineProps
defineProps([
  "cart",
  "searchQuery",
  "selectedCategory",
  "openCartModal",
  "openAdmin",
]);
defineEmits(["update:searchQuery", "update:selectedCategory"]);
</script>

<template>
  <header
    class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100"
  >
    <div
      class="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between gap-4"
    >
      <div
        class="flex items-center gap-2 cursor-pointer"
        @click="selectedCategory = 'Semua'"
      >
        <div
          class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200"
        >
          <span class="text-white font-black text-xl">T</span>
        </div>
        <h1 class="font-black text-xl tracking-tighter hidden md:block">
          TOKO<span class="text-blue-600">BERSAMA</span>
        </h1>
      </div>

      <div class="flex items-center gap-2 md:gap-4">
        <button
          @click="openAdmin"
          class="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all active:scale-90"
          title="Admin Panel"
        >
          <span class="text-xl">⚙️</span>
        </button>

        <button
          @click="openCartModal"
          class="relative p-2.5 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 active:scale-90 transition-all"
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
            v-if="cart.length > 0"
            class="absolute -top-1 -right-1 bg-blue-500 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
          >
            {{ cart.length }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>
