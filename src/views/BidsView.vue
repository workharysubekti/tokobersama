<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import AuctionCard from "../components/AuctionCard.vue";

const myBids = ref([]);
const loading = ref(true);

const fetchMyBids = async () => {
  loading.value = true;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Logika: Ambil produk di mana user ini ada di dalam tabel bids
    // Kita pakai Join Table sederhana
    const { data, error } = await supabase
      .from("bids")
      .select(
        `
        product_id,
        products (*)
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Filter unik biar satu produk gak muncul berkali-kali kalau user ngebid terus
      const uniqueProducts = [
        ...new Map(
          data.map((item) => [item.product_id, item.products]),
        ).values(),
      ];
      myBids.value = uniqueProducts;
    }
  }
  loading.value = false;
};

onMounted(() => {
  fetchMyBids();
});
</script>

<template>
  <div
    class="min-h-screen bg-[#0f1115] pt-28 pb-10 px-6 relative overflow-hidden"
  >
    <div
      class="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 blur-[120px] rounded-full -z-10"
    ></div>
    <div
      class="absolute bottom-0 left-0 w-[300px] h-[300px] bg-yellow-500/5 blur-[100px] rounded-full -z-10"
    ></div>

    <div class="max-w-7xl mx-auto relative z-10">
      <div class="flex items-center space-x-4 mb-10">
        <div
          class="w-1.5 h-10 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
        ></div>
        <div>
          <h2
            class="text-3xl font-black italic text-white uppercase tracking-tighter"
          >
            Lelang Saya
          </h2>
          <p
            class="text-gray-400 text-[10px] uppercase tracking-[0.3em] font-bold"
          >
            Monitor & Win the Vault
          </p>
        </div>
      </div>

      <div
        v-if="myBids.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <AuctionCard
          v-for="product in myBids"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>
  </div>
</template>
