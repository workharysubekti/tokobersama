<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../utils/format.js";
import {
  FireIcon,
  EyeIcon,
  TrashIcon,
  CheckBadgeIcon,
  ClockIcon,
  StarIcon,
  EllipsisVerticalIcon,
  ArrowUpCircleIcon,
  ArchiveBoxIcon,
  SparklesIcon
} from "@heroicons/vue/24/solid";

const activeAuctions = ref([]);
const loading = ref(true);
const activeTab = ref("standard"); // Tab default
const openDropdown = ref(null);
let auctionSubscription = null;

const fetchAllAuctions = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, profiles!owner_id(username)")
      .neq("status", "pending") 
      .order("end_time", { ascending: false });

    if (error) throw error;
    activeAuctions.value = data || [];
  } catch (err) {
    console.error("Error monitor:", err.message);
  } finally {
    loading.value = false;
  }
};

// --- LOGIKA FILTER TAB (REAL-TIME) ---
const filteredAuctions = computed(() => {
  if (activeTab.value === "priority") {
    return activeAuctions.value.filter(item => item.is_priority === true);
  }
  return activeAuctions.value.filter(item => !item.is_priority);
});

const toggleElite = async (product) => {
  const newStatus = !product.is_priority;
  try {
    const { error } = await supabase
      .from("products")
      .update({ is_priority: newStatus })
      .eq("id", product.id);

    if (error) throw error;
    
    await fetchAllAuctions();
    openDropdown.value = null;
    alert(newStatus ? "ASSET PROMOTED TO ELITE" : "ASSET REMOVED FROM ELITE");
  } catch (err) {
    alert("Gagal update status Elite: " + err.message);
  }
};

const deleteProduct = async (product) => {
  const confirmDelete = confirm(`PERINGATAN: Hapus "${product.name}" secara permanen?`);
  if (!confirmDelete) return;

  try {
    const { error: bidError } = await supabase.from("bids").delete().eq("product_id", product.id);
    if (bidError) throw bidError;

    const { error: prodError } = await supabase.from("products").delete().eq("id", product.id);
    if (prodError) throw prodError;

    await fetchAllAuctions();
    alert("Target Tereliminasi: Data telah dihapus dari sistem.");
  } catch (err) {
    console.error("Detail Error:", err);
    alert("Gagal eksekusi: " + (err.message || "Koneksi Database Terputus"));
  }
};

const isEnded = (endTime) => {
  return new Date(endTime) < new Date();
};

const toggleDropdown = (id) => {
  openDropdown.value = openDropdown.value === id ? null : id;
};

onMounted(() => {
  fetchAllAuctions();
  auctionSubscription = supabase
    .channel("admin-monitor-all")
    .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => fetchAllAuctions())
    .subscribe();

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-area')) openDropdown.value = null;
  });
});

