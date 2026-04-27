<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  UserIcon,
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
      .select(`*, sender:profiles!from_user_id (username, avatar_url)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    notifications.value.activity = data.filter(
      (n) => n.type === "activity" || !n.type,
    );
    notifications.value.support = data.filter((n) => n.type === "support");
    notifications.value.broadcast = data.filter((n) => n.type === "broadcast");
  } catch (err) {
    console.error("Error fetch notif:", err.message);
  } finally {
    loading.value = false;
  }
};

const handleAction = async (notif) => {
  if (!notif.is_read) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notif.id);
    notif.is_read = true;
  }

  if (notif.title.includes("FOLLOW") || notif.title.includes("FOLLBACK")) {
    if (notif.sender?.username) {
      router.push(`/user/${notif.sender.username}`);
    }
  } else if (notif.related_id) {
    router.push(`/product/${notif.related_id}`);
  }
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  let interval = seconds / 3600;
  if (interval > 24) return Math.floor(interval / 24) + " days ago";
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return "just now";
};

onMounted(() => {
  fetchNotifications();
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
  <div class="p-6 space-y-6 pt-12 pb-32">
    <div class="flex items-center justify-between">
      <h2
        class="text-2xl font-[1000] italic uppercase tracking-tighter text-white"
      >
        System <span class="text-yellow-500">Alerts</span>
      </h2>
    </div>

    <div
      class="flex gap-1.5 bg-white/5 p-1 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar"
    >
      <button
        v-for="tab in ['activity', 'support', 'broadcast']"
        :key="tab"
        @click="activeTab = tab"
        :class="
          activeTab === tab
            ? 'bg-yellow-500 text-black shadow-lg'
            : 'text-gray-500'
        "
        class="flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase italic transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-fit"
      >
        <component
          :is="
            tab === 'activity'
              ? BellIcon
              : tab === 'support'
                ? ChatBubbleLeftRightIcon
                : MegaphoneIcon
          "
          class="w-3.5 h-3.5"
        />
        {{ tab === "broadcast" ? "Updates" : tab }}
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
            ? 'border-white/5 opacity-60'
            : 'border-yellow-500/30 bg-yellow-500/[0.02] shadow-[0_0_20px_rgba(234,179,8,0.05)]',
        ]"
        class="bg-[#0d0d0d] border p-5 rounded-[28px] hover:border-yellow-500/50 transition-all cursor-pointer group"
      >
        <div class="flex gap-4 items-center">
          <div
            class="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 bg-black flex-shrink-0"
          >
            <img
              v-if="notif.sender?.avatar_url"
              :src="notif.sender.avatar_url"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-gray-900"
            >
              <UserIcon class="w-5 h-5 text-gray-700" />
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start mb-1">
              <p
                class="text-[10px] font-black text-yellow-500 uppercase italic tracking-widest truncate"
              >
                {{ notif.title }}
              </p>
              <span
                class="text-[8px] text-gray-600 font-bold italic uppercase whitespace-nowrap ml-4"
              >
                {{ timeAgo(notif.created_at) }}
              </span>
            </div>
            <p
              class="text-xs text-gray-300 font-bold uppercase italic leading-snug"
            >
              {{ notif.message }}
            </p>
          </div>

          <div
            v-if="!notif.is_read"
            class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_yellow]"
          ></div>
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

<style scoped>
/* Menghilangkan scrollbar tapi tetap bisa scroll di mobile */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
