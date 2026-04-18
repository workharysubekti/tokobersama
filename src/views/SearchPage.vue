<script setup>
import { computed } from "vue";
import { useSearchStore } from "../store/search.js";
// Import data produk kamu di sini, atau ambil dari store produk jika sudah pindah ke Pinia
// import { useProductStore } from '../stores/products';

const searchStore = useSearchStore();

// Gunakan logic filter yang sama, tapi ambil datanya dari store
const filteredProducts = computed(() => {
  // Misal data produk masih ada di file lokal sementara
  // return allProducts.filter(p => p.name.toLowerCase().includes(searchStore.query.toLowerCase()));
  return []; // Isi dengan array produk kamu
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h2 class="text-2xl font-black italic uppercase tracking-tighter">
        Hasil Pencarian:
        <span class="text-blue-600">"{{ searchStore.query }}"</span>
      </h2>
      <p class="text-gray-500 text-sm font-medium">
        Ditemukan {{ filteredProducts.length }} produk yang cocok
      </p>
    </div>

    <div
      v-if="filteredProducts.length > 0"
      class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
    >
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm"
      >
        <img :src="product.image" class="w-full h-40 object-contain mb-4" />
        <h3 class="font-bold text-sm line-clamp-2 mb-2">{{ product.name }}</h3>
        <p class="text-blue-600 font-black">
          Rp {{ product.price.toLocaleString() }}
        </p>
      </div>
    </div>

    <div v-else class="py-20 text-center">
      <div class="text-6xl mb-4">🔍</div>
      <h3 class="font-black text-xl">Waduh, Barangnya Gak Ada!</h3>
      <p class="text-gray-500">
        Coba cari kata kunci lain atau cek kategori sebelah.
      </p>
    </div>
  </div>
</template>
