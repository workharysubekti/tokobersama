<script setup>
defineProps(["item", "addToCart", "openDetail"]);
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group"
  >
    <div class="relative overflow-hidden cursor-pointer">
      <img
        :src="item.image"
        class="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
        alt="product"
      />
      <div
        class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      ></div>
    </div>

    <div class="p-2 flex flex-col flex-1">
      <h3
        class="text-[10px] md:text-sm font-medium line-clamp-2 mb-1 h-7 md:h-10 leading-tight text-slate-800"
      >
        {{ item.name }}
      </h3>

      <div class="mt-auto">
        <p class="text-blue-600 font-bold text-[11px] md:text-base">
          Rp {{ item.price.toLocaleString() }}
        </p>

        <button
          @click="addToCart(item)"
          class="w-full mt-2 bg-blue-50 text-blue-600 py-1.5 rounded-lg text-[10px] md:text-xs font-bold active:scale-90 transition-all border border-blue-100 hover:bg-blue-600 hover:text-white"
        >
          + Keranjang
        </button>
      </div>
    </div>
  </div>
</template>
