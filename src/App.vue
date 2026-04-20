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
const globalNotification = ref(null);

const triggerGlobalNotif = (message) => {
  globalNotification.value = { message };
  setTimeout(() => { globalNotification.value = null; }, 6000);
};

// Kabel Realtime dengan pengaman
const setupGlobalRealtime = (userId) => {
  // Putus kabel lama kalau ada (biar gak numpuk)
  supabase.removeAllChannels();

  supabase
    .channel("global-bids-tracker")
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
    })
    .subscribe();
};

const fetchSessionData = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (!error) {
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
    // Kasih napas dikit biar UI siap
    setTimeout(() => { isInitialLoading.value = false; }, 500);
  }
};

onMounted(async () => {
  // 1. Jalankan pengecekan pertama
  await fetchSessionData();

  // 2. MONITORING KABEL (Paling Penting!)
  // Listener ini yang bakal jaga biar sesi gak putus pas pindah menu
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth Event:", event);
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      await fetchSessionData();
    }
    if (event === 'SIGNED_OUT') {
      userProfile.value = null;
      supabase.removeAllChannels(); // Cabut semua kabel pas logout
    }
  });

  // 3. SEKRING DARURAT (Anti Muter-muter Abadi)
  // Kalau 6 detik gak kelar loading, paksa web terbuka!
  setTimeout(() => {
    if (isInitialLoading.value) {
      console.warn("Kabel macet, paksa masuk...");
      isInitialLoading.value = false;
      authReady.value = true;
    }
  }, 6000);
});
</script>

<template>
  <transition name="fade">
    <div v-if="isInitialLoading" class="fixed inset-0 bg-[#0a0a0a] z-[9999] flex items-center justify-center">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-yellow-500/10 border-t-yellow-500 rounded-full animate-spin"></div>
        <p class="mt-4 text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] animate-pulse italic">
          Verifying Signal...
        </p>
      </div>
    </div>
  </transition>

  <div class="bg-black min-h-screen selection:bg-yellow-500 selection:text-black">
    <Header :userProfile="userProfile" :authReady="authReady" :key="userProfile?.id || 'guest'" />

    <router-view v-if="authReady" :userProfile="userProfile" :key="route.fullPath" />

    <BottomNav v-if="route.meta.showBottomNav" :userProfile="userProfile" />

    <transition name="notif">
      <div v-if="globalNotification" class="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 z-[1000] max-w-[400px] bg-[#111]/90 backdrop-blur-xl border border-red-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
        <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
          <div class="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] mb-1 italic">Market Alert</p>
          <p class="text-[11px] font-bold text-white leading-tight italic truncate sm:whitespace-normal">
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
.fade-leave-active { transition: opacity 0.5s ease; }
.fade-leave-to { opacity: 0; }

.notif-enter-active { transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.notif-leave-active { transition: all 0.4s ease-in; }
.notif-enter-from { transform: translateY(100px); opacity: 0; }
.notif-leave-to { transform: translateX(100%); opacity: 0; }

body { background-color: black; color: white; -webkit-tap-highlight-color: transparent; }
</style>
