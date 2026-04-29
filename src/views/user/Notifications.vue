<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  UserIcon,
  TrashIcon,
  TrophyIcon,
  CheckIcon,
} from "@heroicons/vue/24/outline";
import { notify } from "../../utils/notify.js";

const router = useRouter();
const activeTab = ref("activity");
const loading = ref(true);
const notifications = ref({
  activity: [],
  wins: [],
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

    // 1. Filter Kategori WINS (Harta Karun)
    notifications.value.wins = data.filter(
      (n) => n.title?.includes("WINNER") || n.title?.includes("FALLBACK"),
    );

    // 2. Filter Kategori ACTIVITY (Bids, Follows, dll)
    // Biar gak double, kita exclude yang sudah masuk ke WINS
    notifications.value.activity = data.filter(
      (n) =>
        (n.type === "activity" || !n.type) &&
        !n.title?.includes("WINNER") &&
        !n.title?.includes("FALLBACK"),
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

  // Cek kalau judulnya mengandung kata WINNER (Sesuai RPC CRON kita)
  if (notif.title.includes("WINNER") || notif.title.includes("FALLBACK")) {
    router.push(`/product/${notif.related_id}?action=checkout`);
    // Arahkan langsung ke produk
  } else if (
    notif.title.includes("FOLLOW") ||
    notif.title.includes("FOLLBACK")
  ) {
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
const isEditMode = ref(false); // Buat munculin checkbox
const selectedIds = ref([]); // Nampung ID yang mau dihapus manual

// FUNGSI 1: Hapus Semua yang SUDAH DIBACA
const deleteAllRead = async () => {
  const readIds = notifications.value[activeTab.value]
    .filter((n) => n.is_read)
    .map((n) => n.id);

  if (readIds.length === 0)
    return notify.warn("Kosong", "Gak ada notif yang sudah dibaca.");

  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", readIds);

    if (error) throw error;

    // Update UI Lokal
    notifications.value[activeTab.value] = notifications.value[
      activeTab.value
    ].filter((n) => !readIds.includes(n.id));
    notify.success("Bersih!", "Semua notif terbaca sudah dibuang.");
  } catch (err) {
    notify.error("Error", err.message);
  }
};

// FUNGSI 2: Hapus yang Dipilih Manual
const deleteSelected = async () => {
  if (selectedIds.value.length === 0) return;

  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", selectedIds.value); // Hapus semua ID yang ada di list

    if (error) throw error;

    // Hapus dari tampilan
    notifications.value[activeTab.value] = notifications.value[
      activeTab.value
    ].filter((n) => !selectedIds.value.includes(n.id));

    selectedIds.value = [];
    isEditMode.value = false;
    notify.success("Cleaned!", "Notifikasi terpilih berhasil dimusnahkan.");
  } catch (err) {
    console.error("Delete Error:", err.message);
    notify.error("Gagal Hapus", "Database menolak perintah delete. Cek RLS!");
  }
};

const toggleSelect = (id) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id);
  } else {
    selectedIds.value.push(id);
  }
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
    <div class="flex items-center justify-between px-2 gap-4">
      <div class="flex items-baseline gap-3">
        <h2
          class="text-xl md:text-2xl font-[1000] italic uppercase tracking-tighter text-white whitespace-nowrap"
        >
          System <span class="text-yellow-500">Alerts</span>
        </h2>
        <span
          class="hidden sm:block text-[9px] font-black italic uppercase text-gray-600 tracking-widest border-l border-white/10 pl-3"
        >
          Recent Log
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="
            isEditMode = !isEditMode;
            selectedIds = [];
          "
          class="flex items-center justify-center h-9 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
        >
          <span
            class="text-[10px] font-[1000] uppercase italic text-gray-400 leading-none"
          >
            {{ isEditMode ? "Cancel" : "Edit" }}
          </span>
        </button>

        <button
          @click="deleteAllRead"
          class="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all active:scale-95"
          title="Clear Read"
        >
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <transition enter-active-class="animate-slideDown">
      <div v-if="isEditMode" class="px-2">
        <button
          @click="deleteSelected"
          :disabled="selectedIds.length === 0"
          class="w-full py-4 rounded-2xl bg-red-600 text-white font-[1000] italic uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-red-900/20"
        >
          Terminate Selected ({{ selectedIds.length }})
        </button>
      </div>
    </transition>

    <div
      class="flex gap-1.5 bg-white/5 p-1 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar mb-8"
    >
      <button
        v-for="tab in ['activity', 'wins', 'support', 'broadcast']"
        :key="tab"
        @click="activeTab = tab"
        :class="[
          activeTab === tab
            ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]'
            : 'text-gray-500 hover:text-gray-300',
          'flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-[1000] uppercase italic transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-fit',
        ]"
      >
        <component
          :is="
            tab === 'activity'
              ? BellIcon
              : tab === 'wins'
                ? TrophyIcon
                : tab === 'support'
                  ? ChatBubbleLeftRightIcon
                  : MegaphoneIcon
          "
          class="w-3.5 h-3.5"
        />

        <span>
          {{
            tab === "broadcast" ? "Updates" : tab === "wins" ? "Your Wins" : tab
          }}
        </span>

        <div
          v-if="tab === 'wins' && notifications.wins.some((n) => !n.is_read)"
          class="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"
        ></div>
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
        @click="isEditMode ? toggleSelect(notif.id) : handleAction(notif)"
        :class="[
          // AKSEN GARIS SAMPING (Tetep Minimalis)
          notif.title.includes('WINNER')
            ? 'border-l-yellow-500 bg-yellow-500/5'
            : notif.title.includes('FALLBACK')
              ? 'border-l-orange-500 bg-orange-500/5'
              : notif.title.includes('OUTBID')
                ? 'border-l-red-500 bg-red-500/5'
                : 'border-l-white/10 bg-white/[0.02]',

          // EFEK SAAT DIPILIH
          selectedIds.includes(notif.id)
            ? 'bg-white/10 ring-1 ring-inset ring-white/20'
            : '',

          // TRANSISI HALUS SAAT MASUK MODE EDIT
          isEditMode ? 'pl-14' : 'pl-4',
        ]"
        class="relative group border-y border-r border-white/5 pr-4 py-4 rounded-r-2xl transition-all duration-300 cursor-pointer mb-3 overflow-hidden"
      >
        <transition
          enter-active-class="duration-300 ease-out translate-x-0"
          leave-active-class="duration-200 ease-in -translate-x-10"
        >
          <div
            v-if="isEditMode"
            class="absolute left-4 top-1/2 -translate-y-1/2 z-20"
          >
            <div
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300"
              :class="
                selectedIds.includes(notif.id)
                  ? 'bg-yellow-500 border-yellow-500'
                  : 'border-white/20 bg-black/50'
              "
            >
              <CheckIcon
                v-if="selectedIds.includes(notif.id)"
                class="w-4 h-4 text-black stroke-[4px]"
              />
            </div>
          </div>
        </transition>

        <div class="flex gap-4 items-center">
          <div
            class="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5"
          >
            <img
              v-if="notif.image_url"
              :src="notif.image_url"
              class="w-full h-full object-cover"
            />
            <img
              v-else-if="notif.sender?.avatar_url"
              :src="notif.sender.avatar_url"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <TrophyIcon
                v-if="
                  notif.title.includes('WINNER') ||
                  notif.title.includes('FALLBACK')
                "
                class="w-5 h-5 text-yellow-500/50"
              />
              <UserIcon v-else class="w-5 h-5 text-gray-700" />
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <p
                class="text-[9px] font-black uppercase italic tracking-wider truncate pr-2"
                :class="[
                  notif.title.includes('OUTBID')
                    ? 'text-red-500'
                    : notif.title.includes('FALLBACK')
                      ? 'text-orange-500'
                      : 'text-yellow-500',
                ]"
              >
                {{ notif.title }}
              </p>
              <span
                class="text-[8px] text-gray-600 font-bold uppercase italic whitespace-nowrap pt-0.5"
              >
                {{ timeAgo(notif.created_at) }}
              </span>
            </div>

            <p
              class="text-[11px] text-gray-300 font-bold uppercase italic leading-tight mt-0.5 line-clamp-2"
            >
              {{ notif.message }}
            </p>
          </div>

          <div
            v-if="!notif.is_read && !isEditMode"
            class="flex-shrink-0 w-1.5 h-1.5 rounded-full"
            :class="
              notif.title.includes('OUTBID') ? 'bg-red-500' : 'bg-yellow-500'
            "
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
