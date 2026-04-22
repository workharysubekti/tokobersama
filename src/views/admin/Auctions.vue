<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../../lib/supabase";
import { formatPrice } from "../../utils/format"; // Pastikan utilitas format ini ada
import { FireIcon, ClockIcon, EyeIcon } from "@heroicons/vue/24/solid";

const activeAuctions = ref([]);
const loading = ref(true);
let auctionSubscription = null;

const fetchActiveAuctions = async () => {
  loading.value = true;
  try {
    // Tarik produk yang statusnya 'active'
    const { data: prods, error } = await supabase
      .from("products")
      .select("*, profiles!owner_id(username)")
      .eq("status", "active")
      .order("end_time", { ascending: true });

    if (error) throw error;
    activeAuctions.value = prods || [];
  } catch (err) {
    console.error("Error monitor:", err.message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchActiveAuctions();

  // REALTIME: Kalau ada bid baru masuk, refresh list biar harga update terus!
  auctionSubscription = supabase
    .channel("admin-monitor")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bids" },
      () => fetchActiveAuctions(),
    )
    .subscribe();
});

onUnmounted(() => {
  if (auctionSubscription) supabase.removeChannel(auctionSubscription);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-[1000] italic uppercase tracking-tighter">
        Live <span class="text-yellow-500">Monitor</span>
      </h3>
      <div
        class="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-2xl border border-yellow-500/20"
      >
        <FireIcon class="w-4 h-4 text-yellow-500 animate-pulse" />
        <span
          class="text-[9px] font-black uppercase text-yellow-500 italic tracking-widest"
        >
          {{ activeAuctions.length }} Active Transmissions
        </span>
      </div>
    </div>

    <div
      class="bg-[#0d0d0d] border border-white/5 rounded-[32px] overflow-hidden"
    >
      <table class="w-full text-left border-collapse">
        <thead
          class="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5 bg-white/[0.01]"
        >
          <tr>
            <th class="px-8 py-4">Asset</th>
            <th class="px-8 py-4">Contractor</th>
            <th class="px-8 py-4">Current Bid</th>
            <th class="px-8 py-4">Time Remaining</th>
            <th class="px-8 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr
            v-for="auction in activeAuctions"
            :key="auction.id"
            class="hover:bg-white/[0.01] transition-all group"
          >
            <td class="px-8 py-6">
              <div class="flex items-center gap-4">
                <img
                  :src="auction.image_url"
                  class="w-12 h-12 rounded-xl object-cover border border-white/10"
                />
                <p class="text-xs font-black italic uppercase tracking-tighter">
                  {{ auction.name }}
                </p>
              </div>
            </td>
            <td
              class="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase italic"
            >
              @{{ auction.profiles?.username }}
            </td>
            <td class="px-8 py-6">
              <p class="text-sm font-[1000] italic text-yellow-500">
                {{ formatPrice(auction.current_bid || auction.starting_bid) }}
              </p>
            </td>
            <td class="px-8 py-6">
              <div class="flex items-center gap-2 text-gray-500">
                <ClockIcon class="w-3 h-3" />
                <span class="text-[9px] font-black uppercase italic">{{
                  new Date(auction.end_time).toLocaleString()
                }}</span>
              </div>
            </td>
            <td class="px-8 py-6 text-right">
              <router-link
                :to="'/product/' + auction.id"
                class="inline-flex p-2 hover:bg-white/5 rounded-xl transition-all"
              >
                <EyeIcon class="w-5 h-5 text-gray-600 group-hover:text-white" />
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="activeAuctions.length === 0 && !loading"
        class="py-20 text-center"
      >
        <p
          class="text-[8px] font-black text-gray-700 uppercase tracking-[0.5em] italic"
        >
          No Active Auctions in Progress
        </p>
      </div>
    </div>
  </div>
</template>
