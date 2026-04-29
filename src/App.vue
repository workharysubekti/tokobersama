<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "./lib/supabase.js";
import Header from "./components/Header.vue";
import BottomNav from "./components/BottomNav.vue";
import { XMarkIcon, BellIcon } from "@heroicons/vue/24/outline";
import { usePresenceStore } from "./store/presence.js";

const showNotice = ref(false);
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
const showToast = (title, message, targetPath) => {
  let finalTitle = title;
  let finalMessage = message;

  // --- LOGIKA PENYINGKAT PESAN (INTERCEPTOR) ---
  if (title.toUpperCase().includes("OUTBID")) {
    finalTitle = "OUTBID DETECTION";
    // Biasanya message: "Tawaranmu disalip pada: KITTY CAT"
    // Kita bersihkan kalimat pembukanya, ambil nama barangnya aja
    finalMessage = message.replace(/.*[:\-\s]/g, "").trim();
  }

  customToast.value = {
    title: finalTitle,
    message: finalMessage,
    targetPath,
  };

  if (window.navigator.vibrate) window.navigator.vibrate(200);

  setTimeout(() => {
    customToast.value = null;
  }, 6000);
};

// --- BLOK NYASAR YANG BIKIN BLANK SUDAH DICABUT ---

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

// --- LOGIKA NOTIFIKASI (YANG BENAR & AMAN) ---
const listenToNotifications = async () => {
  if (notificationChannel) supabase.removeChannel(notificationChannel);

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return;

  notificationChannel = supabase
    .channel("global-alerts")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${authUser.id}`,
      },
      async (payload) => {
        const notif = payload.new;
        let pathTujuan = "/notifications";

        try {
          if (
            notif.title.includes("FOLLOW") ||
            notif.title.includes("FOLLBACK")
          ) {
            const { data: sender } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", notif.from_user_id)
              .single();
            if (sender) pathTujuan = `/user/${sender.username}`;
          } else if (notif.related_id) {
            pathTujuan = `/product/${notif.related_id}`;
          }
        } catch (err) {
          console.error("GPS Error:", err);
        }

        // PANGGIL TOAST
        showToast(notif.title, notif.message, pathTujuan);
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

const closeNotice = () => {
  showNotice.value = false;
  sessionStorage.setItem("tokber_notice_seen", "true");
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

  const hasSeenNotice = sessionStorage.getItem("tokber_notice_seen");
  if (!hasSeenNotice) {
    showNotice.value = true;
  }
});
</script>

<template>
  <div
    v-if="showNotice"
    class="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
  >
    <div
      class="bg-[#0d0d0d] border-2 border-yellow-500 w-full max-w-md rounded-[32px] p-8 shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center"
    >
      <div
        class="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <span class="text-3xl">🚧</span>
      </div>

      <h2
        class="text-xl font-[1000] italic uppercase tracking-tighter text-white mb-4"
      >
        Under <span class="text-yellow-500">Development</span>
      </h2>

      <div class="space-y-4 text-left mb-8">
        <p
          class="text-[11px] text-gray-400 font-bold uppercase italic leading-relaxed"
        >
          Web ini sedang dalam tahap pengembangan untuk menguji stabilitas
          sistem <span class="text-yellow-500">Real-time Bidding</span>.
        </p>

        <ul class="space-y-2">
          <li
            class="text-[10px] text-gray-300 font-bold uppercase italic flex gap-2"
          >
            <span class="text-yellow-500">✓</span> Fitur BID bebas digunakan
            untuk testing.
          </li>
          <li
            class="text-[10px] text-gray-300 font-bold uppercase italic flex gap-2"
          >
            <span class="text-yellow-500">✓</span> Belum ada Payment Gateway
            (Simulasi).
          </li>
          <li
            class="text-[10px] text-gray-300 font-bold uppercase italic flex gap-2"
          >
            <span class="text-yellow-500">✓</span> Beberapa menu masih tahap
            pengerjaan.
          </li>
        </ul>
      </div>

      <button
        @click="closeNotice"
        class="w-full bg-yellow-500 text-black py-4 rounded-2xl font-[1000] uppercase italic tracking-widest hover:bg-yellow-400 transition-all transform active:scale-95"
      >
        I Understand, Let's GO!
      </button>
    </div>
  </div>
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

    <transition
      enter-active-class="duration-500 ease-out"
      enter-from-class="-translate-y-20 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="duration-300 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="-translate-y-20 opacity-0 scale-95"
    >
      <div
        v-if="customToast"
        @click="
          router.push(customToast.targetPath);
          customToast = null;
        "
        class="fixed top-4 inset-x-0 z-[9999] flex justify-center px-6 pointer-events-auto cursor-pointer"
      >
        <div
          class="bg-black border px-5 py-2.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-4 min-w-[220px] max-w-sm transition-all border-white/10 group active:scale-95"
          :class="
            customToast.title.includes('OUTBID')
              ? 'border-red-500/50 shadow-red-500/20'
              : 'border-yellow-500/50 shadow-yellow-500/20'
          "
        >
          <div
            class="w-2.5 h-2.5 rounded-full animate-pulse"
            :class="
              customToast.title.includes('OUTBID')
                ? 'bg-red-500'
                : 'bg-yellow-500'
            "
          ></div>

          <div class="flex flex-col overflow-hidden">
            <span
              class="text-[9px] font-black uppercase italic leading-none tracking-[0.1em]"
              :class="
                customToast.title.includes('OUTBID')
                  ? 'text-red-500'
                  : 'text-yellow-500'
              "
            >
              {{ customToast.title }}
            </span>
            <span
              class="text-[11px] font-bold text-white truncate italic mt-0.5"
            >
              {{ customToast.message }}
            </span>
          </div>

          <div
            class="ml-auto pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </transition>

    <div class="bg-black min-h-screen">
      <Header
        v-if="!$route.meta.requiresAdmin"
        :userProfile="userProfile"
        :authReady="authReady"
        class="fixed top-0 inset-x-0 z-[100]"
      />

      <main class="relative">
        <router-view
          v-if="authReady"
          :userProfile="userProfile"
          :key="$route.fullPath"
        />
      </main>
    </div>

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
