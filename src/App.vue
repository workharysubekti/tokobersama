<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "./lib/supabase.js";
import Header from "./components/Header.vue";
import BottomNav from "./components/BottomNav.vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";

const userProfile = ref(null);
const isInitialLoading = ref(true);
const route = useRoute();
const authReady = ref(false);
const globalNotification = ref(null);

const triggerGlobalNotif = (message) => {
  globalNotification.value = { message };
  setTimeout(() => { globalNotification.value = null; }, 6000);
};

// Kabel Realtime dengan pengaman extra
const setupGlobalRealtime = (userId) => {
  if (!userId) return;
  supabase.removeAllChannels();

  const channel = supabase.channel("global-bids-tracker")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, 
      async (payload) => {
        if (payload.new.user_id !== userId) {
          const { data: history } = await supabase
            .from("bids")
            .select("id")
            .eq("product_id", payload.new.product_id)
            .eq("user_id", userId)
            .limit(1);

          if (history && history.length > 0) {
            const { data: prod } = await supabase
              .from("products")
              .select("name")
              .eq("id", payload.new.product_id)
              .single();

            if (prod) triggerGlobalNotif(`⚡ OUTBID: Seseorang menyalip bid Mas di "${prod.name}"!`);
          }
        }
    });
  
  channel.subscribe((status) => {
    if (status === 'CLOSED') channel.subscribe(); // Auto-reconnect jika kabel lepas
  });
};

const fetchSessionData = async () => {
  try {
    // Timeout internal agar tidak bengong selamanya
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
    
    const sessionPromise = supabase.auth.getSession();
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

    if (session) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (!error && data) {
        userProfile.value = data;
        setupGlobalRealtime(session.user.id);
      }
    } else {
      userProfile.value = null;
    }
  } catch (e) {
    console.error("Auth Sync Error:", e);
  } finally {
    authReady.value = true;
    isInitialLoading.value = false;
  }
};

// HANDLER UNTUK BALIK DARI WA/APLIKASI LAIN
const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    console.log("Welcome back! Refreshing state...");
    fetchSessionData();
  }
};

onMounted(async () => {
  // 1. Jalankan pengecekan pertama
  await fetchSessionData();

  // 2. MONITORING AUTH
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      await fetchSessionData();
    }
    if (event === 'SIGNED_OUT') {
      userProfile.value = null;
      supabase.removeAllChannels();
    }
  });

  // 3. LISTENERS ANTI-TIDUR
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("online", fetchSessionData);

  // 4. SEKRING TOTAL
  setTimeout(() => {
    isInitialLoading.value = false;
    authReady.value = true;
  }, 6000);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("online", fetchSessionData);
});
</script>

<template>
  <transition name="fade">
    <div v-if="isInitialLoading" class="fixed inset-0 bg-[#0a0a0a] z-[9999] flex items-center justify-center pointer-events-none">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-yellow-500/10 border-t-yellow-500 rounded-full animate-spin"></div>
        <p class="mt-4 text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] animate-pulse italic">
          Verifying Signal...
        </p>
      </div>
    </div>
  </transition>

  <div class="bg-black min-h-screen">
    <Header :userProfile="userProfile" :authReady="authReady" :key="userProfile?.id || 'guest'" />

    <router-view v-if="authReady" :userProfile="userProfile" :key="route.fullPath" />

    <BottomNav v-if="route.meta.showBottomNav" :userProfile="userProfile" />

    <transition name="notif">
      <div v-if="globalNotification" class="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 z-[1000] max-w-[400px] bg-[#111]/90 backdrop-blur-xl border border-red-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
        <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
          <div class="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] mb-1 italic text-left">Market Alert</p>
          <p class="text-[11px] font-bold text-white leading-tight italic text-left truncate sm:whitespace-normal">
            {{ globalNotification.message }}
          </p>
        </div>
        <button @click="globalNotification = null" class="p-1 hover:bg-white/5 rounded-lg shrink-0">
          <XMarkIcon class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style>
.fade-leave-active { transition: opacity 0.4s ease; }
.fade-leave-to { opacity: 0; }
/* ... style lainnya tetap sama ... */
</style>
