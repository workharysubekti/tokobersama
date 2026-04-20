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

const fetchSessionData = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      userProfile.value = data;
    } else {
      userProfile.value = null;
    }
  } catch (e) {
    console.error("Auth Error:", e);
  } finally {
    authReady.value = true;
    isInitialLoading.value = false;
  }
};

// BANGUNKAN WEB SAAT BALIK DARI WA
const handleWakeUp = () => {
  if (document.visibilityState === "visible") {
    console.log("Wake up! Refreshing signal...");
    fetchSessionData();
  }
};

onMounted(async () => {
  await fetchSessionData();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchSessionData();
    if (event === 'SIGNED_OUT') userProfile.value = null;
  });

  document.addEventListener("visibilitychange", handleWakeUp);
  window.addEventListener("online", fetchSessionData);

  // SEKRING DARURAT (Anti Muter Selamanya)
  setTimeout(() => {
    if (isInitialLoading.value) {
      isInitialLoading.value = false;
      authReady.value = true;
    }
  }, 6000);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleWakeUp);
  window.removeEventListener("online", fetchSessionData);
});
</script>

<template>
  <transition name="fade">
    <div v-if="isInitialLoading" class="fixed inset-0 bg-[#0a0a0a] z-[9999] flex items-center justify-center pointer-events-none">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-yellow-500/10 border-t-yellow-500 rounded-full animate-spin"></div>
        <p class="mt-4 text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] animate-pulse italic">Verifying Signal...</p>
      </div>
    </div>
  </transition>

  <div class="bg-black min-h-screen">
    <Header :userProfile="userProfile" :authReady="authReady" :key="userProfile?.id || 'guest'" />
    <router-view v-if="authReady" :userProfile="userProfile" :key="route.fullPath" />
    <BottomNav v-if="route.meta.showBottomNav" :userProfile="userProfile" />
    </div>
</template>
