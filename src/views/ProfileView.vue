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
  StarIcon,
  WalletIcon,
  ArrowUpRightIcon
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
  if (count >= 10) return { name: "INTERMEDIATE", color: "text-purple-500", bg: "bg-purple-500/10", icon: BoltIcon };
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
let messageSubscription = null;

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

      <div class="flex flex-col items-center mb-10">
        <div class="relative group mb-6">
          <div class="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white/5 overflow-hidden shadow-2xl bg-black">
            <img :src="userProfile.avatar_url || 'https://via.placeholder.com/150'" class="w-full h-full object-cover" />
          </div>
          <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="uploadAvatar" />
          <button @click="triggerFileInput" :disabled="loading" class="absolute bottom-1 right-1 bg-yellow-500 p-2.5 rounded-full text-black shadow-xl hover:scale-110 transition-all disabled:opacity-50">
            <CameraIcon v-if="!loading" class="w-5 h-5" />
            <ArrowPathIcon v-else class="w-5 h-5 animate-spin" />
          </button>
        </div>

        <h1 class="text-3xl tracking-tighter mb-1 text-white">{{ userProfile.full_name || "MEMBER" }}</h1>
        <p class="text-[10px] text-yellow-500/50 tracking-[0.4em] mb-6">@{{ userProfile.username }}</p>

        <div class="flex items-center gap-4 mb-6 text-[10px] tracking-widest text-gray-500">
          <button @click="router.push(`/user/${userProfile.username}/followers`)" class="flex items-center gap-1.5 hover:text-white transition-colors">
            <span class="text-white">{{ followersCount }}</span> <span>Followers</span>
          </button>
          <span class="text-white/10 text-xs font-light">|</span>
          <button @click="router.push(`/user/${userProfile.username}/following`)" class="flex items-center gap-1.5 hover:text-white transition-colors">
            <span class="text-white">{{ followingCount }}</span> <span>Following</span>
          </button>
        </div>

        <router-link 
          to="/reputation-info"
          class="inline-flex flex-col items-center group mb-8"
        >
          <div :class="[userRank.bg, userRank.color]" class="px-8 py-3 rounded-2xl border border-white/10 flex items-center gap-3 shadow-xl group-hover:bg-white/10 group-active:scale-95 transition-all">
            <component :is="userRank.icon" class="w-4 h-4" />
            <span class="text-[11px] font-[1000] tracking-widest">{{ userRank.name }}</span>
            <ChevronRightIcon class="w-3 h-3 opacity-50" />
          </div>
          <p class="text-[7px] mt-2 text-gray-700 tracking-[0.4em] font-black uppercase">Click for Reputation Protocol</p>
        </router-link>

        <div class="mb-4 max-w-md text-center">
          <p class="text-[11px] leading-relaxed text-gray-400 normal-case italic font-bold">
            {{ userProfile.bio || "MEMBER HAS NOT TRANSMITTED A BIO DATA." }}
          </p>
        </div>
        
        <button @click="isEditing = !isEditing" class="text-yellow-500 text-[9px] tracking-widest font-black italic border border-yellow-500/20 px-4 py-1.5 rounded-full hover:bg-yellow-500/5">
            {{ isEditing ? "BATAL EDIT" : "MODIFIKASI BIODATA" }}
        </button>
      </div>

      <div v-if="isEditing" class="mb-8 bg-white/[0.03] border border-white/5 rounded-[32px] p-6 space-y-4 animate-in fade-in duration-300">
          <input v-model="editData.full_name" type="text" placeholder="Full Name" class="w-full bg-black border border-white/10 rounded-2xl p-5 text-xs text-white outline-none focus:border-yellow-500" />
          <textarea v-model="editData.bio" rows="3" placeholder="Bio..." class="w-full bg-black border border-white/10 rounded-2xl p-5 text-xs text-white normal-case italic font-bold resize-none outline-none focus:border-yellow-500"></textarea>
          <button @click="handleUpdate" class="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black text-[10px] uppercase italic active:scale-95 transition-all">Save Changes</button>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-8">
        <router-link to="/wallet" class="bg-white/[0.03] border border-white/5 rounded-[32px] p-6 hover:bg-white/[0.06] transition-all group flex flex-col justify-between aspect-square">
          <div class="flex justify-between items-start">
            <div class="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                <BanknotesIcon class="w-5 h-5 text-yellow-500" />
            </div>
            <ArrowUpRightIcon class="w-4 h-4 text-gray-700 group-hover:text-yellow-500 transition-colors" />
          </div>
          <div>
            <p class="text-[8px] text-gray-500 tracking-widest mb-1 font-black">SALDO AKTIF</p>
            <p class="text-xl font-[1000] text-white">Rp {{ balance.toLocaleString() }}</p>
          </div>
        </router-link>

        <router-link :to="`/user/${userProfile.username}`" class="bg-white/[0.03] border border-white/5 rounded-[32px] p-6 hover:bg-white/[0.06] transition-all group flex flex-col justify-between aspect-square">
          <div class="flex justify-between items-start">
            <div class="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <UserIcon class="w-5 h-5 text-blue-500" />
            </div>
            <ArrowUpRightIcon class="w-4 h-4 text-gray-700 group-hover:text-blue-500 transition-colors" />
          </div>
          <div>
            <p class="text-[8px] text-gray-500 tracking-widest mb-1 font-black">PUBLIC VIEW</p>
            <p class="text-xl font-[1000] text-white">SWITCH <span class="text-blue-500">PROFILE</span></p>
          </div>
        </router-link>
      </div>

      <div class="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        <router-link
          v-for="(item, index) in [
            { name: 'Notifikasi', path: '/notifications', count: unreadNotif, type: 'notif' },
            { name: 'Pesan', path: '/messages', count: unreadCount, type: 'message' },
            { name: 'Transaksi Saya', path: '/my-auctions', count: totalTx, type: 'deal' },
            { name: 'Inventory Vault', path: '/vault' },
            { name: 'Account Settings', path: '/settings' },
          ]"
          :key="item.path"
          :to="item.path"
          class="flex items-center justify-between p-7 hover:bg-white/[0.04] transition-all border-white/5 border-b"
        >
          <div class="flex items-center gap-4">
            <span class="text-xs font-[1000] uppercase italic tracking-widest text-gray-200">{{ item.name }}</span>

            <div v-if="item.type === 'notif' && item.count > 0" class="w-2 h-2 bg-red-600 rounded-full animate-ping shadow-[0_0_8px_red]"></div>
            <div v-if="item.type === 'message' && item.count > 0" class="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">{{ item.count }}</div>
            <div v-if="item.type === 'deal' && item.count > 0" class="text-[10px] text-yellow-500/40 italic font-black">{{ item.count }} DEALS</div>
          </div>
          <ChevronRightIcon class="w-4 h-4 text-gray-800" />
        </router-link>
      </div>
    </div>
  </div>
</template>
