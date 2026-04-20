<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "../lib/supabase.js";
import AuctionCard from "../components/AuctionCard.vue";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon, PlusIcon } from "@heroicons/vue/24/outline";

// Ambil profile dari props yang dikirim App.vue
const props = defineProps({ userProfile: Object });

const products = ref([]);
const loading = ref(true);
const scrollContainer = ref(null);
let productSubscription = null;

const banners = ref([
  { id: 1, image: "/images/banner-pokemon.png", title: "ITEM" },
  { id: 2, image: "/images/banner-combo.png", title: "CARD" },
  { id: 3, image: "/images/banner-pakaian.png", title: "THRIFT" },
]);

const fetchProducts = async () => {
  const { data } = await supabase
    .from("products")
    .select("*, profiles!owner_id(username, full_name, avatar_url)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (data) products.value = data;
  loading.value = false;
};

onMounted(async () => {
  await fetchProducts();
  
  // Gunakan ID unik agar tidak bentrok saat balik dari WA
  const channelId = `home-live-${Date.now()}`;
  productSubscription = supabase.channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
    .subscribe();
});

onUnmounted(() => {
  if (productSubscription) supabase.removeChannel(productSubscription);
});

const priorityProducts = computed(() => products.value.filter(p => p.is_priority).slice(0, 5));
const regularProducts = computed(() => products.value.filter(p => !p.is_priority));
</script>

<template>
  <div class="bg-black min-h-screen text-white pt-20 pb-32">
    <div v-if="loading" class="flex justify-center py-20">
       <div class="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <div v-else class="px-6 space-y-12">
      <section v-if="priorityProducts.length > 0">
        <h2 class="text-xl font-black italic uppercase mb-6 text-yellow-500">Elite Selections</h2>
        <div class="flex overflow-x-auto gap-4 no-scrollbar">
          <div v-for="p in priorityProducts" :key="p.id" class="min-w-[280px]">
            <AuctionCard :product="p" :isPremium="true" />
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-black italic uppercase mb-6">Live Auctions</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AuctionCard v-for="p in regularProducts" :key="p.id" :product="p" />
        </div>
      </section>
    </div>
  </div>
</template>
