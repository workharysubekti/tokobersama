<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router"; // Ditambah untuk cek path
import Header from "./components/Header.vue";
import BottomNav from "./components/BottomNav.vue";
import { supabase } from "./lib/supabase.js";

// 1. DEFINISIKAN STATE (Penting biar gak error undefined)
const userProfile = ref(null);
const isInitialLoading = ref(true);
const route = useRoute();

onMounted(async () => {
  try {
    // Cek session secara asinkron
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // Ambil data profil kalau ada session
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      userProfile.value = data;
    }
  } catch (error) {
    console.error("Auth Error:", error);
  } finally {
    // Apapun hasilnya, matikan loading setelah proses selesai
    isInitialLoading.value = false;
  }
});

// Fungsi Logout untuk dilempar ke Header
const handleLogout = async () => {
  await supabase.auth.signOut();
  userProfile.value = null;
  window.location.href = "/"; // Refresh ke home agar state bersih
};
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
        class="mt-4 text-[10px] font-[900] text-yellow-500 uppercase tracking-[0.5em] animate-pulse italic"
      >
        Synchronizing Vault...
      </p>
    </div>
  </div>

  <div v-else class="min-h-screen bg-black flex flex-col antialiased">
    <Header
      v-if="route.path !== '/login'"
      :userProfile="userProfile"
      :handleLogout="handleLogout"
    />

    <main
      :class="[
        'flex-1',
        { 'pb-24': route.path !== '/login' && route.path !== '/register' },
      ]"
    >
      <router-view :userProfile="userProfile" />
    </main>

    <BottomNav v-if="route.path !== '/login'" :userProfile="userProfile" />
  </div>
</template>

<style>
/* Reset global biar font tebelnya merata di semua device */
body {
  background-color: black;
  color: white;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.font-black {
  font-weight: 900 !important;
}
</style>
