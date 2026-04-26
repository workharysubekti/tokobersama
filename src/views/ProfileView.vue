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

// --- LOGIKA LOGOUT ---
const handleLogout = async () => {
  const confirmLogout = confirm("Konfirmasi Logout dari sistem TokBer?");
  if (!confirmLogout) return;
  await supabase.auth.signOut();
  router.push("/login");
};

// --- LOGIKA AVATAR ---
const triggerFileInput = () => { fileInput.value.click(); };
const uploadAvatar = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  loading.value = true;
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${props.userProfile.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", props.userProfile.id);
    if (updateError) throw updateError;
    window.location.reload();
  } catch (error) { alert("Gagal upload foto: " + error.message); } finally { loading.value = false; }
};

const fetchUserStats = async () => {
  if (!props.userProfile?.id) return;
  balance.value = props.userProfile?.balance || 0;
  const [txRes, follRes, followingRes] = await Promise.all([
    supabase.from("products").select("id").or(`owner_id.eq.${props.userProfile.id},winner_id.eq.${props.userProfile.id}`).eq("status", "closed"),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", props.userProfile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", props.userProfile.id),
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
  if (count >= 30) return { name: "EXPERT", color: "text-red-500", bg: "bg-red-600/10", icon: FireIcon };
  return { name: "NEWBIE", color: "text-blue-500", bg: "bg-blue-500/10", icon: ShieldCheckIcon };
});

const editData = ref({
  full_name: props.userProfile?.full_name || "",
  bio: props.userProfile?.bio || "",
});

watch(() => props.userProfile, (newVal) => {
    if (newVal) {
      editData.value.full_name = newVal.full_name || "";
      editData.value.bio = newVal.bio || "";
      fetchUserStats();
    }
  }, { immediate: true }
);

const handleUpdate = async () => {
  loading.value = true;
  const { error } = await supabase.from("profiles").update({ full_name: editData.value.full_name, bio: editData.value.bio, updated_at: new Date() }).eq("id", props.userProfile.id);
  if (!error) { isEditing.value = false; window.location.reload(); }
  loading.value = false;
};

const unreadCount = ref(0);
const unreadNotif = ref(0);

const fetchUnreadNotifications = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false).eq("type", "activity");
  unreadNotif.value = count || 0;
};

const fetchUnreadCount = async () => {
  if (!props.userProfile?.id) return;
  const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", props.userProfile.id).eq("is_read", false);
  unreadCount.value = count || 0;
};

onMounted(() => {
  fetchUserStats();
  fetchUnreadCount();
  fetchUnreadNotifications();
});
</script>

