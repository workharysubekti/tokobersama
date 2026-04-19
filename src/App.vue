<script setup>
import { ref, onMounted } from "vue";
import Header from "./components/Header.vue";
import { supabase } from "./lib/supabase.js";
import BottomNav from "./components/BottomNav.vue";

onMounted(async () => {
  // Cek session sekali di awal secara cepat
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

  // SETELAH CEK SELESAI, BARU BUKA KUNCINYA
  isInitialLoading.value = false;
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
        class="mt-4 text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] animate-pulse"
      >
        Synchronizing Vault...
      </p>
    </div>
  </div>

  <div v-else class="antialiased">
    <Header :userProfile="userProfile" />
    <router-view :userProfile="userProfile" />
    <BottomNav />
  </div>

  <div class="min-h-screen bg-black flex flex-col">
    <Header v-if="$route.path !== '/login'" />

    <main :class="{ 'pb-10': $route.path !== '/login' }">
      <router-view />
    </main>
    <BottomNav />
  </div>
</template>
