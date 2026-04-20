<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { ChatBubbleLeftRightIcon, ArrowPathIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(true);
const chatList = ref([]);

const fetchChatList = async () => {
  if (!props.userProfile) return router.push("/login");
  loading.value = true;
  
  const { data, error } = await supabase
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

onMounted(fetchChatList);
</script>
