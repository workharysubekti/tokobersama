<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "./lib/supabase.js";
import Header from "./components/Header.vue";
import BottomNav from "./components/BottomNav.vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";

const userProfile = ref(null);
const isInitialLoading = ref(true);
const route = useRoute();
const authReady = ref(false);

// GLOBAL NOTIFICATION STATE
const globalNotification = ref(null);

const triggerGlobalNotif = (message) => {
  globalNotification.value = { message };
  // Hilang otomatis setelah 6 detik
  setTimeout(() => {
    globalNotification.value = null;
  }, 6000);
};

const setupGlobalRealtime = (userId) => {
  supabase
    .channel("global-bids-tracker")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bids",
      },
      async (payload) => {
        // Jika bukan bid kita sendiri
        if (payload.new.user_id !== userId) {
          // Cek apakah kita pernah ngebid barang ini di masa lalu
          const { data: history } = await supabase
            .from("bids")
            .select("id")
            .eq("product_id", payload.new.product_id)
            .eq("user_id", userId)
            .limit(1);

          if (history && history.length > 0) {
            // Tarik nama produk buat notif
            const { data: prod } = await supabase
              .from("products")
              .select("name")
              .eq("id", payload.new.product_id)
              .single();

            triggerGlobalNotif(
              `⚡ OUTBID: Seseorang menyalip bid Mas di "${prod.name}"!`,
            );
          }
        }
      },
    )
    .subscribe();
};

onMounted(async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      userProfile.value = data;

      // Jalankan realtime tracking
      setupGlobalRealtime(session.user.id);
    }
  } finally {
    authReady.value = true;
    setTimeout(() => {
      isInitialLoading.value = false;
    }, 100);
  }
});
</script>

<template>
  <div
    v-if="isInitialLoading"
    class="fixed inset-0 bg-[#0a0a0a] z-[999] flex items-center justify-center"
  >
    <div class="flex flex-col items-center">
      <div
        class="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"
      ></div>
      <p
        class="mt-4 text-[10px] font-[900] text-yellow-500 uppercase tracking-[0.5em] animate-pulse"
      >
        Synchronizing Vault...
      </p>
    </div>
  </div>

  <div class="bg-black min-h-screen">
    <Header :userProfile="userProfile" :authReady="authReady" />

    <router-view :userProfile="userProfile" />

    <BottomNav v-if="route.meta.showBottomNav" />

    <transition name="notif">
      <div
        v-if="globalNotification"
        class="fixed bottom-24 sm:bottom-10 right-6 z-[999] max-w-[320px] w-full bg-[#111]/90 backdrop-blur-xl border border-red-500/50 rounded-3xl p-4 shadow-[0_20px_50px_rgba(239,68,68,0.25)] flex items-center gap-4"
      >
        <div
          class="w-10 h-10 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0"
        >
          <div class="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        </div>
        <div class="flex-1">
          <p
            class="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] mb-1 italic"
          >
            Market Alert
          </p>
          <p class="text-[11px] font-bold text-white leading-tight italic">
            {{ globalNotification.message }}
          </p>
        </div>
        <button
          @click="globalNotification = null"
          class="p-1 hover:bg-white/5 rounded-lg transition-colors"
        >
          <XMarkIcon class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style>
/* Animasi Notif Global */
.notif-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.notif-leave-active {
  transition: all 0.4s cubic-bezier(1, 0.5, 0.8, 1);
}
.notif-enter-from {
  transform: translateX(100%) scale(0.5);
  opacity: 0;
}
.notif-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Custom Scrollbar biar makin bersih */
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: #000;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>
