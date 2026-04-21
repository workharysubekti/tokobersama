<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";

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
  if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
};

const markAsRead = async () => {
  if (!currentUser.value || !targetId) return;
  await supabase.from("messages").update({ is_read: true }).eq("receiver_id", currentUser.value.id).eq("sender_id", targetId).eq("is_read", false);
};

const fetchChatData = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return router.push("/login");
  currentUser.value = session.user;

  // 1. Ambil Profil & History
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", targetId).maybeSingle();
  targetProfile.value = profile;

  const { data: msgData } = await supabase.from("messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUser.value.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.value.id})`)
    .order("created_at", { ascending: true });

  messages.value = msgData || [];
  loading.value = false;
  scrollToBottom();
  markAsRead();

  // 2. MONITOR ONLINE (HANYA LISTEN, JANGAN TRACK!)
  const monitorChannel = supabase.channel("online-status-global");
  monitorChannel
    .on("presence", { event: "sync" }, () => {
      const state = monitorChannel.presenceState();
      isTargetOnline.value = !!state[targetId];
    })
    .subscribe();

  // 3. REALTIME PESAN (LOGIKA LAMA YANG AMAN)
  const msgChannel = supabase.channel('any') // Gunakan channel default agar tidak ada lock
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const n = payload.new;
      if ((n.sender_id === currentUser.value.id && n.receiver_id === targetId) || 
          (n.sender_id === targetId && n.receiver_id === currentUser.value.id)) {
        messages.value.push(n);
        scrollToBottom();
        if (n.receiver_id === currentUser.value.id) markAsRead();
      }
    })
    .subscribe();

  return { monitorChannel, msgChannel };
};

let subs;
onMounted(async () => { subs = await fetchChatData(); });
onUnmounted(() => {
  if (subs) {
    supabase.removeChannel(subs.monitorChannel);
    supabase.removeChannel(subs.msgChannel);
  }
});

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  const text = newMessage.value;
  newMessage.value = "";
  await supabase.from("messages").insert({ sender_id: currentUser.value.id, receiver_id: targetId, text: text });
};
</script>

<template>
  <div class="fixed inset-0 z-[9999] h-screen w-full bg-[#050505] flex flex-col overflow-hidden">
    <header class="h-16 shrink-0 bg-[#0a0a0a] border-b border-white/5 px-4 flex items-center gap-3">
      <button @click="router.back()" class="p-2 text-gray-400"><ArrowLeftIcon class="w-6 h-6" /></button>
      <div v-if="targetProfile" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full border" :class="isTargetOnline ? 'border-green-500' : 'border-white/10'">
          <img :src="targetProfile.avatar_url" class="w-full h-full rounded-full object-cover" />
        </div>
        <div>
          <h2 class="text-xs font-black text-white italic">{{ targetProfile.full_name }}</h2>
          <p class="text-[8px] font-bold" :class="isTargetOnline ? 'text-green-500' : 'text-gray-600'">
            {{ isTargetOnline ? 'ACTIVE' : 'OFFLINE' }}
          </p>
        </div>
      </div>
    </header>

    <main ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div v-for="msg in messages" :key="msg.id" :class="msg.sender_id === currentUser.id ? 'flex-row-reverse' : ''" class="flex items-end gap-2">
        <div :class="msg.sender_id === currentUser.id ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white border border-white/10'" class="max-w-[80%] px-4 py-2 rounded-2xl text-[11px] font-bold italic">
          {{ msg.text }}
        </div>
      </div>
    </main>

    <footer class="p-4 bg-[#0a0a0a] border-t border-white/5">
      <div class="relative flex items-center">
        <input v-model="newMessage" @keyup.enter="sendMessage" type="text" placeholder="KETIK PESAN..." class="w-full bg-black border border-white/10 rounded-xl py-4 pl-5 pr-14 text-[10px] text-white outline-none" />
        <button @click="sendMessage" class="absolute right-2 bg-yellow-500 p-2 rounded-lg text-black"><PaperAirplaneIcon class="w-5 h-5" /></button>
      </div>
    </footer>
  </div>
</template>
