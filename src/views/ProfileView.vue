<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  PencilSquareIcon,
  CameraIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  BoltIcon,
  FireIcon,
  TrophyIcon,
  ArrowPathIcon,
  BanknotesIcon,
  UserIcon,
  ArrowUpRightIcon,
  IdentificationIcon
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const isEditing = ref(false);
const fileInput = ref(null);

const totalTx = ref(0);
const followersCount = ref(0);
const followingCount = ref(0);
const balance = ref(0);

// --- FUNGSI LOGOUT ---
const handleLogout = async () => {
  const confirmLogout = confirm("Konfirmasi Logout dari sistem?");
  if (!confirmLogout) return;
  await supabase.auth.signOut();
  router.push("/login");
};

// --- FUNGSI UPLOAD AVATAR ---
const triggerFileInput = () => {
  fileInput.value.click();
};

const uploadAvatar = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  loading.value = true;
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${props.userProfile.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", props.userProfile.id);

    if (updateError) throw updateError;

    window.location.reload();
  } catch (error) {
    alert("Gagal upload foto: " + error.message);
  } finally {
    loading.value = false;
  }
};

const fetchUserStats = async () => {
  if (!props.userProfile?.id) return;
  balance.value = props.userProfile?.balance || 0;

  const [txRes, follRes, followingRes] = await Promise.all([
    supabase
      .from("products")
      .select("id")
      .or(`owner_id.eq.${props.userProfile.id},winner_id.eq.${props.userProfile.id}`)
      .eq("status", "closed"),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", props.userProfile.id),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", props.userProfile.id),
  ]);

  if (!txRes.error) totalTx.value = txRes.data?.length || 0;
  followersCount.value = follRes.count || 0;
  followingCount.value = followingRes.count || 0;
};

// --- LOGIKA RANK ---
const userRank = computed(() => {
  if (props.userProfile?.is_admin === true) {
    return { name: "OWNER", color: "text-red-600", bg: "bg-red-600/10", icon: ShieldCheckIcon };
  }
  const count = followersCount.value;
  if (count >= 100) return { name: "LEGEND", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: TrophyIcon };
  if (count >= 30) return { name: "EXPERT", color: "text-red-500", bg: "bg-red-500/10", icon: FireIcon };
  return { name: "NEWBIE", color: "text-blue-500", bg: "bg-blue-500/10", icon: ShieldCheckIcon };
});

const editData = ref({
  full_name: props.userProfile?.full_name || "",
  bio: props.userProfile?.bio || "",
});

watch(
  () => props.userProfile,
  (newVal) => {
    if (newVal) {
      editData.value.full_name = newVal.full_name || "";
      editData.value.bio = newVal.bio || "";
      fetchUserStats();
    }
  },
  { immediate: true },
);

const handleUpdate = async () => {
  loading.value = true;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: editData.value.full_name,
      bio: editData.value.bio,
      updated_at: new Date(),
    })
    .eq("id", props.userProfile.id);

  if (!error) {
    isEditing.value = false;
    window.location.reload();
  }
  loading.value = false;
};

const unreadCount = ref(0);
const unreadNotif = ref(0);

const fetchUnreadNotifications = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .eq("type", "activity");
  unreadNotif.value = count || 0;
};

const fetchUnreadCount = async () => {
  if (!props.userProfile?.id) return;
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", props.userProfile.id)
    .eq("is_read", false);
  unreadCount.value = count || 0;
};

onMounted(() => {
  fetchUserStats();
  fetchUnreadCount();
  fetchUnreadNotifications();
});
</script>

