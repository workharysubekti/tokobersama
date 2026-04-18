<script setup>
import { useCart } from "../store/cart.js";

const props = defineProps(["item"]);
const { addToCart } = useCart();
</script>

<template>
  <div
    class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow"
  >
    <div
      class="relative overflow-hidden rounded-2xl mb-4 aspect-square bg-gray-50"
    >
      <router-link :to="`/product/${item.id}`">
        <img
          :src="item.image"
          class="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
        />
      </router-link>
    </div>

    <div class="flex-1 flex flex-col">
      <router-link :to="`/product/${item.id}`" class="block group">
        <h3
          class="font-bold text-slate-800 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors"
        >
          {{ item.name }}
        </h3>
      </router-link>

      <p class="text-blue-600 font-black text-xl mb-5 mt-auto">
        Rp {{ Number(item.price).toLocaleString() }}
      </p>
    </div>

    <button
      @click="addToCart(item)"
      class="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
    >
      <span>+</span> Keranjang
    </button>
  </div>
</template>
