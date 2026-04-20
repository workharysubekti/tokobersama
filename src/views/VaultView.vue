<script setup>
import { ref, watch } from "vue"; // Ganti onMounted jadi watch
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { 
  ShoppingBagIcon, 
  TagIcon, 
  ArrowPathIcon, 
  ChevronRightIcon,
  ArchiveBoxIcon,
  SparklesIcon
} from "@heroicons/vue/24/outline";
import AuctionCard from "../components/AuctionCard.vue";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(true);
const activeTab = ref("collection");
const collection = ref([]); 
const listings = ref([]); 

const fetchVaultData = async () => {
  if (!props.userProfile?.id) return;
  
  loading.value = true;
  try {
    const userId = props.userProfile.id;
    // Ambil data Koleksi (Menang) & Listing (Jualan) sekaligus
    const [won, mine] = await Promise.all([
      supabase.from("products").select("*").eq("winner_id", userId).eq("status", "closed"),
      supabase.from("products").select("*").eq("owner_id", userId)
    ]);
    collection.value = won.data || [];
    listings.value = mine.data || [];
  } catch (error) {
    console.error("Vault Error:", error);
  } finally {
    loading.value = false;
  }
};

// KUNCI BIAR GAK BLANK: Nunggu data profile siap
watch(() => props.userProfile, (newVal) => {
  if (newVal) {
    fetchVaultData();
  } else if (newVal === null) {
    // Kalau beneran gak ada session setelah loading, baru ke login
    router.push("/login");
  }
}, { immediate: true });
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-24 px-5 pb-32">
    <div class="max-w-2xl mx-auto">
      
      <div class="flex flex-col mb-10">
        <div class="flex items-center gap-3 mb-2">
          <ArchiveBoxIcon class="w-6 h-6 text-yellow-500" />
          <h2 class="text-3xl font-[1000] italic uppercase tracking-tighter text-white">The <span class="text-yellow-500">Vault</span></h2>
        </div>
        <p class="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 italic ml-9">Storage System & Item History</p>
      </div>

      <div class="flex bg-white/[0.03] border border-white/5 p-1.5 rounded-[22px] mb-8">
        <button 
          @click="activeTab = 'collection'"
          :class="activeTab === 'collection' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-500'"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[10px] font-black uppercase italic transition-all duration-300"
        >
          <ShoppingBagIcon class="w-4 h-4" />
          Won Items
        </button>
        <button 
          @click="activeTab = 'listings'"
          :class="activeTab === 'listings' ? 'bg-white text-black' : 'text-gray-500'"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[10px] font-black uppercase italic transition-all duration-300"
        >
          <TagIcon class="w-4 h-4" />
          My Listings
        </button>
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-32">
        <ArrowPathIcon class="w-10 h-10 text-yellow-500 animate-spin opacity-30" />
      </div>

      <div v-else>
        <div v-if="activeTab === 'collection'" class="space-y-4">
          <div v-if="collection.length > 0" class="grid grid-cols-2 gap-4">
            <AuctionCard v-for="item in collection" :key="item.id" :product="item" />
          </div>
          <div v-else class="py-20 text-center border-2 border-dashed border-white/5 rounded-[35px]">
            <SparklesIcon class="w-10 h-10 text-gray-800 mx-auto mb-4" />
            <p class="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Vault is Empty</p>
          </div>
        </div>

        <div v-if="activeTab === 'listings'" class="space-y-4">
          <div v-if="listings.length > 0" class="grid grid-cols-2 gap-4">
            <AuctionCard v-for="item in listings" :key="item.id" :product="item" />
          </div>
          <div v-else class="py-20 text-center border-2 border-dashed border-white/5 rounded-[35px]">
            <TagIcon class="w-10 h-10 text-gray-800 mx-auto mb-4" />
            <p class="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">No Active Transmissions</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
