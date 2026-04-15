<script setup>
defineProps(["cart", "openCartModal", "searchQuery", "selectedCategory"]);
const emit = defineEmits(["update:searchQuery", "update:selectedCategory"]);
</script>

<template>
  <header class="sticky top-0 z-50 bg-white shadow-sm">
    <div class="flex items-center justify-between px-4 py-3">
      <h1 class="text-2xl font-black italic text-blue-600 tracking-tighter">
        TOKOBERSAMA<span class="text-slate-900">.</span>
      </h1>
      <div
        @click="openCartModal"
        class="relative group active:scale-90 transition-transform cursor-pointer p-2 z-50"
      >
        <span class="text-2xl">🛒</span>
        <div
          v-if="cart.length > 0"
          class="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
        >
          {{ cart.length }}
        </div>
      </div>
    </div>

    <div class="px-4 pb-2">
      <div class="relative">
        <input
          :value="searchQuery"
          @input="emit('update:searchQuery', $event.target.value)"
          type="text"
          placeholder="Cari kebutuhan IT-mu..."
          class="w-full pl-4 pr-10 py-2.5 bg-gray-100 rounded-xl outline-none text-sm border border-transparent focus:border-blue-500 transition-all"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 opacity-50"
          >🔍</span
        >
      </div>
    </div>

    <div class="flex overflow-x-auto no-scrollbar gap-2 px-4 pb-3">
      <button
        v-for="cat in ['SEMUA', 'GADGET', 'PHOTOGRAPHY', 'AUDIO']"
        :key="cat"
        @click="emit('update:selectedCategory', cat)"
        :class="[
          'flex-shrink-0 px-6 py-2 rounded-xl text-[11px] font-black tracking-wider transition-all border',
          selectedCategory === cat
            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
            : 'bg-gray-50 border-transparent text-gray-400',
        ]"
      >
        {{ cat }}
      </button>
    </div>
  </header>
</template>
