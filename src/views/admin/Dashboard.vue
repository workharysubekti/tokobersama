<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabase";
import { formatPrice } from "../../utils/format";
import {
  CheckBadgeIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/vue/24/solid";

const stats = ref({ products: 0, users: 0, active_bids: 0 });
const pendingProducts = ref([]);
const loading = ref(true);

const fetchAdminData = async () => {
  loading.value = true;
  try {
    // 1. Fetch Stats
    const { count: pCount } = await supabase
      .from("products")
      .select("*", { count: "exact" });
    const { count: uCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact" });
    const { count: bCount } = await supabase
      .from("bids")
      .select("*", { count: "exact" });
    stats.value = { products: pCount, users: uCount, active_bids: bCount };

    // 2. Fetch Pending Products
    const { data } = await supabase
      .from("products")
      .select("*, profiles!owner_id(username)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    pendingProducts.value = data || [];
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (id, newStatus) => {
  const { error } = await supabase
    .from("products")
    .update({ status: newStatus })
    .eq("id", id);

  if (!error) {
    pendingProducts.value = pendingProducts.value.filter((p) => p.id !== id);
    fetchAdminData();
  }
};

onMounted(fetchAdminData);
</script>

<template>
  <div class="space-y-10">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="(val, label) in stats"
        :key="label"
        class="bg-[#0d0d0d] border border-white/5 p-6 rounded-[32px] relative group overflow-hidden"
      >
        <p
          class="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] italic mb-2"
        >
          {{ label.replace("_", " ") }}
        </p>
        <h3 class="text-4xl font-[1000] italic uppercase tracking-tighter">
          {{ val }}
        </h3>
        <div
          class="absolute -right-4 -top-4 w-20 h-20 bg-yellow-500/5 blur-3xl"
        ></div>
      </div>
    </div>

    <div
      class="bg-[#0d0d0d] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl"
    >
      <div
        class="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]"
      >
        <h3 class="text-lg font-[1000] italic uppercase tracking-tighter">
          Asset <span class="text-yellow-500">Moderation</span>
        </h3>
        <button
          @click="fetchAdminData"
          class="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>

      <div class="overflow-x-auto no-scrollbar">
        <table class="w-full text-left">
          <thead
            class="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5"
          >
            <tr>
              <th class="px-8 py-4">Product Info</th>
              <th class="px-8 py-4">Seller</th>
              <th class="px-8 py-4">Start Price</th>
              <th class="px-8 py-4 text-right">Decide</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              v-for="products in pendingProducts"
              :key="products.id"
              class="hover:bg-white/[0.02] transition-all"
            >
              <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                  <img
                    :src="products.image_url"
                    class="w-14 h-14 rounded-2xl object-cover border border-white/10"
                  />
                  <div>
                    <p
                      class="text-sm font-black italic uppercase tracking-tight leading-none mb-1"
                    >
                      {{ products.name }}
                    </p>
                    <p
                      class="text-[8px] text-gray-600 font-bold uppercase italic tracking-widest"
                    >
                      {{ products.category }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-8 py-6">
                <span
                  class="text-[10px] font-black italic uppercase text-gray-400"
                  >@{{ products.profiles?.username }}</span
                >
              </td>
              <td class="px-8 py-6">
                <span
                  class="text-sm font-[1000] italic text-yellow-500 uppercase"
                  >{{ formatPrice(products.starting_bid) }}</span
                >
              </td>
              <td class="px-8 py-6">
                <div class="flex justify-end gap-3">
                  <button
                    @click="updateStatus(products.id, 'active')"
                    class="p-2.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black rounded-xl transition-all"
                  >
                    <CheckBadgeIcon class="w-5 h-5" />
                  </button>
                  <button
                    @click="updateStatus(products.id, 'rejected')"
                    class="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                  >
                    <XCircleIcon class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="pendingProducts.length === 0 && !loading">
              <td colspan="4" class="px-8 py-24 text-center">
                <p
                  class="text-[10px] font-black uppercase tracking-[0.6em] text-gray-800 italic"
                >
                  Clear Transmission • No Pending Assets
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
