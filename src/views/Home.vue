<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js"; // Sesuaikan path ke file supabase.js Mas
import AuctionCard from "../components/AuctionCard.vue";

const products = ref([]);

// Fungsi untuk ambil data awal
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (data) {
    products.value = data;
  } else if (error) {
    console.error("Error fetch data:", error);
  }
};

onMounted(() => {
  fetchProducts();

  // LOGIC REAL-TIME: Pantau perubahan di tabel products
  const productSubscription = supabase
    .channel("any_channel_name")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "products" },
      (payload) => {
        // Jika ada harga bid berubah di database, update state di UI tanpa refresh
        const index = products.value.findIndex((p) => p.id === payload.new.id);
        if (index !== -1) {
          products.value[index] = payload.new;
        }
      },
    )
    .subscribe();
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

    <div class="bg-black min-h-screen text-white pb-20">
      <section class="max-w-7xl mx-auto px-6 -mt-20 relative z-30">
        <div class="flex items-center justify-between mb-8">
          <h2
            class="text-2xl font-black tracking-widest uppercase flex items-center"
          >
            <span class="w-2 h-8 bg-yellow-500 mr-4"></span>
            Live Auctions
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AuctionCard
            v-for="product in products"
            :key="product.id"
            :product="product"
          />
        </div>

        <div
          v-if="products.length === 0"
          class="text-center py-32 border border-dashed border-gray-800 rounded-[40px] mt-10"
        >
          <p class="text-gray-600 italic font-light tracking-widest">
            Belum ada barang yang dilelang...
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