<template>
  <div class="min-h-screen bg-[#050505] pt-12 lg:pt-24 pb-32 px-6 text-white font-sans uppercase italic font-[1000]">
    
    <div v-if="userProfile" class="max-w-2xl lg:max-w-6xl mx-auto relative">
      
      <button @click="handleLogout" class="absolute -top-4 right-0 lg:top-0 lg:right-4 p-3 bg-white/5 border border-white/10 rounded-2xl text-red-500 active:scale-90 transition-all z-20 hover:bg-red-500/10 hover:border-red-500/20">
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
      </button>

      <div class="flex flex-col lg:flex-row gap-12 items-start">
        
        <div class="w-full lg:w-1/3 lg:sticky lg:top-24 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
          
          <div class="relative group">
            <div class="w-32 h-32 lg:w-48 lg:h-48 rounded-full border-4 border-yellow-500/10 overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,1)] ring-1 ring-white/5">
              <img :src="userProfile.avatar_url || 'https://via.placeholder.com/150'" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
            <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="uploadAvatar" />
            <button @click="triggerFileInput" :disabled="loading" class="absolute bottom-1 right-1 lg:bottom-4 lg:right-4 bg-yellow-500 p-3 rounded-full text-black shadow-2xl active:scale-110 hover:rotate-12 transition-all">
              <CameraIcon v-if="!loading" class="w-5 h-5 lg:w-6 lg:h-6" />
              <ArrowPathIcon v-else class="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
            </button>
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl lg:text-5xl tracking-tighter text-white leading-none">
              {{ userProfile.full_name || "MEMBER" }}
            </h1>
            <p class="text-[10px] lg:text-xs text-yellow-500/40 tracking-[0.4em]">
              @{{ userProfile.username }}
            </p>
          </div>

          <router-link to="/reputation-info" class="inline-flex items-center gap-4 px-8 py-4 bg-yellow-500/5 border border-yellow-500/20 rounded-[28px] hover:bg-yellow-500/10 transition-all w-full lg:w-fit group">
            <div :class="[userRank.bg, userRank.color]" class="p-2.5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
              <component :is="userRank.icon" class="w-5 h-5" />
            </div>
            <div class="text-left">
              <p class="text-[10px] text-white leading-none mb-1 font-black">RANK: {{ userRank.name }}</p>
              <p class="text-[7px] text-yellow-500/50 tracking-widest italic uppercase">Check Rules & Rewards</p>
            </div>
            <ChevronRightIcon class="w-4 h-4 text-yellow-500/30 ml-auto" />
          </router-link>

          <div class="max-w-xs">
            <p class="text-[11px] lg:text-[13px] leading-relaxed text-gray-500 normal-case italic font-bold">
              {{ userProfile.bio || "No mission brief recorded yet." }}
            </p>
          </div>

          <button @click="isEditing = !isEditing" class="text-[9px] lg:text-[10px] text-yellow-500 tracking-[0.3em] font-black border border-yellow-500/10 px-8 py-3 rounded-full hover:bg-yellow-500/5 transition-all">
            {{ isEditing ? "ABORT EDITING" : "EDIT DOSSIER" }}
          </button>
        </div>

        <div class="w-full lg:w-2/3 space-y-10">
          
          <div v-if="isEditing" class="bg-yellow-500/[0.03] border border-yellow-500/10 rounded-[40px] p-8 space-y-6 shadow-2xl">
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-[9px] text-gray-600 tracking-widest pl-2">FULL DESIGNATION</label>
                <input v-model="editData.full_name" type="text" class="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm text-white outline-none focus:border-yellow-500/40" />
              </div>
              <div class="space-y-2">
                <label class="text-[9px] text-gray-600 tracking-widest pl-2">DOSSIER BRIEF</label>
                <textarea v-model="editData.bio" rows="3" class="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm text-white normal-case italic font-bold outline-none focus:border-yellow-500/40 resize-none"></textarea>
              </div>
            </div>
            <button @click="handleUpdate" class="w-full bg-yellow-500 text-black py-5 rounded-2xl font-black text-[12px] uppercase italic active:scale-95 transition-all shadow-xl shadow-yellow-500/10">
              Update Personnel Data
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            <router-link to="/wallet" class="group bg-white/[0.02] border border-white/5 rounded-[40px] p-8 hover:bg-white/[0.04] hover:border-yellow-500/20 transition-all flex flex-col justify-between aspect-video lg:aspect-auto lg:h-48 shadow-xl">
              <div class="flex justify-between items-start">
                <div class="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                  <BanknotesIcon class="w-6 h-6 text-yellow-500" />
                </div>
                <div class="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                   <ArrowUpRightIcon class="w-4 h-4" />
                </div>
              </div>
              <div>
                <p class="text-[10px] text-gray-600 tracking-[0.3em] mb-2 font-black italic">ACTIVE CAPITAL</p>
                <p class="text-2xl lg:text-4xl font-[1000] text-white tracking-tighter">Rp {{ balance.toLocaleString() }}</p>
              </div>
            </router-link>

            <router-link :to="`/user/${userProfile.username}`" class="group bg-white/[0.02] border border-white/5 rounded-[40px] p-8 hover:bg-white/[0.04] hover:border-blue-500/20 transition-all flex flex-col justify-between aspect-video lg:aspect-auto lg:h-48 shadow-xl">
              <div class="flex justify-between items-start">
                <div class="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <UserIcon class="w-6 h-6 text-blue-500" />
                </div>
                <div class="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                   <ArrowUpRightIcon class="w-4 h-4" />
                </div>
              </div>
              <div>
                <p class="text-[10px] text-gray-600 tracking-[0.3em] mb-2 font-black italic">COMMUNICATION</p>
                <p class="text-2xl lg:text-4xl font-[1000] text-white tracking-tighter italic">PUBLIC <span class="text-blue-500/40">DOCK</span></p>
              </div>
            </router-link>
          </div>

          <div class="flex items-center gap-12 text-[11px] lg:text-[13px] tracking-[0.3em] text-gray-600 px-6">
            <button @click="router.push(`/user/${userProfile.username}/followers`)" class="hover:text-white transition-colors group">
              <span class="text-white font-[1000] text-lg mr-2 group-hover:text-yellow-500 transition-colors">{{ followersCount }}</span> FOLLOWERS
            </button>
            <span class="text-white/10 text-xl font-light">/</span>
            <button @click="router.push(`/user/${userProfile.username}/following`)" class="hover:text-white transition-colors group">
              <span class="text-white font-[1000] text-lg mr-2 group-hover:text-blue-500 transition-colors">{{ followingCount }}</span> FOLLOWING
            </button>
          </div>

          <div class="bg-white/[0.01] border border-white/5 rounded-[45px] overflow-hidden shadow-2xl backdrop-blur-sm">
            <router-link
              v-for="(item, index) in [
                { name: 'Notifications', path: '/notifications', count: unreadNotif, type: 'notif' },
                { name: 'Direct Messages', path: '/messages', count: unreadCount, type: 'message' },
                { name: 'Active Auctions', path: '/my-auctions', count: totalTx, type: 'deal' },
                { name: 'Asset Vault', path: '/vault' },
                { name: 'System Settings', path: '/settings' },
              ]"
              :key="item.path"
              :to="item.path"
              class="group flex items-center justify-between p-8 hover:bg-white/[0.03] transition-all border-white/5 border-b last:border-b-0"
            >
              <div class="flex items-center gap-6">
                <span class="text-[12px] lg:text-[14px] font-[1000] uppercase italic tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">{{ item.name }}</span>

                <div v-if="item.type === 'notif' && item.count > 0" class="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_red]"></div>
                <div v-if="item.type === 'message' && item.count > 0" class="bg-white text-black text-[10px] px-3 py-1 rounded-lg font-[1000]">
                  {{ item.count }}
                </div>
                <div v-if="item.type === 'deal' && item.count > 0" class="text-[10px] text-yellow-500 italic font-black tracking-widest bg-yellow-500/5 px-3 py-1 rounded-lg border border-yellow-500/10">
                  {{ item.count }} ACTIVE
                </div>
              </div>
              <ChevronRightIcon class="w-4 h-4 text-gray-800 group-hover:text-white group-hover:translate-x-2 transition-all" />
            </router-link>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
