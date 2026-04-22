<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const activeTab = ref("activity");
const loading = ref(true);
const notifications = ref({
  activity: [],
  support: [],
  broadcast: [],
});

let notifSubscription = null;

const fetchNotifications = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Kelompokkan data ke masing-masing tab
    notifications.value.activity = data.filter((n) => n.type === "activity");
    notifications.value.support = data.filter((n) => n.type === "support");
    notifications.value.broadcast = data.filter((n) => n.type === "broadcast");
  } catch (err) {
    console.error("Error fetch notif:", err.message);
  } finally {
    loading.value = false;
  }
};

const handleAction = async (notif) => {
  // 1. Tandai sudah dibaca di DB
  if (!notif.is_read) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notif.id);
  }

  // 2. Arahkan ke link terkait (misal ke halaman produk)
  if (notif.related_id) {
    router.push(`/product/${notif.related_id}`);
  }
};

// Fungsi format waktu simpel (biar mirip UI Mas "2 mins ago")
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return "just now";
};

onMounted(() => {
  fetchNotifications();

  // REALTIME: Dengerin kalau ada notif baru masuk atau ada yang di-update
  notifSubscription = supabase
    .channel("realtime-notif-page")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      () => fetchNotifications(),
    )
    .subscribe();
});

onUnmounted(() => {
  if (notifSubscription) supabase.removeChannel(notifSubscription);
});
</script>

<template>
  <div class="p-6 space-y-6 pt-24 pb-32">
    <div class="flex items-center justify-between">
      <h2
        class="text-2xl font-[1000] italic uppercase tracking-tighter text-white"
      >
        System <span class="text-yellow-500">Alerts</span>
      </h2>
    </div>

    <div class="flex gap-2 bg-white/5 p-1 rounded-2xl w-full md:w-fit">
      <button
        @click="activeTab = 'activity'"
        :class="
          activeTab === 'activity'
            ? 'bg-yellow-500 text-black'
            : 'text-gray-500'
        "
        class="flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
      >
        <BellIcon class="w-3 h-3" /> Activity
      </button>
      <button
        @click="activeTab = 'support'"
        :class="
          activeTab === 'support' ? 'bg-yellow-500 text-black' : 'text-gray-500'
        "
        class="flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
      >
        <ChatBubbleLeftRightIcon class="w-3 h-3" /> Support
      </button>
      <button
        @click="activeTab = 'broadcast'"
        :class="
          activeTab === 'broadcast'
            ? 'bg-yellow-500 text-black'
            : 'text-gray-500'
        "
        class="flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
      >
        <MegaphoneIcon class="w-3 h-3" /> Updates
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-if="loading && notifications[activeTab].length === 0"
        class="py-20 text-center animate-pulse"
      >
        <p
          class="text-[10px] font-black uppercase tracking-widest text-gray-600 italic"
        >
          Synchronizing Logs...
        </p>
      </div>

      <div
        v-for="notif in notifications[activeTab]"
        :key="notif.id"
        @click="handleAction(notif)"
        :class="[
          notif.is_read
            ? 'border-white/5'
            : 'border-yellow-500/30 bg-yellow-500/5',
        ]"
        class="bg-[#0d0d0d] border p-4 rounded-[24px] hover:border-yellow-500/50 transition-all cursor-pointer"
      >
        <div class="flex justify-between items-start">
          <div>
            <p
              class="text-[10px] font-black text-yellow-500 uppercase italic tracking-widest flex items-center gap-2"
            >
              <span
                v-if="!notif.is_read"
                class="w-1 h-1 bg-yellow-500 rounded-full"
              ></span>
              {{ notif.title }}
            </p>
            <p class="text-xs text-gray-300 font-bold mt-1 uppercase italic">
              {{ notif.message }}
            </p>
          </div>
          <span
            class="text-[8px] text-gray-600 font-bold italic uppercase whitespace-nowrap ml-4"
          >
            {{ timeAgo(notif.created_at) }}
          </span>
        </div>
      </div>

      <div
        v-if="!loading && notifications[activeTab].length === 0"
        class="py-20 text-center opacity-20"
      >
        <p class="text-[10px] font-black uppercase tracking-[0.5em] italic">
          No {{ activeTab }} Logs Found
        </p>
      </div>
    </div>
  </div>
</template>
