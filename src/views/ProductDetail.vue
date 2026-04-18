<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../lib/supabase.js"; // Pastikan titiknya bener (../)
import { useCart } from "../store/cart.js";

const route = useRoute();
const product = ref(null);
const loading = ref(true);
const { addToCart } = useCart();

const fetchProductDetail = async () => {
  try {
    loading.value = true;
    const { id } = route.params; // Ambil ID dari URL /product/:id

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single(); // Kita cuma mau ambil SATU data aja

    if (error) throw error;
    product.value = data;
  } catch (error) {
    console.error("Gagal ambil detail:", error.message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchProductDetail();
});
</script>

<template>
  <div class="min-h-screen bg-white p-4 md:p-10">
    <button
      @click="$router.back()"
      class="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all"
    >
      <span class="text-xl">←</span> Kembali Belanja
    </button>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"
      ></div>
      <p class="text-slate-400 font-medium">Lagi bongkar muatan...</p>
    </div>

    <div v-else-if="product" class="max-w-6xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div class="rounded-3xl overflow-hidden bg-gray-100 shadow-xl">
          <img
            :src="product.image"
            class="w-full h-full object-cover aspect-square hover:scale-105 transition-transform duration-700"
          />
        </div>

        <div class="flex flex-col justify-center">
          <span
            class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black w-fit mb-4 uppercase tracking-widest"
          >
            {{ product.category }}
          </span>

          <h1
            class="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight"
          >
            {{ product.name }}
          </h1>

          <p class="text-3xl font-black text-blue-600 mb-8">
            Rp {{ Number(product.price).toLocaleString() }}
          </p>

          <div class="space-y-6 border-t border-slate-100 pt-8">
            <div>
              <h3 class="text-lg font-bold text-slate-800 mb-2">
                Deskripsi Produk
              </h3>
              <p class="text-slate-500 leading-relaxed">
                Produk <strong>{{ product.name }}</strong> ini adalah barang
                pilihan terbaik dengan kualitas terjamin. Cocok banget buat Mas
                yang lagi nyari barang gahar buat kerja atau hobi. Stok
                terbatas, sikat sebelum diambil orang!
              </p>
            </div>

            <div class="flex gap-4 mt-10">
              <button
                @click="addToCart(product)"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                BELI SEKARANG
              </button>
              <button
                class="p-5 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                ❤️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20">
      <h2 class="text-2xl font-bold text-slate-800">
        Waduh, produk nggak ketemu!
      </h2>
      <p class="text-slate-500">
        Mungkin barangnya sudah diborong sultan lain.
      </p>
    </div>
  </div>
</template>
