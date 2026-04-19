<script setup>
import { ref, onMounted, onUnmounted } from "vue"; // Tambahkan onUnmounted
import { supabase } from "../lib/supabase.js";
import AuctionCard from "../components/AuctionCard.vue";

const products = ref([]);
// 1. Buat variabel untuk menampung koneksi (di luar onMounted)
let productSubscription = null;

const fetchProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (data) {
    products.value = data;
  }
};

onMounted(async () => {
  await fetchProducts();

  // 2. Simpan koneksi ke variabel productSubscription
  productSubscription = supabase
    .channel("room-produk")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "products" },
      (payload) => {
        const index = products.value.findIndex((p) => p.id === payload.new.id);
        if (index !== -1) {
          products.value[index] = payload.new;
        }
      },
    )
    .subscribe();
});

// 3. INI KUNCINYA: Matikan koneksi pas Mas ninggalin halaman Home
onUnmounted(() => {
  if (productSubscription) {
    supabase.removeChannel(productSubscription);
    console.log("Koneksi Realtime Home dimatikan... (Cleanup)");
  }
});
</script>

<template>
  <div class="bg-black min-h-screen text-white">
    <section
      class="relative w-full h-[80vh] bg-gray-900 flex items-center justify-center overflow-hidden"
    >
      <img
        src="/images/banner-pokemon.png"
        class="absolute inset-0 w-full h-full object-cover opacity-60"
        @error="
          (e) =>
            (e.target.src =
              'https://via.placeholder.com/1920x1080?text=Cek+Folder+Public+Images')
        "
      />

      <div class="relative z-10 text-center px-4">
        <h1
          class="text-6xl md:text-8xl font-black italic tracking-tighter leading-none mb-4"
        >
          TOKOBERSAMA
        </h1>
        <p
          class="text-sm md:text-lg font-light tracking-[0.4em] uppercase text-yellow-500"
        >
          Rumah Lelang Barang Favorit Terpercaya
        </p>
      </div>
      <div
        class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent"
      ></div>
    </section>

    <div class="bg-black min-h-screen text-white pb-10">
      <section class="max-w-7xl mx-auto px-6 -mt-20 relative z-30">
        <div class="flex items-center justify-between mb-8">
          <h2
            class="text-2xl font-black tracking-widest uppercase flex items-center"
          >
            <span class="w-2 h-8 bg-yellow-500 mr-4"></span>
            Live Auctions
          </h2>
        </div>

        <div v-if="products.length > 0" class="grid-cols-1 md:grid-cols-3">
          <AuctionCard
            v-for="product in products"
            :key="product.id"
            :product="product"
          />
        </div>
      </section>
    </div>
  </div>
</template>
