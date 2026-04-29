<script setup>
import { ref, onMounted, watch } from "vue";
import { supabase } from "../lib/supabase.js";
import { useReputation } from "../composables/useReputation"; // Import Pusat Komando
import {
  ExclamationTriangleIcon,
  UserCircleIcon,
} from "@heroicons/vue/24/solid";

// 1. Inisialisasi State
const auctions = ref([]);
const loading = ref(true);

// 2. Panggil "Bot" dari Composable
const { now, getTimer, executePenalty } = useReputation();

// 3. FUNGSI AMBIL DATA (Hanya urusan tarik data)
const fetchHallOfFate = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      bids (
        user_id,
        amount,
        profiles (username, avatar_url)
      )
    `,
    )
    .eq("status", "closed")
    .not("winner_id", "is", null);

  if (!error) {
    auctions.value = data.map((product) => {
      const uniqueBids = [];
      const seen = new Set();
      const sorted = (product.bids || []).sort((a, b) => b.amount - a.amount);

      for (const b of sorted) {
        if (!seen.has(b.user_id) && uniqueBids.length < 3) {
          seen.add(b.user_id);
          uniqueBids.push(b);
        }
      }

      const finalPrice = product.price || uniqueBids[0]?.amount || 0;

      return {
        ...product,
        topThree: uniqueBids,
        displayPrice: finalPrice,
        isProcessing: false, // Flag penting buat bot penalti
      };
    });
  }
  loading.value = false;
};

// 4. LOGIC AUTO-CUT (Bot Penjaga)
// Kita pake watcher biar setiap detik (saat 'now' berubah), bot langsung patroli
watch(now, () => {
  if (loading.value) return;

  auctions.value.forEach((item) => {
    // Jika timer menyentuh EXPIRED dan bot belum memproses barang ini
    if (getTimer(item) === "EXPIRED" && !item.isProcessing) {
      console.log(`Bot Auto-Cut: Mengeksekusi penalti ${item.name}`);

      // Jalankan tebasan reputasi, lalu panggil fetchHallOfFate buat refresh data
      executePenalty(item, fetchHallOfFate);
    }
  });
});

onMounted(() => {
  fetchHallOfFate();
});
</script>

<template>
  <div class="text-center pt-12 pb-6 relative overflow-hidden">
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-500/10 blur-[100px] rounded-full"
    ></div>

    <h1
      class="relative z-10 text-6xl md:text-9xl font-[1000] italic uppercase tracking-tighter leading-none mb-2"
    >
      Hall Of
      <span
        class="text-yellow-500 italic drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]"
        >Fate</span
      >
    </h1>
    <p
      class="relative z-10 text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.6em]"
    >
      Judgment Day & Reputation Arena
    </p>
  </div>

  <div
    class="bg-red-600/10 border-y border-red-500/20 py-2.5 mb-12 overflow-hidden relative"
  >
    <div class="flex gap-10 animate-marquee whitespace-nowrap items-center">
      <div
        v-for="n in 8"
        :key="n"
        class="flex items-center gap-3 text-[10px] font-black uppercase italic text-red-500/90"
      >
        <ExclamationTriangleIcon class="w-4 h-4 text-red-600" />
        PERINGATAN: BID & RUN = -10 REPUTASI & BLACKLIST PERMANEN PADA ITEM INI!
      </div>
    </div>
  </div>
  <div
    class="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-7xl mx-auto px-4 pb-20"
  >
    <div
      v-for="item in auctions"
      :key="item.id"
      class="relative flex flex-col rounded-[2.5rem] border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl transition-all hover:border-yellow-500/40 group"
    >
      <router-link
        :to="`/product/${item.id}`"
        class="absolute inset-0 cursor-pointer"
      >
        <img
          v-if="item.image_url"
          :src="item.image_url"
          class="w-full h-full object-cover opacity-10 group-hover:scale-105 transition-transform duration-700"
        />
        <div
          class="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black"
        ></div>
      </router-link>

      <div
        class="relative z-10 flex justify-between items-center p-4 pointer-events-none"
      >
        <div
          class="bg-white/5 backdrop-blur-md border border-white/10 px-2 h-5 md:h-6 flex items-center justify-center rounded-md"
        >
          <span
            class="text-[7px] md:text-[9px] font-black uppercase text-gray-400 leading-none tracking-tighter"
          >
            {{
              item.fallback_decision_status === "awaiting"
                ? "Decision"
                : "Payment"
            }}
          </span>
        </div>

        <div
          class="bg-orange-600/20 border border-orange-500/40 px-2 h-5 md:h-7 flex items-center gap-1 rounded-lg shadow-lg"
        >
          <div class="w-1 h-1 bg-orange-500 rounded-full animate-ping"></div>
          <span
            class="text-[10px] md:text-sm font-[1000] italic tabular-nums text-orange-500 leading-none"
          >
            {{ getTimer(item) }}
          </span>
        </div>
      </div>

      <div class="relative z-10 flex flex-col items-center justify-center py-8">
        <div class="flex items-end justify-center gap-2 md:gap-6">
          <div class="flex flex-col items-center gap-1.5">
            <router-link
              v-if="item.topThree[1]"
              :to="`/user/${item.topThree[1].profiles.username}`"
              class="group/avatar"
            >
              <div
                :class="
                  item.fallback_stage === 2
                    ? 'border-cyan-500 bg-cyan-500/20 scale-110 shadow-lg'
                    : 'border-white/10 opacity-30'
                "
                class="w-10 h-10 md:w-16 md:h-16 rounded-xl border-2 overflow-hidden bg-gray-900 transition-all group-hover/avatar:border-white"
              >
                <img
                  v-if="item.topThree[1]?.profiles?.avatar_url"
                  :src="item.topThree[1].profiles.avatar_url"
                  class="w-full h-full object-cover"
                />
                <UserCircleIcon v-else class="w-full h-full text-gray-700" />
              </div>
            </router-link>
            <span class="text-[7px] font-black uppercase text-cyan-500"
              >#2</span
            >
          </div>

          <div
            class="flex flex-col items-center gap-1.5 -translate-y-6 md:-translate-y-8"
          >
            <router-link
              v-if="item.topThree[0]"
              :to="`/user/${item.topThree[0].profiles.username}`"
              class="group/avatar"
            >
              <div
                :class="
                  item.fallback_stage === 1
                    ? 'border-yellow-500 bg-yellow-500/20 scale-125 shadow-[0_0_40px_rgba(234,179,8,0.3)]'
                    : 'border-white/10 opacity-30'
                "
                class="w-14 h-14 md:w-24 md:h-24 rounded-2xl border-2 md:border-4 overflow-hidden bg-gray-900 transition-all group-hover/avatar:border-white"
              >
                <img
                  v-if="item.topThree[0]?.profiles?.avatar_url"
                  :src="item.topThree[0].profiles.avatar_url"
                  class="w-full h-full object-cover"
                />
                <UserCircleIcon v-else class="w-full h-full text-gray-700" />
              </div>
            </router-link>
            <div
              class="bg-yellow-500 text-black px-2 py-0.5 rounded-md text-[6px] md:text-[9px] font-[1000] uppercase italic shadow-lg"
            >
              ALPHA
            </div>
          </div>

          <div class="flex flex-col items-center gap-1.5">
            <router-link
              v-if="item.topThree[2]"
              :to="`/user/${item.topThree[2].profiles.username}`"
              class="group/avatar"
            >
              <div
                :class="
                  item.fallback_stage === 3
                    ? 'border-orange-500 bg-orange-500/20 scale-110 shadow-lg'
                    : 'border-white/10 opacity-30'
                "
                class="w-10 h-10 md:w-16 md:h-16 rounded-xl border-2 overflow-hidden bg-gray-900 transition-all group-hover/avatar:border-white"
              >
                <img
                  v-if="item.topThree[2]?.profiles?.avatar_url"
                  :src="item.topThree[2].profiles.avatar_url"
                  class="w-full h-full object-cover"
                />
                <UserCircleIcon v-else class="w-full h-full text-gray-700" />
              </div>
            </router-link>
            <span class="text-[7px] font-black uppercase text-orange-500"
              >#3</span
            >
          </div>
        </div>
      </div>

      <div
        class="relative z-10 mt-auto p-4 bg-gradient-to-t from-black via-black/80 to-transparent"
      >
        <router-link
          :to="`/product/${item.id}`"
          class="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 text-center transition-all hover:bg-white/10 hover:border-yellow-500/50"
        >
          <h3
            class="text-[10px] md:text-sm font-black uppercase italic text-white line-clamp-1 mb-2"
          >
            {{ item.name || "Unnamed Item" }}
          </h3>
          <div class="border-t border-white/5 pt-2">
            <p
              class="text-[7px] md:text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1"
            >
              Final Transaction
            </p>
            <p
              class="text-sm md:text-2xl font-[1000] text-yellow-500 italic leading-none"
            >
              Rp
              {{ item.displayPrice ? item.displayPrice.toLocaleString() : "0" }}
            </p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-marquee {
  display: inline-flex;
  animation: marquee 25s linear infinite;
}
@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
