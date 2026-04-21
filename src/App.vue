<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "./lib/supabase.js";
import Header from "./components/Header.vue";
import BottomNav from "./components/BottomNav.vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { usePresenceStore } from "./store/presence.js";

const presenceStore = usePresenceStore();
const userProfile = ref(null);
const isInitialLoading = ref(true);
const route = useRoute();
const authReady = ref(false);
const globalNotification = ref(null);

let globalChannel = null;
let presenceChannel = null;

const triggerGlobalNotif = (message) => {
  globalNotification.value = { message };
  setTimeout(() => {
    globalNotification.value = null;
  }, 6000);
};

// FITUR BARU: Lapor Online secara Global tanpa ganggu Notif
const setupGlobalPresence = (userId) => {
  if (!userId || presenceChannel) return;

  presenceChannel = supabase.channel("global-presence", {
    config: { presence: { key: userId } },
  });

  presenceChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await presenceChannel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    }
  });
};

const setupGlobalRealtime = (userId) => {
  if (!userId || globalChannel) return;

  globalChannel = supabase
    .channel("global-notif")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bids" },
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
            if (prod)
              triggerGlobalNotif(
                `⚡ OUTBID: Seseorang menyalip bid Mas di "${prod.name}"!`,
              );
          }
        }
      },
    )
    .subscribe((status) => {
      if (status === "CLOSED") globalChannel = null;
    });
};

const syncSession = async () => {
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
      if (data) {
        userProfile.value = data;
        presenceStore.initPresence(data.id);
        setupGlobalRealtime(session.user.id);
        setupGlobalPresence(session.user.id); // Jalankan laporan online global
      }
    } else {
      userProfile.value = null;
    }
  } finally {
    authReady.value = true;
    isInitialLoading.value = false;
  }
};

onMounted(async () => {
  const safetyTimeout = setTimeout(() => {
    isInitialLoading.value = false;
    authReady.value = true;
  }, 3000);

  await syncSession();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN") syncSession();
    if (event === "SIGNED_OUT") {
      userProfile.value = null;
      if (globalChannel) supabase.removeChannel(globalChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel); // Bersihkan presence
      globalChannel = null;
      presenceChannel = null;
    }
  });

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      await syncSession();
      if (userProfile.value) {
        presenceStore.refreshConnection();
      }
    }
  });
});
</script>

<template>
  <div class="bg-black min-h-screen text-white">
    <transition name="fade">
      <div
        v-if="isInitialLoading"
        class="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
      >
        <div class="flex flex-col items-center">
          <div
            class="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"
          ></div>
          <p
            class="mt-4 text-[8px] font-black text-yellow-500 uppercase tracking-[0.4em] animate-pulse italic"
          >
            Connecting...
          </p>
        </div>
      </div>
    </transition>

    <Header :userProfile="userProfile" :authReady="authReady" />
    <router-view
      v-if="authReady"
      :userProfile="userProfile"
      :key="route.fullPath"
    />
    <BottomNav v-if="route.meta.showBottomNav" :userProfile="userProfile" />

    <transition name="notif">
      <div
        v-if="globalNotification"
        class="fixed bottom-24 right-4 left-4 sm:left-auto z-[1000] max-w-[400px] bg-[#111]/90 backdrop-blur-xl border border-red-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4"
      >
        <div class="flex-1 min-w-0">
          <p
            class="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] mb-1 italic"
          >
            Market Alert
          </p>
          <p class="text-[11px] font-bold text-white italic truncate">
            {{ globalNotification.message }}
          </p>
        </div>
        <button @click="globalNotification = null">
          <XMarkIcon class="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style>
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-leave-to {
  opacity: 0;
}
.notif-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.notif-leave-active {
  transition: all 0.4s ease-in;
}
.notif-enter-from {
  transform: translateY(100px);
  opacity: 0;
}
.notif-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
body {
  background-color: black;
  margin: 0;
  -webkit-tap-highlight-color: transparent;
}
</style>
