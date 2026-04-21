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
const isTargetOnline = ref(false);

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

// --- FUNGSI UNTUK MEMBERSIHKAN NOTIFIKASI (is_read = true) ---
const markAsRead = async () => {
  if (!currentUser.value || !targetId) return;

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("receiver_id", currentUser.value.id)
    .eq("sender_id", targetId)
    .eq("is_read", false);

  if (error) console.error("Gagal update status baca:", error.message);
};

// --- FUNGSI REDIRECT KE PROFIL PUBLIK ---
const goToPublicProfile = () => {
  if (targetProfile.value?.username) {
    router.push(`/user/${targetProfile.value.username}`);
  }
};

const fetchChatData = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");
    currentUser.value = session.user;

    // Ambil Profil Target
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();
    targetProfile.value = profile;

    // Ambil Pesan
    const { data: msgData, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.value.id})`)
      .order("created_at", { ascending: true });

    if (error) throw error;
    messages.value = msgData || [];
    loading.value = false;
    scrollToBottom();

    // Jalankan markAsRead setelah pesan di-load
    markAsRead();

    const channel = supabase.channel(`room_${targetId}`, {
      config: { presence: { key: currentUser.value.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        isTargetOnline.value = !!state[targetId];
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const newMsg = payload.new;
          if ((newMsg.sender_id === currentUser.value.id && newMsg.receiver_id === targetId) || 
              (newMsg.sender_id === targetId && newMsg.receiver_id === currentUser.value.id)) {
            messages.value.push(newMsg);
            scrollToBottom();
            
            // Jika ada pesan masuk saat kita di dalam room, tandai sudah baca
            if (newMsg.receiver_id === currentUser.value.id) {
              markAsRead();
            }
          }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
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
      is_read: false // Default false saat dikirim
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
  <div class="fixed inset-0 bg-[#050505] flex justify-center overflow-hidden touch-none pt-16 md:pt-20">
    <div class="relative w-full max-w-2xl bg-[#0a0a0a] md:border-x border-white/5 flex flex-col h-full shadow-2xl">
      
      <header class="shrink-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.back()" class="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-500 active:scale-90">
            <ArrowLeftIcon class="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <div v-if="targetProfile" @click="goToPublicProfile" class="flex items-center gap-3 cursor-pointer group active:opacity-70 transition-all">
            <div class="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border bg-black shadow-lg transition-colors"
                 :class="isTargetOnline ? 'border-green-500/50' : 'border-white/10 group-hover:border-yellow-500/50'">
              <img v-if="targetProfile.avatar_url" :src="targetProfile.avatar_url" class="w-full h-full object-cover" />
              <UserCircleIcon v-else class="w-full h-full text-gray-800 p-1" />
            </div>
            <div>
              <h2 class="text-[10px] md:text-xs font-[1000] text-white uppercase italic leading-none mb-1 group-hover:text-yellow-500 transition-colors">
                {{ targetProfile.full_name || targetProfile.username }}
              </h2>
              <div class="flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full" :class="isTargetOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-700'"></div>
                <p class="text-[6px] font-black uppercase tracking-widest" :class="isTargetOnline ? 'text-green-500' : 'text-gray-600'">
                  {{ isTargetOnline ? "Online" : "Offline" }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <ShieldCheckIcon class="w-4 h-4 md:w-5 md:h-5 opacity-20 text-yellow-500" />
      </header>

      <main ref="chatContainer" class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 no-scrollbar touch-pan-y">
        <div v-if="loading" class="flex justify-center py-10">
          <ArrowPathIcon class="w-8 h-8 animate-spin text-yellow-500" />
        </div>

        <template v-else>
          <div v-for="msg in messages" :key="msg.id"
            :class="msg.sender_id === currentUser.id ? 'flex-row-reverse' : ''"
            class="flex items-end gap-2"
          >
            <div :class="msg.sender_id === currentUser.id 
                 ? 'bg-yellow-500 text-black rounded-tr-none' 
                 : 'bg-white/[0.03] text-white border border-white/5 rounded-tl-none'"
                 class="max-w-[80%] px-4 py-3 rounded-2xl shadow-lg">
              <p class="text-[11px] normal-case font-bold italic leading-relaxed">{{ msg.text }}</p>
              <p class="text-[6px] opacity-30 mt-1.5 text-right uppercase font-black">
                {{ new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }}
              </p>
            </div>
          </div>
        </template>
        <div class="h-4 w-full shrink-0"></div>
      </main>

      <footer class="p-4 md:p-6 bg-[#0a0a0a] border-t border-white/5 shrink-0 pb-6 md:pb-8">
        <div class="relative flex items-center">
          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="KETIK PESAN..."
            class="w-full bg-black border border-white/10 rounded-xl py-4 pl-5 pr-14 text-[10px] outline-none focus:border-yellow-500/40 font-black italic text-white"
          />
          <button @click="sendMessage" :disabled="!newMessage.trim()" 
            class="absolute right-1.5 bg-yellow-500 text-black p-2.5 rounded-lg active:scale-90">
            <PaperAirplaneIcon class="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
