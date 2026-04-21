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

const markAsRead = async () => {
  if (!currentUser.value || !targetId) return;
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("receiver_id", currentUser.value.id)
    .eq("sender_id", targetId)
    .eq("is_read", false);
};

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();
    targetProfile.value = profile;

    const { data: msgData, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.value.id})`)
      .order("created_at", { ascending: true });

    if (error) throw error;
    messages.value = msgData || [];
    loading.value = false;
    scrollToBottom();
    markAsRead();

    // --- KUNCI PERBAIKAN: NGINTIP CHANNEL GLOBAL ---
    // Gunakan channel yang sama dengan App.vue tapi JANGAN pakai track()
    const presenceChannel = supabase.channel("global-presence");

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        isTargetOnline.value = !!state[targetId];
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        if (newPresences.some(p => p.presence_ref.includes(targetId))) {
          isTargetOnline.value = true;
        }
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        if (leftPresences.some(p => p.presence_ref.includes(targetId))) {
          isTargetOnline.value = false;
        }
      })
      .subscribe();

    // --- REALTIME PESAN (TIDAK BERUBAH) ---
    const roomID = [currentUser.value.id, targetId].sort().join("_");
    const msgChannel = supabase.channel(`chat_${roomID}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const newMsg = payload.new;
          if ((newMsg.sender_id === currentUser.value.id && newMsg.receiver_id === targetId) || 
              (newMsg.sender_id === targetId && newMsg.receiver_id === currentUser.value.id)) {
            messages.value.push(newMsg);
            scrollToBottom();
            if (newMsg.receiver_id === currentUser.value.id) markAsRead();
          }
      })
      .subscribe();

    return { presenceChannel, msgChannel };
  } catch (error) {
    console.error("Chat Error:", error);
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  const textToSend = newMessage.value;
  newMessage.value = "";
  try {
    await supabase.from("messages").insert({
      sender_id: currentUser.value.id,
      receiver_id: targetId,
      text: textToSend,
      is_read: false
    });
  } catch (error) {
    notify.error("Fail", "Transmission error.");
  }
};

let subs;
onMounted(async () => {
  subs = await fetchChatData();
});

onUnmounted(() => {
  if (subs) {
    supabase.removeChannel(subs.presenceChannel);
    supabase.removeChannel(subs.msgChannel);
  }
});
</script>

<template>
  <div class="fixed inset-0 z-[999] bg-[#050505] flex justify-center overflow-hidden overscroll-none">
    
    <div class="relative w-full max-w-2xl bg-[#0a0a0a] flex flex-col h-full border-x border-white/5 shadow-2xl">
      
      <header class="h-16 shrink-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.back()" class="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-400 active:scale-90">
            <ArrowLeftIcon class="w-5 h-5" />
          </button>

          <div v-if="targetProfile" @click="goToPublicProfile" class="flex items-center gap-3 cursor-pointer group">
            <div class="w-10 h-10 rounded-full overflow-hidden border bg-black shadow-lg"
                 :class="isTargetOnline ? 'border-green-500' : 'border-white/10'">
              <img v-if="targetProfile.avatar_url" :src="targetProfile.avatar_url" class="w-full h-full object-cover" />
              <UserCircleIcon v-else class="w-full h-full text-gray-800 p-1" />
            </div>
            <div>
              <h2 class="text-[11px] font-[1000] text-white uppercase italic leading-none mb-1 group-hover:text-yellow-500 transition-colors">
                {{ targetProfile.full_name || targetProfile.username }}
              </h2>
              <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full" :class="isTargetOnline ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-gray-700'"></div>
                <p class="text-[7px] font-black uppercase tracking-widest" :class="isTargetOnline ? 'text-green-500' : 'text-gray-600'">
                  {{ isTargetOnline ? "Online" : "Offline" }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <ShieldCheckIcon class="w-5 h-5 opacity-20 text-yellow-500" />
      </header>

      <main 
        ref="chatContainer" 
        class="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar overscroll-contain bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent"
      >
        <div v-if="loading" class="flex justify-center py-20">
          <ArrowPathIcon class="w-8 h-8 animate-spin text-yellow-500/50" />
        </div>

        <template v-else>
          <div v-for="msg in messages" :key="msg.id"
            :class="msg.sender_id === currentUser.id ? 'flex-row-reverse' : ''"
            class="flex items-end gap-2"
          >
            <div :class="msg.sender_id === currentUser.id 
                 ? 'bg-yellow-500 text-black rounded-tr-none shadow-[0_4px_15px_rgba(234,179,8,0.15)]' 
                 : 'bg-white/[0.03] text-white border border-white/5 rounded-tl-none'"
                 class="max-w-[85%] px-4 py-3 rounded-[22px] relative">
              <p class="text-[11px] font-bold italic leading-relaxed">{{ msg.text }}</p>
              <div class="flex items-center justify-end gap-1 mt-1.5">
                <p class="text-[6px] opacity-40 uppercase font-black tracking-tighter">
                  {{ new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }}
                </p>
                <div v-if="msg.sender_id === currentUser.id" class="text-[8px] opacity-40">
                   {{ msg.is_read ? '✓✓' : '✓' }}
                </div>
              </div>
            </div>
          </div>
        </template>
        <div class="h-2 w-full shrink-0"></div>
      </main>

      <footer class="shrink-0 p-4 bg-[#0a0a0a] border-t border-white/5 pb-safe">
        <div class="relative flex items-center max-w-3xl mx-auto w-full">
          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="KETIK PESAN..."
            class="w-full bg-black border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-[10px] outline-none focus:border-yellow-500/50 font-black italic text-white"
          />
          <button @click="sendMessage" :disabled="!newMessage.trim()" 
            class="absolute right-2 bg-yellow-500 text-black p-2.5 rounded-xl active:scale-90 shadow-lg">
            <PaperAirplaneIcon class="w-5 h-5" />
          </button>
        </div>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.fixed {
  height: 100vh;
  height: -webkit-fill-available;
}
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.overscroll-none { overscroll-behavior: none; }
.overscroll-contain { overscroll-behavior-y: contain; }
.pb-safe {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}
</style>
