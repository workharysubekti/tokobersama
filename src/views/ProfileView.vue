<script setup>
import { ref, watch } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { 
  UserCircleIcon, 
  ArrowPathIcon, 
  PencilSquareIcon, 
  CheckIcon, 
  XMarkIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  HeartIcon,
  ArrowRightOnRectangleIcon,
  StarIcon
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const isEditing = ref(false);

const editForm = ref({
  full_name: "",
  bio: ""
});

// Watcher agar data sinkron dengan App.vue
watch(() => props.userProfile, (newVal) => {
  if (newVal) {
    editForm.value.full_name = newVal.full_name || "";
    editForm.value.bio = newVal.bio || "";
  }
}, { immediate: true });

const handleUpdate = async () => {
  if (!props.userProfile?.id) return;
  loading.value = true;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: editForm.value.full_name,
      bio: editForm.value.bio,
    })
    .eq("id", props.userProfile.id);

  if (!error) {
    isEditing.value = false;
    window.location.reload(); 
  }
  loading.value = false;
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/").then(() => window.location.reload());
};
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-20 px-5 pb-32 selection:bg-yellow-500">
    <div v-if="userProfile" class="max-w-md mx-auto space-y-6">
      
      <div class="flex justify-between items-center px-2">
        <button @click="handleLogout" class="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl active:scale-90 transition-all">
          <ArrowRightOnRectangleIcon class="w-4 h-4 text-red-500" />
        </button>
        <button @click="isEditing = !isEditing" class="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl active:scale-95">
          <PencilSquareIcon class="w-4 h-4 text-yellow-500" />
          <span class="text-[9px] font-black uppercase tracking-widest italic">Edit Profil</span>
        </button>
      </div>

      <div class="relative bg-gradient-to-b from-white/[0.03] to-transparent p-6 rounded-[35px] border border-white/5 text-center shadow-2xl">
        <div class="relative w-20 h-20 mx-auto mb-4">
          <div class="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-10 animate-pulse"></div>
          <div class="relative w-full h-full rounded-full border-2 border-yellow-500/30 p-1 bg-black">
            <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" class="w-full h-full rounded-full object-cover" />
            <UserCircleIcon v-else class="w-full h-full text-gray-800" />
          </div>
          <div class="absolute -bottom-0 -right-0 bg-yellow-500 p-1 rounded-full border-2 border-black">
            <ShieldCheckIcon class="w-3 h-3 text-black stroke-[3px]" />
          </div>
        </div>

        <h2 class="text-xl font-black italic uppercase tracking-tighter">{{ userProfile.full_name || 'No Name Signal' }}</h2>
        <p class="text-[10px] font-bold text-gray-500 italic mt-0.5 tracking-tight">@{{ userProfile.username }}</p>

        <div class="mt-4 flex items-center justify-center gap-1.5 bg-white/[0.02] border border-white/5 w-fit mx-auto px-4 py-1.5 rounded-full">
          <StarIcon class="w-3 h-3 text-yellow-500 fill-current" />
          <span class="text-[10px] font-black italic tracking-tighter">{{ userProfile.reputation_score || '5.0' }}</span>
          <div class="w-[1px] h-3 bg-white/10 mx-1"></div>
          <span class="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Elite Trader</span>
        </div>

        <div class="mt-6 px-4">
          <p class="text-[11px] font-bold italic leading-relaxed text-gray-400 opacity-80">
            "{{ userProfile.bio || 'Signal transmission pending... No bio set.' }}"
          </p>
        </div>
      </div>

      <transition name="fade">
        <div v-if="isEditing" class="bg-yellow-500/5 border border-yellow-500/20 rounded-[30px] p-6 space-y-4">
          <div>
            <label class="text-[7px] font-black uppercase text-yellow-500 tracking-widest ml-1 mb-1 block">Full Name Display</label>
            <input v-model="editForm.full_name" class="w-full bg-black border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-white outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label class="text-[7px] font-black uppercase text-yellow-500 tracking-widest ml-1 mb-1 block">Transmission Bio</label>
            <textarea v-model="editForm.bio" rows="2" class="w-full bg-black border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-white outline-none focus:border-yellow-500/50 resize-none"></textarea>
          </div>
          <button @click="handleUpdate" :disabled="loading" class="w-full bg-yellow-500 text-black py-3.5 rounded-xl font-[1000] text-[9px] uppercase italic flex items-center justify-center gap-2 active:scale-95 transition-all">
            <ArrowPathIcon v-if="loading" class="w-3 h-3 animate-spin" />
            <CheckIcon v-else class="w-3 h-3 stroke-[3px]" />
            Synchronize Profile
          </button>
        </div>
      </transition>

      <div class="grid grid-cols-2 gap-3">
        <router-link to="/messages" class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] hover:border-yellow-500/30 transition-all group">
          <div class="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-500" />
          </div>
          <span class="text-[9px] font-black uppercase italic tracking-widest">Pesan</span>
        </router-link>

        <router-link to="/vault" class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] hover:border-yellow-500/30 transition-all group">
          <div class="w-10 h-10 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ArchiveBoxIcon class="w-5 h-5 text-yellow-500" />
          </div>
          <span class="text-[9px] font-black uppercase italic tracking-widest">Vault</span>
        </router-link>

        <router-link to="/my-bids" class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] hover:border-yellow-500/30 transition-all group">
          <div class="w-10 h-10 bg-red-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <HeartIcon class="w-5 h-5 text-red-500" />
          </div>
          <span class="text-[9px] font-black uppercase italic tracking-widest">Wishlist</span>
        </router-link>

        <button class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] hover:border-yellow-500/30 transition-all group">
          <div class="w-10 h-10 bg-gray-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Cog6ToothIcon class="w-5 h-5 text-gray-500" />
          </div>
          <span class="text-[9px] font-black uppercase italic tracking-widest">Config</span>
        </button>
      </div>

    </div>

    <div v-else class="flex flex-col items-center justify-center py-40">
      <div class="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
      <p class="text-[8px] font-black uppercase tracking-[0.4em] text-gray-700 mt-6 animate-pulse">Decrypting Identity...</p>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
