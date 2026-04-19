<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "./lib/supabase.js";
import Header from "./components/Header.vue";
import BottomNav from "./components/BottomNav.vue";

const userProfile = ref(null);
const isInitialLoading = ref(true);
const route = useRoute();
const authReady = ref(false);

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
    }
  } finally {
    authReady.value = true; // Tandai auth sudah siap
    // Kasih jeda dikit biar DOM gak kaget
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

  <div v-else class="min-h-screen bg-black flex flex-col antialiased">
    <Header
      v-if="route.path !== '/login'"
      :userProfile="userProfile"
      :authReady="!isInitialLoading"
    />

    <main :class="['flex-1', { 'pb-24': route.path !== '/login' }]">
      <router-view :userProfile="userProfile" />
    </main>

    <BottomNav v-if="route.path !== '/login'" :userProfile="userProfile" />
  </div>
</template>
