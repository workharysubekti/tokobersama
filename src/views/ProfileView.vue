<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { 
  PencilSquareIcon, 
  CameraIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CheckBadgeIcon
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const isEditing = ref(false);

const OWNER_ID = "68f80a52-d38c-4ac4-b483-8386026f436c"; // Masukkan ID Owner

// --- LOGIC TRANSACTION COUNT ---
const totalTx = ref(0);
const fetchUserStats = async () => {
  if (!props.userProfile?.id) return;
  
  // Hitung gabungan: Jual (Owner) + Beli (Winner) yang sudah CLOSED
  const { data: products, error } = await supabase
    .from("products")
    .select("id")
    .or(`owner_id.eq.${props.userProfile.id},winner_id.eq.${props.userProfile.id}`)
    .eq("status", "closed");

  if (!error) totalTx.value = products?.length || 0;
};

// --- LOGIC RANK & WARNA ---
const userRank = computed(() => {
  if (props.userProfile?.id === OWNER_ID) {
    return { name: "OWNER", color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/5" };
  }
  
  const score = props.userProfile?.reputation_score || 0;
  const tx = totalTx.value;

  if (tx >= 50 && score >= 4.8) {
    return { name: "LEGENDARY", color: "text-yellow-500", border: "border-yellow-500/30", bg: "bg-yellow-500/5" };
  } else if (tx >= 25 && score >= 4.5) {
    return { name: "MASTER", color: "text-purple-500", border: "border-purple-500/30", bg: "bg-purple-500/5" };
  } else if (tx >= 10 && score >= 4.0) {
    return { name: "INTERMEDIATE", color: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/5" };
  } else {
    return { name: "NEWBIE", color: "text-gray-500", border: "border-white/10", bg: "bg-white/5" };
  }
});

// --- LOGIC UNREAD MESSAGES (Real-time) ---
const unreadCount = ref(0);
let messageSubscription = null;

const fetchUnreadMessages = async () => {
  if (!props.userProfile?.id) return;
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", props.userProfile.id)
    .eq("is_read", false);
  unreadCount.value = count || 0;
};

onMounted(() => {
  fetchUnreadMessages();
  fetchUserStats();
  
  messageSubscription = supabase.channel('profile-notifs')
    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${props.userProfile?.id}` }, fetchUnreadMessages)
    .subscribe();
});

onUnmounted(() => {
  if (messageSubscription) supabase.removeChannel(messageSubscription);
});

watch(() => props.userProfile, (val) => {
  if (val) {
    fetchUnreadMessages();
    fetchUserStats();
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-20 pb-32 px-5">
    <div v-if="userProfile" class="max-w-md mx-auto">
      
      <div class="flex justify-between items-center mb-10 px-2">
        <div class="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
          <CheckBadgeIcon class="w-4 h-4 text-blue-500" />
          <span class="text-[9px] font-black uppercase tracking-widest text-blue-400 italic">Verified</span>
        </div>
        <button @click="handleLogout" class="p-2.5 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all">
          <ArrowRightOnRectangleIcon class="w-5 h-5 text-gray-500 hover:text-red-500" />
        </button>
      </div>

      <div class="flex flex-col items-center mb-10">
        <div class="relative mb-6">
          <div class="w-28 h-28 rounded-full border-2 border-white/10 p-1 bg-gradient-to-tr from-white/10 to-transparent shadow-2xl">
            <div class="w-full h-full rounded-full overflow-hidden bg-gray-900 border border-white/10">
              <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-800 font-black text-3xl italic">TB</div>
            </div>
          </div>
          <label class="absolute bottom-1 right-1 bg-yellow-500 p-2.5 rounded-full border-4 border-black cursor-pointer active:scale-90 transition-all shadow-lg">
            <CameraIcon class="w-4 h-4 text-black stroke-[3px]" />
            <input type="file" class="hidden" accept="image/*" />
          </label>
        </div>

        <div class="text-center">
          <h2 class="text-2xl font-[1000] italic uppercase tracking-tighter leading-none">{{ userProfile.full_name || 'Tanpa Nama' }}</h2>
          <p class="text-xs font-medium text-gray-500 italic mt-1">@{{ userProfile.username }}</p>
          
          <div class="mt-6 flex flex-col items-center gap-3">
            <div :class="[userRank.bg, userRank.border, userRank.color]" class="px-5 py-1.5 rounded-full border text-[9px] font-[1000] uppercase tracking-[0.3em] italic shadow-sm transition-all duration-500">
               Rank: {{ userRank.name }}
            </div>

            <div class="flex items-center gap-2">
              <router-link to="/reputation" class="text-[9px] font-black bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 uppercase italic text-yellow-500">
                Rep: {{ userProfile.reputation_score || '5.0' }}
              </router-link>
              <div class="text-[9px] font-black bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 uppercase italic text-white/40">
                Tx: {{ totalTx }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 mb-10">
        <div class="flex justify-between items-center mb-5 pb-4 border-b border-white/5">
          <span class="text-[9px] font-black uppercase text-gray-600 tracking-widest italic">Deskripsi Diri</span>
          <button @click="isEditing = !isEditing" class="text-[9px] font-black text-yellow-500 uppercase px-5 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 active:scale-95 transition-all">
            {{ isEditing ? 'Batal' : 'Edit' }}
          </button>
        </div>
        <p v-if="!isEditing" class="text-sm font-medium italic text-gray-400 leading-relaxed px-1">
          "{{ userProfile.bio || 'Belum ada deskripsi profil.' }}"
        </p>
        <div v-else class="space-y-4">
          <textarea v-model="editForm.bio" rows="3" class="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-medium text-gray-300 outline-none focus:border-yellow-500 resize-none"></textarea>
          <button @click="handleUpdate" class="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black text-[10px] uppercase italic active:scale-95 transition-all">Simpan Perubahan</button>
        </div>
      </div>

      <div class="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        <router-link v-for="(item, index) in [
          { name: 'Pesan', path: '/messages', count: unreadCount },
          { name: 'Inventory', path: '/vault', count: 0 },
          { name: 'Wishlist', path: '/my-bids', count: 0 },
          { name: 'Pengaturan Akun', path: '/settings', count: 0 }
        ]" :key="item.path" :to="item.path"
          class="flex items-center justify-between p-6 hover:bg-white/[0.04] transition-all border-white/5"
          :class="{ 'border-b': index !== 3 }">
          
          <div class="flex items-center gap-4">
            <span class="text-xs font-[1000] uppercase italic tracking-widest text-gray-200">{{ item.name }}</span>
            <div v-if="item.count > 0" class="bg-red-600 text-white text-[9px] font-black h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              {{ item.count > 99 ? '99+' : item.count }}
            </div>
          </div>
          <ChevronRightIcon class="w-4 h-4 text-gray-800" />
        </router-link>
      </div>

    </div>
  </div>
</template>
