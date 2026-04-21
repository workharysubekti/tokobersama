<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
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

let presenceChannel = null;

const setupGlobalPresence = (userId) => {
  if (!userId) return;
  if (presenceChannel) supabase.removeChannel(presenceChannel);

  // Pakai nama channel yang SANGAT spesIFIK agar tidak bentrok
  presenceChannel = supabase.channel("online-status-global");

  presenceChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
    }
  });
};

const syncSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) {
        userProfile.value = data;
        setupGlobalPresence(session.user.id);
      }
    }
  } finally {
    authReady.value = true;
    isInitialLoading.value = false;
  }
};

onMounted(async () => {
  await syncSession();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') syncSession();
    if (event === 'SIGNED_OUT') {
      userProfile.value = null;
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    }
  });
});
</script>

<template>
  <div class="bg-black min-h-screen text-white">
    <Header :userProfile="userProfile" :authReady="authReady" />
    <router-view v-if="authReady" :userProfile="userProfile" :key="route.fullPath" />
    <BottomNav v-if="route.meta.showBottomNav" :userProfile="userProfile" />
  </div>
</template>
