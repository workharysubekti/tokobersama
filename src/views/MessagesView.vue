<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  UserCircleIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const loading = ref(true);
const chatList = ref([]);
const currentUser = ref(null);

const fetchChatList = async () => {
  loading.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return router.push("/login");
    currentUser.value = session.user;

    // QUERY FIX: Menggunakan sintaks relasi yang benar setelah Foreign Key dibuat
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:profiles!sender_id(id, username, full_name, avatar_url),
        receiver:profiles!receiver_id(id, username, full_name, avatar_url)
      `,
      )
      .or(
        `sender_id.eq.${currentUser.value.id},receiver_id.eq.${currentUser.value.id}`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Query Error:", error);
      throw error;
    }

    const uniqueChatsMap = new Map();

    if (data) {
      data.forEach((msg) => {
        // Tentukan siapa lawan bicaranya
        const otherUser =
          msg.sender_id === currentUser.value.id ? msg.receiver : msg.sender;
        const otherUserId =
          msg.sender_id === currentUser.value.id
            ? msg.receiver_id
            : msg.sender_id;

        if (otherUserId && !uniqueChatsMap.has(otherUserId)) {
          uniqueChatsMap.set(otherUserId, {
            lastMessage: msg.text,
            time: msg.created_at,
            user: otherUser || {
              id: otherUserId,
              username: "Unknown",
              full_name: "External User",
            },
            isRead: msg.sender_id === currentUser.value.id ? true : msg.is_read,
          });
        }
      });
    }

    chatList.value = Array.from(uniqueChatsMap.values());
  } catch (err) {
    console.error("Critical Inbox Error Detail:", err);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

onMounted(fetchChatList);
</script>

<template>
  <div
    class="min-h-screen bg-[#050505] text-white font-sans uppercase italic font-black flex justify-center overflow-hidden"
  >
    <div
      class="relative w-full max-w-2xl bg-[#0a0a0a] border-x border-white/5 flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]"
    >
      <div class="px-8 pt-24 pb-10 shrink-0">
        <div class="flex items-center gap-4 mb-4">
          <button
            @click="router.back()"
            class="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-black"
          >
            <ArrowLeftIcon class="w-5 h-5 text-gray-400" />
          </button>
          <h1 class="text-2xl tracking-tighter italic uppercase">
            COMMS <span class="text-yellow-500">CENTER</span>
          </h1>
        </div>
        <p class="text-[8px] text-gray-700 tracking-[0.5em] uppercase italic">
          Connection: Secured
        </p>
      </div>

      <div class="flex-1 overflow-y-auto px-6 no-scrollbar pb-32">
        <div v-if="!loading">
          <div v-if="chatList.length > 0" class="space-y-3">
            <div
              v-for="chat in chatList"
              :key="chat.user.id"
              @click="router.push(`/messages/${chat.user.id}`)"
              class="group flex items-center bg-white/[0.02] border border-white/[0.03] rounded-[30px] p-5 hover:border-yellow-500/30 hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <div class="relative shrink-0">
                <div
                  class="w-16 h-16 rounded-full overflow-hidden border-2 border-white/5 bg-black"
                >
                  <img
                    v-if="chat.user?.avatar_url"
                    :src="chat.user.avatar_url"
                    class="w-full h-full object-cover"
                  />
                  <UserCircleIcon
                    v-else
                    class="w-full h-full text-gray-900 p-1"
                  />
                </div>
                <div
                  v-if="!chat.isRead"
                  class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 border-4 border-[#0a0a0a] rounded-full animate-pulse"
                ></div>
              </div>

              <div class="flex-1 ml-5 overflow-hidden">
                <div
                  class="flex justify-between items-center mb-1 uppercase italic font-black"
                >
                  <h3
                    class="text-[11px] group-hover:text-yellow-500 truncate tracking-tight"
                  >
                    {{ chat.user?.full_name || chat.user?.username }}
                  </h3>
                  <span class="text-[7px] text-gray-700 font-bold">{{
                    formatDate(chat.time)
                  }}</span>
                </div>
                <p
                  class="text-[10px] text-gray-500 truncate normal-case font-bold opacity-60 italic leading-tight"
                >
                  {{ chat.lastMessage }}
                </p>
              </div>
              <ChevronRightIcon
                class="w-5 h-5 text-gray-900 ml-4 group-hover:text-yellow-500 transition-all group-hover:translate-x-1"
              />
            </div>
          </div>

          <div v-else class="py-32 text-center opacity-30">
            <ChatBubbleLeftRightIcon class="w-12 h-12 mx-auto mb-4" />
            <p class="text-[9px] tracking-[0.4em]">NO TRANSMISSIONS FOUND</p>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-48">
          <ArrowPathIcon
            class="w-10 h-10 text-yellow-500 animate-spin opacity-50"
          />
          <p class="text-[9px] mt-4 tracking-[0.2em]">DECRYPTING...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
