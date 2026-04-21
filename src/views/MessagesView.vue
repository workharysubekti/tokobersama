<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { usePresenceStore } from "../store/presence.js"; // Import Store Online
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const presenceStore = usePresenceStore(); // Pakai Pinia
const loading = ref(true);
const chatList = ref([]);

// Fungsi Ambil Data Chat
const fetchChatList = async () => {
  if (!props.userProfile?.id) return;
  if (!isSilent) loading.value = true;

  const { data } = await supabase
    .from("messages")
    .select(
      `
      *,
      sender:profiles!sender_id(id, username, full_name, avatar_url),
      receiver:profiles!receiver_id(id, username, full_name, avatar_url)
    `,
    )
    .or(
      `sender_id.eq.${props.userProfile.id},receiver_id.eq.${props.userProfile.id}`,
    )
    .order("created_at", { ascending: false });

  if (data) {
    processChatList(data);
  }
  loading.value = false;
};

// Logika Mapping agar Chat tetap Unique dan urut Terbaru
const processChatList = (data) => {
  const uniqueChatsMap = new Map();
  data.forEach((msg) => {
    const isSender = msg.sender_id === props.userProfile.id;
    const otherUser = isSender ? msg.receiver : msg.sender;

    if (otherUser && !uniqueChatsMap.has(otherUser.id)) {
      uniqueChatsMap.set(otherUser.id, {
        user: otherUser,
        lastMessage: msg.text,
        time: msg.created_at,
        // LOGIC NOTIF: Jika kita penerima dan belum dibaca
        isUnread: !msg.is_read && msg.receiver_id === props.userProfile.id,
        senderId: msg.sender_id,
      });
    }
  });
  chatList.value = Array.from(uniqueChatsMap.values());
};

// --- LOGIC REAL-TIME INBOX ---
let inboxChannel = null;
const setupInboxRealtime = () => {
  if (!props.userProfile?.id) return;

  inboxChannel = supabase
    .channel("inbox-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        // Jika pesan melibatkan kita, refresh list
        if (
          payload.new.sender_id === props.userProfile.id ||
          payload.new.receiver_id === props.userProfile.id
        ) {
          fetchChatList(true); // Tarik ulang agar urutan & teks terakhir update otomatis
        }
      },
    )
    .subscribe();
};

watch(
  () => props.userProfile,
  (newVal) => {
    if (newVal) {
      fetchChatList();
      setupInboxRealtime();
    } else if (newVal === null) {
      router.push("/login");
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (inboxChannel) supabase.removeChannel(inboxChannel);
});
</script>

<template>
  <div class="min-h-screen bg-black text-white pt-24 pb-32 px-6">
    <div class="max-w-2xl mx-auto">
      <h2
        class="text-4xl font-[1000] italic uppercase tracking-tighter mb-10 text-white"
      >
        Transmissions
      </h2>

      <div v-if="loading" class="flex justify-center py-20">
        <ArrowPathIcon class="w-8 h-8 text-yellow-500 animate-spin" />
      </div>

      <div v-else-if="chatList.length > 0" class="space-y-4">
        <div
          v-for="chat in chatList"
          :key="chat.user.id"
          @click="router.push(`/messages/${chat.user.id}`)"
          class="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-[24px] hover:border-yellow-500/30 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div class="relative">
            <div
              class="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-gray-900 transition-all group-hover:border-yellow-500/50"
              :class="
                presenceStore.isUserOnline(chat.user.id)
                  ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                  : ''
              "
            >
              <img
                v-if="chat.user.avatar_url"
                :src="chat.user.avatar_url"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-gray-700 font-bold uppercase text-xs"
              >
                {{ chat.user.username[0] }}
              </div>
            </div>
            <div
              v-if="presenceStore.isUserOnline(chat.user.id)"
              class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"
            ></div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center mb-1">
              <h3
                class="text-[11px] font-black uppercase italic text-white group-hover:text-yellow-500 transition-colors"
              >
                {{ chat.user.full_name || chat.user.username }}
              </h3>
              <p class="text-[8px] font-bold text-gray-600 uppercase italic">
                {{
                  new Date(chat.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <p
                class="text-[10px] truncate italic flex-1"
                :class="
                  chat.isUnread ? 'text-white font-black' : 'text-gray-500'
                "
              >
                {{ chat.lastMessage }}
              </p>

              <div
                v-if="chat.isUnread"
                class="shrink-0 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444] animate-pulse"
              ></div>
            </div>
          </div>

          <ChevronRightIcon
            class="w-4 h-4 text-gray-700 group-hover:text-yellow-500 transition-colors"
          />
        </div>
      </div>

      <div
        v-else
        class="py-20 text-center border-2 border-dashed border-white/5 rounded-[32px]"
      >
        <ChatBubbleLeftRightIcon class="w-10 h-10 text-gray-800 mx-auto mb-4" />
        <p
          class="text-[8px] font-black uppercase tracking-widest text-gray-600"
        >
          No active signals found
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
