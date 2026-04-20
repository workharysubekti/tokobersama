<script setup>
import { ref, watch } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { ChatBubbleLeftRightIcon, ArrowPathIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(true);
const chatList = ref([]);

const fetchChatList = async () => {
  if (!props.userProfile?.id) return;
  loading.value = true;
  
  const { data } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!sender_id(id, username, full_name, avatar_url),
      receiver:profiles!receiver_id(id, username, full_name, avatar_url)
    `)
    .or(`sender_id.eq.${props.userProfile.id},receiver_id.eq.${props.userProfile.id}`)
    .order("created_at", { ascending: false });

  if (data) {
    const uniqueChatsMap = new Map();
    data.forEach((msg) => {
      const isSender = msg.sender_id === props.userProfile.id;
      const otherUser = isSender ? msg.receiver : msg.sender;
      if (otherUser && !uniqueChatsMap.has(otherUser.id)) {
        uniqueChatsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.text,
          time: msg.created_at,
        });
      }
    });
    chatList.value = Array.from(uniqueChatsMap.values());
  }
  loading.value = false;
};

// Pantau userProfile, kalau sudah ada (login), baru tarik chat
watch(() => props.userProfile, (newVal) => {
  if (newVal) fetchChatList();
  else if (newVal === null) router.push("/login"); // Belum login? Tendang
}, { immediate: true });
</script>

<template>
  <div class="min-h-screen bg-black text-white pt-24 pb-32 px-6">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-4xl font-[1000] italic uppercase tracking-tighter mb-10">Transmissions</h2>

      <div v-if="loading" class="flex justify-center py-20">
        <ArrowPathIcon class="w-8 h-8 text-yellow-500 animate-spin" />
      </div>

      <div v-else-if="chatList.length > 0" class="space-y-4">
        <div v-for="chat in chatList" :key="chat.user.id" 
             @click="router.push(`/messages/${chat.user.id}`)"
             class="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-[24px] hover:border-yellow-500/30 transition-all cursor-pointer group">
          <div class="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-gray-900">
            <img v-if="chat.user.avatar_url" :src="chat.user.avatar_url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-700 font-bold uppercase">{{ chat.user.username[0] }}</div>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-xs font-black uppercase italic text-white group-hover:text-yellow-500 transition-colors">{{ chat.user.full_name || chat.user.username }}</h3>
            <p class="text-[10px] text-gray-500 truncate mt-1 italic">{{ chat.lastMessage }}</p>
          </div>
          <ChevronRightIcon class="w-4 h-4 text-gray-700" />
        </div>
      </div>

      <div v-else class="py-20 text-center border-2 border-dashed border-white/5 rounded-[32px]">
        <ChatBubbleLeftRightIcon class="w-10 h-10 text-gray-800 mx-auto mb-4" />
        <p class="text-[8px] font-black uppercase tracking-widest text-gray-600">No active signals found</p>
      </div>
    </div>
  </div>
</template>
