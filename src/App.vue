<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "./lib/supabase.js";
import Header from "./components/Header.vue";
import BottomNav from "./components/BottomNav.vue";
import { XMarkIcon, BellIcon } from "@heroicons/vue/24/outline"; // BellIcon ditambahkan
import { usePresenceStore } from "./store/presence.js";

const presenceStore = usePresenceStore();
const userProfile = ref(null);
const isInitialLoading = ref(true);
const route = useRoute();
const router = useRouter();
const authReady = ref(false);
const globalNotification = ref(null);

// STATE UNTUK CUSTOM TOAST
const customToast = ref(null);

let globalChannel = null;
let presenceChannel = null;
let notificationChannel = null;

// FUNGSI UNTUK MEMUNCULKAN NOTIFIKASI INTERNAL
const showToast = (title, message, productId) => {
  customToast.value = { title, message, productId };
  // Hilang otomatis setelah 6 detik
  setTimeout(() => {
    customToast.value = null;
  }, 6000);
};

const triggerGlobalNotif = (message) => {
  globalNotification.value = { message };
  setTimeout(() => {
    globalNotification.value = null;
  }, 6000);
};

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

const listenToNotifications = async () => {
  if (notificationChannel) supabase.removeChannel(notificationChannel);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  notificationChannel = supabase
    .channel("global-alerts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bids" },
      async (payload) => {
        const newBid = payload.new;
        if (newBid.user_id === user.id) return;

        const { data: prod } = await supabase
          .from("products")
          .select("name, owner_id")
          .eq("id", newBid.product_id)
          .single();

        if (!prod) return;

        if (prod.owner_id === user.id) {
          // Ganti toast.success dengan custom toast
          showToast(
            "INCOME ALERT",
            `Seseorang menawar "${prod.name}" Mas!`,
            newBid.product_id,
          );
        } else {
          const { data: myPastBid } = await supabase
            .from("bids")
            .select("id")
            .eq("product_id", newBid.product_id)
            .eq("user_id", user.id)
            .limit(1);

          if (myPastBid && myPastBid.length > 0) {
            triggerGlobalNotif(
              `⚡ OUTBID: Posisi Mas di "${prod.name}" disalip!`,
            );
            // Ganti toast.warning dengan custom toast
            showToast(
              "OUTBID!",
              `Waspada! Seseorang menyalip bid Mas di "${prod.name}"`,
              newBid.product_id,
            );
          }
        }
      },
    )
    .subscribe();
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
        setupGlobalPresence(session.user.id);
        listenToNotifications();
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
    if (event === "SIGNED_IN") {
      syncSession();
    }
    if (event === "SIGNED_OUT") {
      userProfile.value = null;
      if (notificationChannel) supabase.removeChannel(notificationChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      notificationChannel = null;
      presenceChannel = null;
    }
  });

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      await syncSession();
      if (userProfile.value) presenceStore.refreshConnection();
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

    <transition name="notif-pop">
      <div
        v-if="customToast"
        @click="
          router.push(`/product/${customToast.productId}`);
          customToast = null;
        "
        class="fixed top-6 left-4 right-4 z-[9999] bg-[#111]/90 backdrop-blur-xl border border-yellow-500/50 p-4 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,1)] flex items-center gap-4 active:scale-95 transition-all cursor-pointer max-w-md mx-auto"
      >
        <div
          class="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center shrink-0"
        >
          <BellIcon class="w-5 h-5 text-black" />
        </div>
        <div class="flex-1 min-w-0">
          <p
            class="text-[9px] font-black text-yellow-500 uppercase italic tracking-widest"
          >
            {{ customToast.title }}
          </p>
          <p class="text-[11px] font-bold text-white uppercase truncate italic">
            {{ customToast.message }}
          </p>
        </div>
        <XMarkIcon
          @click.stop="customToast = null"
          class="w-5 h-5 text-gray-600 hover:text-white"
        />
      </div>
    </transition>

    <Header
      v-if="!$route.meta.requiresAdmin"
      :userProfile="userProfile"
      :authReady="authReady"
    />

    <main class="min-h-screen bg-black">
      <router-view
        v-if="authReady"
        :userProfile="userProfile"
        :key="route.fullPath"
      />
    </main>

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
/* Style transisi notifikasi custom */
.notif-pop-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.notif-pop-leave-active {
  transition: all 0.3s ease-in;
}
.notif-pop-enter-from {
  transform: translateY(-100px);
  opacity: 0;
}
.notif-pop-leave-to {
  transform: translateY(-100px);
  opacity: 0;
}

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