onUnmounted(() => {
  if (auctionSubscription) supabase.removeChannel(auctionSubscription);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <h3 class="text-xl font-[1000] italic uppercase tracking-tighter">
        Auction <span class="text-yellow-500">Monitor</span>
      </h3>

      <div class="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shrink-0">
        <button 
          @click="activeTab = 'standard'" 
          :class="activeTab === 'standard' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'" 
          class="px-6 py-2.5 rounded-xl text-[9px] font-black tracking-[0.2em] transition-all flex items-center gap-2 uppercase italic"
        >
          <ArchiveBoxIcon class="w-3.5 h-3.5" /> Standard ({{ activeAuctions.filter(a => !a.is_priority).length }})
        </button>
        <button 
          @click="activeTab = 'priority'" 
          :class="activeTab === 'priority' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-gray-300'" 
          class="px-6 py-2.5 rounded-xl text-[9px] font-black tracking-[0.2em] transition-all flex items-center gap-2 uppercase italic"
        >
          <SparklesIcon class="w-3.5 h-3.5" /> Priority Elite ({{ activeAuctions.filter(a => a.is_priority).length }})
        </button>
      </div>
    </div>

    <div class="bg-[#0d0d0d] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl relative">
      <div class="overflow-x-auto">
        <table class="w-full text-left min-w-[900px]">
          <thead class="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5 bg-white/[0.01]">
            <tr>
              <th class="px-8 py-4">Asset & Contractor</th>
              <th class="px-8 py-4">Current Value</th>
              <th class="px-8 py-4">Status</th>
              <th class="px-8 py-4 text-right">Operations</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="item in filteredAuctions" :key="item.id" class="hover:bg-white/[0.01] transition-all group">
              <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                  <div class="relative flex-shrink-0">
                    <img :src="item.image_url" class="w-12 h-12 rounded-xl object-cover border border-white/10" />
                    <div v-if="item.is_priority" class="absolute -top-2 -right-2 bg-yellow-500 p-1 rounded-full shadow-xl border-2 border-black">
                      <StarIcon class="w-2.5 h-2.5 text-black" />
                    </div>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-black italic uppercase tracking-tighter flex items-center gap-2 text-white truncate">
                      {{ item.name }}
                      <span v-if="item.is_priority" class="text-[7px] text-yellow-500 tracking-widest">[PRIORITY]</span>
                    </p>
                    <p class="text-[8px] font-bold text-gray-500 uppercase italic truncate">@{{ item.profiles?.username }}</p>
                  </div>
                </div>
              </td>

              <td class="px-8 py-6">
                <p class="text-sm font-[1000] italic text-yellow-500 leading-none mb-1">{{ formatPrice(item.current_bid || item.starting_bid) }}</p>
                <p class="text-[8px] text-gray-600 font-bold uppercase italic tracking-tighter">Highest Bid</p>
              </td>

              <td class="px-8 py-6">
                <div v-if="item.status === 'rejected'" class="flex items-center gap-2 text-red-500/50">
                  <div class="w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
                  <span class="text-[9px] font-black uppercase italic tracking-widest text-gray-500">Rejected</span>
                </div>
                <div v-else-if="isEnded(item.end_time)" class="flex items-center gap-2 text-orange-500 opacity-60">
                  <CheckBadgeIcon class="w-3 h-3" />
                  <span class="text-[9px] font-black uppercase italic tracking-widest">Ended</span>
                </div>
                <div v-else class="flex items-center gap-2 text-green-500">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                  <span class="text-[9px] font-black uppercase italic tracking-widest">Live</span>
                </div>
              </td>

              <td class="px-8 py-6 text-right relative dropdown-area">
                <button @click.stop="toggleDropdown(item.id)" class="p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
                  <EllipsisVerticalIcon class="w-5 h-5" />
                </button>

                <div v-if="openDropdown === item.id" class="absolute right-8 mt-2 w-48 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden py-1">
                  <router-link :to="'/product/' + item.id" class="w-full px-4 py-3 text-left text-[9px] font-black italic uppercase flex items-center gap-3 hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                    <EyeIcon class="w-4 h-4" /> View Feed
                  </router-link>

                  <button @click="toggleElite(item)" class="w-full px-4 py-3 text-left text-[9px] font-black italic uppercase flex items-center gap-3 hover:bg-white/5 transition-all" :class="item.is_priority ? 'text-red-400' : 'text-yellow-500'">
                    <ArrowUpCircleIcon v-if="!item.is_priority" class="w-4 h-4" />
                    <StarIcon v-else class="w-4 h-4" />
                    {{ item.is_priority ? 'Remove Priority' : 'Set as Priority' }}
                  </button>

                  <div class="h-px bg-white/5 mx-2 my-1"></div>

                  <button @click="deleteProduct(item)" class="w-full px-4 py-3 text-left text-[9px] font-black italic uppercase flex items-center gap-3 hover:bg-red-600 text-white transition-all">
                    <TrashIcon class="w-4 h-4" /> Delete Asset
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredAuctions.length === 0" class="py-32 text-center">
        <p class="text-[8px] font-black text-gray-700 uppercase tracking-[0.5em] italic">
          No transmissions detected in this frequency
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-x-auto::-webkit-scrollbar { height: 4px; }
.overflow-x-auto::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
</style>
