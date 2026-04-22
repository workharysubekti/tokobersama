<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../utils/format.js";
import {
  FireIcon,
  EyeIcon,
  TrashIcon,
  CheckBadgeIcon,
  ClockIcon,
} from "@heroicons/vue/24/solid";

const activeAuctions = ref([]);
const loading = ref(true);
let auctionSubscription = null;

const fetchAllAuctions = async () => {
  loading.value = true;
  try {
    // Kita tarik semua produk yang sudah di-approve (active & ended)
    // Biar Mas bisa pantau mana yang masih jalan dan mana yang baru beres
    const { data, error } = await supabase
      .from("products")
      .select("*, profiles!owner_id(username)")
      .neq("status", "pending") // Kecuali yang masih antre moderasi
      .order("end_time", { ascending: false });

    if (error) throw error;
    activeAuctions.value = data || [];
  } catch (err) {
    console.error("Error monitor:", err.message);
  } finally {
    loading.value = false;
  }
};

const deleteProduct = async (product) => {
  const confirmDelete = confirm(
    `PERINGATAN: Hapus "${product.name}" secara permanen?`,
  );
  if (!confirmDelete) return;

  try {
    // 1. Bersihkan Bids dulu secara eksplisit
    // Kadang 'delete' gagal diam-diam kalau ada data anak (bids) yang mengunci data bapak (products)
    const { error: bidError } = await supabase
      .from("bids")
      .delete()
      .eq("product_id", product.id);

    if (bidError) throw bidError;

    // 2. Eksekusi Hapus Produk
    const { error: prodError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id); // Pake .eq saja Mas, lebih stabil di semua versi

    if (prodError) throw prodError;

    // 3. PAKSA REFRESH
    // Kita panggil fetchAllAuctions() dan tunggu sampai beres (await)
    await fetchAllAuctions();

    alert("Target Tereliminasi: Data telah dihapus dari sistem.");
  } catch (err) {
    console.error("Detail Error:", err);
    alert("Gagal eksekusi: " + (err.message || "Koneksi Database Terputus"));
  }
};

// Cek apakah waktu sudah lewat atau belum
const isEnded = (endTime) => {
  return new Date(endTime) < new Date();
};

onMounted(() => {
  fetchAllAuctions();
  // Realtime update jika ada bid masuk
  auctionSubscription = supabase
    .channel("admin-monitor-all")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bids" },
      () => fetchAllAuctions(),
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
        Auction <span class="text-yellow-500">Monitor</span>
      </h3>
    </div>

    <div
      class="bg-[#0d0d0d] border border-white/5 rounded-[32px] overflow-hidden"
    >
      <table class="w-full text-left">
        <thead
          class="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5 bg-white/[0.01]"
        >
          <tr>
            <th class="px-8 py-4">Asset & Contractor</th>
            <th class="px-8 py-4">Current Value</th>
            <th class="px-8 py-4">Status</th>
            <th class="px-8 py-4 text-right">Operations</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr
            v-for="item in activeAuctions"
            :key="item.id"
            class="hover:bg-white/[0.01] transition-all"
          >
            <td class="px-8 py-6">
              <div class="flex items-center gap-4">
                <img
                  :src="item.image_url"
                  class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div>
                  <p
                    class="text-xs font-black italic uppercase tracking-tighter"
                  >
                    {{ item.name }}
                  </p>
                  <p
                    class="text-[8px] font-bold text-gray-500 uppercase italic"
                  >
                    @{{ item.profiles?.username }}
                  </p>
                </div>
              </div>
            </td>

            <td class="px-8 py-6">
              <p class="text-sm font-[1000] italic text-yellow-500">
                {{ formatPrice(item.current_bid || item.starting_bid) }}
              </p>
              <p class="text-[8px] text-gray-600 font-bold uppercase italic">
                Highest Bid
              </p>
            </td>

            <td class="px-8 py-6">
              <div
                v-if="!isEnded(item.end_time)"
                class="flex items-center gap-2 text-green-500"
              >
                <div
                  class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
                ></div>
                <span
                  class="text-[9px] font-black uppercase italic tracking-widest"
                  >Live Bidding</span
                >
              </div>
              <div
                v-else
                class="flex items-center gap-2 text-red-500 opacity-60"
              >
                <CheckBadgeIcon class="w-3 h-3" />
                <span
                  class="text-[9px] font-black uppercase italic tracking-widest"
                  >Ended</span
                >
              </div>
            </td>

            <td class="px-8 py-6 text-right">
              <div class="flex justify-end gap-2">
                <router-link
                  :to="'/product/' + item.id"
                  title="View Detail"
                  class="p-2 bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all"
                >
                  <EyeIcon class="w-4 h-4" />
                </router-link>

                <button
                  @click="deleteProduct(item)"
                  title="Delete/Terminated"
                  class="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="activeAuctions.length === 0" class="py-20 text-center">
        <p
          class="text-[8px] font-black text-gray-700 uppercase tracking-[0.5em] italic"
        >
          No Auction History Found
        </p>
      </div>
    </div>
  </div>
</template>
