<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../utils/format";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/24/outline";

const auctions = ref([]);
const activeTab = ref("active"); // default tab
const loading = ref(true);

const fetchMyAuctions = async () => {
  loading.value = true;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    auctions.value = data;
  } catch (err) {
    console.error(err.message);
  } finally {
    loading.value = false;
  }
};

// Filter data berdasarkan tab
const filteredAuctions = computed(() => {
  return auctions.value.filter((item) => item.status === activeTab.value);
});

onMounted(fetchMyAuctions);
</script>

<template>
  <div class="p-6 space-y-6 pb-26">
    <h2 class="text-2xl font-[1000] italic uppercase tracking-tighter">
      My <span class="text-yellow-500">Auctions</span>
    </h2>

    <div class="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit">
      <button
        v-for="tab in ['active', 'pending', 'rejected']"
        :key="tab"
        @click="activeTab = tab"
        :class="
          activeTab === tab
            ? 'bg-yellow-500 text-black shadow-lg'
            : 'text-gray-500 hover:text-white'
        "
        class="px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all"
      >
        {{ tab }}
      </button>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 3" :key="i" class="h-24 bg-white/5 rounded-[24px]"></div>
    </div>

    <div v-else-if="filteredAuctions.length > 0" class="grid gap-4">
      <div
        v-for="item in filteredAuctions"
        :key="item.id"
        class="bg-[#0d0d0d] border border-white/5 p-4 rounded-[28px] flex items-center gap-4 group hover:border-yellow-500/30 transition-all"
      >
        <img
          :src="item.image_url"
          class="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all"
        />

        <div class="flex-1">
          <p class="text-xs font-black uppercase italic">{{ item.name }}</p>
          <p class="text-lg font-[1000] text-yellow-500 italic">
            {{ formatPrice(item.current_bid || item.starting_bid) }}
          </p>

          <div class="flex items-center gap-2 mt-1">
            <component
              :is="
                activeTab === 'active'
                  ? ClockIcon
                  : activeTab === 'pending'
                    ? ExclamationCircleIcon
                    : XCircleIcon
              "
              class="w-3 h-3 text-gray-500"
            />
            <span
              class="text-[9px] font-bold text-gray-500 uppercase tracking-widest"
            >
              {{
                activeTab === "active"
                  ? "Ends: " + new Date(item.end_time).toLocaleDateString()
                  : "Status: " + item.status
              }}
            </span>
          </div>
        </div>

        <router-link
          v-if="activeTab === 'active'"
          :to="'/product/' + item.id"
          class="p-3 bg-white/5 rounded-2xl hover:bg-yellow-500 hover:text-black transition-all"
        >
          <CheckCircleIcon class="w-5 h-5" />
        </router-link>
      </div>
    </div>

    <div
      v-else
      class="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]"
    >
      <p
        class="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] italic"
      >
        No {{ activeTab }} Assets Found
      </p>
    </div>
  </div>
</template>
