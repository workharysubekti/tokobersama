<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "../lib/supabase.js";
// ... import lainnya tetap sama ...

const products = ref([]);
const loading = ref(true); // Tambahkan state loading lokal
let productSubscription = null;

const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`*, profiles!owner_id (username, full_name, avatar_url, reputation_score)`)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error) products.value = data;
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await fetchProducts();
  startBannerAutoplay();

  // Bersihkan channel lama sebelum buat baru
  supabase.removeAllChannels();

  productSubscription = supabase
    .channel("room-produk")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
    .subscribe((status) => {
      // Jika error/putus, coba subscribe ulang otomatis
      if (status === 'CHANNEL_ERROR') productSubscription.subscribe();
    });
});

onUnmounted(() => {
  // CABUT KABEL SAAT PINDAH HALAMAN (PENTING!)
  if (productSubscription) supabase.removeChannel(productSubscription);
  supabase.removeAllChannels(); 
  if (bannerInterval) clearInterval(bannerInterval);
});
</script>

<template>
  <div v-if="loading" class="py-20 text-center">
    <div class="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
  </div>
  </template>
  