<template>
  <div class="min-h-screen bg-[#050505] pt-12 pb-32 px-6 text-white font-sans uppercase italic font-[1000]">
    <div v-if="userProfile" class="max-w-2xl mx-auto relative">
      
      <button
        @click="handleLogout"
        class="absolute top-0 right-0 p-2.5 bg-white/5 border border-white/10 rounded-2xl text-red-500 hover:bg-red-600/20 transition-all z-10"
      >
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
      </button>

      <div class="flex flex-col items-center mb-8">
        <div class="relative group mb-6">
          <div class="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white/5 overflow-hidden bg-black shadow-2xl">
            <img :src="userProfile.avatar_url || 'https://via.placeholder.com/150'" class="w-full h-full object-cover" />
          </div>
          <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="uploadAvatar" />
          <button @click="triggerFileInput" :disabled="loading" class="absolute bottom-1 right-1 bg-yellow-500 p-2.5 rounded-full text-black shadow-xl hover:scale-110 transition-all">
            <CameraIcon v-if="!loading" class="w-5 h-5" />
            <ArrowPathIcon v-else class="w-5 h-5 animate-spin" />
          </button>
        </div>

        <h1 class="text-3xl tracking-tighter mb-1">{{ userProfile.full_name || "MEMBER" }}</h1>
        <p class="text-[10px] text-gray-600 tracking-[0.4em] mb-6">@{{ userProfile.username }}</p>

        <router-link 
          to="/reputation-info"
          class="inline-flex items-center gap-3 px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 active:scale-95 transition-all mb-8 shadow-lg"
        >
          <div :class="[userRank.bg, userRank.color]" class="p-1.5 rounded-lg border border-white/5">
            <component :is="userRank.icon" class="w-4 h-4" />
          </div>
          <div class="text-left border-l border-white/10 pl-3">
            <p class="text-[9px] text-white leading-none mb-1">{{ userRank.name }} PROTOCOL</p>
            <p class="text-[7px] text-gray-600 tracking-widest leading-none">VIEW RANK SYSTEM</p>
          </div>
          <ChevronRightIcon class="w-3 h-3 text-gray-700 ml-2" />
        </router-link>

        <div class="flex items-center gap-4 mb-6 text-[10px] tracking-widest text-gray-500">
          <button @click="router.push(`/user/${userProfile.username}/followers`)" class="hover:text-white transition-colors">
            <span class="text-white">{{ followersCount }}</span> FOLLOWERS
          </button>
          <span class="text-white/10 text-xs font-light">|</span>
          <button @click="router.push(`/user/${userProfile.username}/following`)" class="hover:text-white transition-colors">
            <span class="text-white">{{ followingCount }}</span> FOLLOWING
          </button>
        </div>

        <div class="mb-4 max-w-md text-center">
          <p class="text-[11px] leading-relaxed text-gray-500 normal-case italic font-bold">
            {{ userProfile.bio || "NO TRANSMISSION LOGS FOUND." }}
          </p>
        </div>
        
        <button @click="isEditing = !isEditing" class="text-[8px] text-gray-700 tracking-[0.3em] font-black border border-white/5 px-4 py-2 rounded-xl hover:text-yellow-500 hover:border-yellow-500/20 transition-all uppercase">
            {{ isEditing ? "CANCEL MODIFICATION" : "MODIFY BIODATA" }}
        </button>
      </div>

      <div v-if="isEditing" class="mb-8 bg-white/[0.02] border border-white/5 rounded-[32px] p-6 space-y-4">
          <input v-model="editData.full_name" type="text" placeholder="Full Name" class="w-full bg-black border border-white/5 rounded-2xl p-5 text-xs text-white outline-none focus:border-white/20" />
          <textarea v-model="editData.bio" rows="3" placeholder="Bio..." class="w-full bg-black border border-white/5 rounded-2xl p-5 text-xs text-white normal-case italic font-bold outline-none focus:border-white/20"></textarea>
          <button @click="handleUpdate" class="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase italic active:scale-95 transition-all">Apply Changes</button>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-8">
        <router-link to="/wallet" class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 hover:bg-white/[0.04] transition-all group flex flex-col justify-between aspect-square">
          <div class="flex justify-between items-start">
            <div class="p-2 bg-white/5 rounded-xl border border-white/5">
                <BanknotesIcon class="w-4 h-4 text-white" />
            </div>
            <ArrowUpRightIcon class="w-3.5 h-3.5 text-gray-800 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p class="text-[7px] text-gray-600 tracking-[0.3em] mb-1 font-black italic">ACCOUNT BALANCE</p>
            <p class="text-base font-[1000] text-white tracking-tighter">Rp {{ balance.toLocaleString() }}</p>
          </div>
        </router-link>

        <router-link :to="`/user/${userProfile.username}`" class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 hover:bg-white/[0.04] transition-all group flex flex-col justify-between aspect-square">
          <div class="flex justify-between items-start">
            <div class="p-2 bg-white/5 rounded-xl border border-white/5">
                <IdentificationIcon class="w-4 h-4 text-white" />
            </div>
            <ArrowUpRightIcon class="w-3.5 h-3.5 text-gray-800 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p class="text-[7px] text-gray-600 tracking-[0.3em] mb-1 font-black italic">VIEW IDENTITY</p>
            <p class="text-base font-[1000] text-white tracking-tighter">PUBLIC <span class="text-gray-500">SWITCH</span></p>
          </div>
        </router-link>
      </div>

      <div class="bg-white/[0.01] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        <router-link
          v-for="(item, index) in [
            { name: 'Notifications', path: '/notifications', count: unreadNotif, type: 'notif' },
            { name: 'Direct Messages', path: '/messages', count: unreadCount, type: 'message' },
            { name: 'Transmission Logs', path: '/my-auctions', count: totalTx, type: 'deal' },
            { name: 'Inventory Vault', path: '/vault' },
            { name: 'System Settings', path: '/settings' },
          ]"
          :key="item.path"
          :to="item.path"
          class="flex items-center justify-between p-7 hover:bg-white/[0.02] transition-all border-white/5"
          :class="{ 'border-b': index !== 4 }"
        >
          <div class="flex items-center gap-4">
            <span class="text-[10px] font-[1000] uppercase italic tracking-[0.2em] text-gray-400">{{ item.name }}</span>

            <div v-if="item.type === 'notif' && item.count > 0" class="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
            <div v-if="item.type === 'message' && item.count > 0" class="bg-white text-black text-[8px] px-2 py-0.5 rounded-lg font-black">{{ item.count }}</div>
            <div v-if="item.type === 'deal' && item.count > 0" class="text-[8px] text-yellow-500/40 italic font-black tracking-widest">{{ item.count }} DEALS</div>
          </div>
          <ChevronRightIcon class="w-3.5 h-3.5 text-gray-800" />
        </router-link>
      </div>
    </div>
  </div>
</template>
