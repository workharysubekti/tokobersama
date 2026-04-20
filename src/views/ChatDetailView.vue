<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify";
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const targetId = route.params.userId;

const loading = ref(true);
const messages = ref([]);
const newMessage = ref("");
const targetProfile = ref(null);
const currentUser = ref(null);
const chatContainer = ref(null);
const isTargetOnline = ref(false); // State status online

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const fetchChatData = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return router.push("/login");
    currentUser.value = session.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();
    targetProfile.value = profile;

    const { data: msgData, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.value.id})`,
      )
      .order("created_at", { ascending: true });

    if (error) throw error;
    messages.value = msgData || [];
    loading.value = false;
    scrollToBottom();

    // --- LOGIKA PRESENCE (TRACKER ONLINE) ---
    const channel = supabase.channel(`room_${targetId}`, {
      config: { presence: { key: currentUser.value.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // Cek apakah targetId ada di dalam daftar user yang sedang online di channel ini
        isTargetOnline.value = !!state[targetId];
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === currentUser.value.id &&
              newMsg.receiver_id === targetId) ||
            (newMsg.sender_id === targetId &&
              newMsg.receiver_id === currentUser.value.id)
          ) {
            messages.value.push(newMsg);
            scrollToBottom();
          }
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Daftarkan diri saya sebagai online di channel ini
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return channel;
  } catch (error) {
    console.error("Chat Error:", error);
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  const textToSend = newMessage.value;
  newMessage.value = "";

  try {
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.value.id,
      receiver_id: targetId,
      text: textToSend,
    });
    if (error) throw error;
  } catch (error) {
    notify.error("Fail", "Transmission error.");
  }
};

let messageSub;
onMounted(async () => {
  messageSub = await fetchChatData();
});

onUnmounted(() => {
  if (messageSub) supabase.removeChannel(messageSub);
});
</script>

<template>
  <div
    class="h-screen bg-[#050505] text-white font-sans italic font-black uppercase overflow-hidden flex justify-center pt-20"
  >
    <div
      class="relative w-full max-w-2xl bg-[#0a0a0a] border-x border-white/5 flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] mb-4 rounded-t-[30px]"
    >
      <div
        class="shrink-0 z-10 bg-[#0a0a0a] border-b border-white/5 px-6 py-4 flex items-center justify-between rounded-t-[30px]"
      >
        <div class="flex items-center gap-4">
          <button
            @click="router.back()"
            class="p-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-500 hover:text-yellow-500 transition-colors"
          >
            <ArrowLeftIcon class="w-5 h-5" />
          </button>

          <div v-if="targetProfile" class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full overflow-hidden border bg-black shadow-lg"
              :class="
                isTargetOnline ? 'border-green-500/50' : 'border-white/10'
              "
            >
              <img
                v-if="targetProfile.avatar_url"
                :src="targetProfile.avatar_url"
                class="w-full h-full object-cover"
              />
              <UserCircleIcon v-else class="w-full h-full text-gray-800 p-1" />
            </div>
            <div>
              <h2
                class="text-xs tracking-tight leading-none mb-1 text-white uppercase italic font-[1000]"
              >
                {{ targetProfile.full_name || targetProfile.username }}
              </h2>
              <div class="flex items-center gap-1">
                <div
                  class="w-1.5 h-1.5 rounded-full"
                  :class="
                    isTargetOnline
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-gray-700'
                  "
                ></div>
                <p
                  class="text-[7px] tracking-widest font-black uppercase"
                  :class="isTargetOnline ? 'text-green-500' : 'text-gray-600'"
                >
                  {{ isTargetOnline ? "Channel Active" : "Offline" }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <ShieldCheckIcon class="w-5 h-5 opacity-20" />
      </div>

      <div
        ref="chatContainer"
        class="flex-1 overflow-y-auto p-6 no-scrollbar scroll-smooth"
      >
        <div class="space-y-6">
          <div v-if="loading" class="flex justify-center py-20 text-yellow-500">
            <ArrowPathIcon class="w-8 h-8 animate-spin" />
          </div>

          <div
            v-else
            v-for="msg in messages"
            :key="msg.id"
            :class="msg.sender_id === currentUser.id ? 'flex-row-reverse' : ''"
            class="flex items-end gap-3"
          >
            <div
              :class="
                msg.sender_id === currentUser.id
                  ? 'bg-yellow-500 text-black rounded-2xl rounded-tr-none'
                  : 'bg-white/[0.03] text-white border border-white/5 rounded-2xl rounded-tl-none'
              "
              class="max-w-[85%] px-5 py-4"
            >
              <p
                class="text-[11px] normal-case font-bold italic tracking-tight leading-relaxed"
              >
                {{ msg.text }}
              </p>
              <p
                class="text-[6px] opacity-30 mt-2 text-right uppercase tracking-widest"
              >
                {{
                  new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 bg-[#0a0a0a] border-t border-white/5 pb-10">
        <div class="relative flex items-center">
          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="ENTER ENCRYPTED TRANSMISSION..."
            class="w-full bg-black border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-[10px] outline-none focus:border-yellow-500/40 font-[1000] italic text-white shadow-inner"
          />
          <button
            @click="sendMessage"
            :disabled="!newMessage.trim()"
            class="absolute right-2 bg-yellow-500 text-black px-5 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all"
          >
            <PaperAirplaneIcon class="w-5 h-5" />
          </button>
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
