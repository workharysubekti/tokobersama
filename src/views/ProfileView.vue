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
  StarIcon,
  CameraIcon // Ikon baru buat upload
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const uploading = ref(false); // State khusus upload foto
const isEditing = ref(false);

const editForm = ref({
  full_name: "",
  bio: "",
  avatar_url: ""
});

watch(() => props.userProfile, (newVal) => {
  if (newVal) {
    editForm.value.full_name = newVal.full_name || "";
    editForm.value.bio = newVal.bio || "";
    editForm.value.avatar_url = newVal.avatar_url || "";
  }
}, { immediate: true });

// --- FUNGSI UPLOAD FOTO PROFIL ---
const handleAvatarUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    uploading.value = true;
    const fileExt = file.name.split('.').pop();
    const fileName = `${props.userProfile.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // 1. Upload ke Storage
    const { error: uploadError } = await supabase.storage
      .from('auction_items') // Pake bucket yang sudah ada atau buat baru 'avatars'
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Ambil URL Publik
    const { data: { publicUrl } } = supabase.storage
      .from('auction_items')
      .getPublicUrl(filePath);

    // 3. Update ke Tabel Profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', props.userProfile.id);

    if (updateError) throw updateError;
    
    window.location.reload(); // Refresh biar App.vue dapet foto baru
  } catch (error) {
    alert("Gagal upload foto: " + error.message);
  } finally {
    uploading.value = false;
  }
};

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
  <div class="min-h-screen bg-[#050505] text-white pt-20 px-5 pb-32">
    <div v-if="userProfile" class="max-w-md mx-auto space-y-6">
      
      <div class="flex justify-between items-center px-2">
        <button @click="handleLogout" class="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl active:scale-90 transition-all">
          <ArrowRightOnRectangleIcon class="w-4 h-4 text-red-500" />
        </button>
        <button @click="isEditing = !isEditing" class="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
          <PencilSquareIcon class="w-4 h-4 text-yellow-500" />
          <span class="text-[9px] font-black uppercase tracking-widest italic">{{ isEditing ? 'Batal' : 'Edit Profil' }}</span>
        </button>
      </div>

      <div class="relative bg-gradient-to-b from-white/[0.03] to-transparent p-6 rounded-[35px] border border-white/5 text-center shadow-2xl">
        
        <div class="relative w-24 h-24 mx-auto mb-4">
          <div class="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-10 animate-pulse"></div>
          <div class="relative w-full h-full rounded-full border-2 border-yellow-500/30 p-1 bg-black overflow-hidden">
            <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" class="w-full h-full rounded-full object-cover" />
            <UserCircleIcon v-else class="w-full h-full text-gray-800" />
            
            <div v-if="uploading" class="absolute inset-0 bg-black/60 flex items-center justify-center">
              <ArrowPathIcon class="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          </div>

          <label class="absolute -bottom-1 -right-1 bg-yellow-500 p-2 rounded-full border-4 border-black cursor-pointer active:scale-90 transition-all">
            <CameraIcon class="w-3.5 h-3.5 text-black stroke-[3px]" />
            <input type="file" class="hidden" accept="image/*" @change="handleAvatarUpload" :disabled="uploading" />
          </label>
        </div>

        <h2 class="text-xl font-black italic uppercase tracking-tighter">{{ userProfile.full_name || 'No Name Signal' }}</h2>
        <p class="text-[10px] font-bold text-gray-500 italic mt-0.5 tracking-tight">@{{ userProfile.username }}</p>

        <div class="mt-4 flex items-center justify-center gap-1.5 bg-white/[0.02] border border-white/5 w-fit mx-auto px-4 py-1.5 rounded-full">
          <StarIcon class="w-3 h-3 text-yellow-500 fill-current" />
          <span class="text-[10px] font-black italic tracking-tighter">{{ userProfile.reputation_score || '5.0' }}</span>
          <div class="w-[1px] h-3 bg-white/10 mx-1"></div>
          <span class="text-[8px] font-bold text-gray-500 uppercase tracking-widest italic">Elite Trader</span>
        </div>

        <div class="mt-6 px-4">
          <p class="text-[11px] font-bold italic leading-relaxed text-gray-400 opacity-80">
            "{{ userProfile.bio || 'Signal transmission pending...' }}"
          </p>
        </div>
      </div>

      <transition name="fade">
        <div v-if="isEditing" class="bg-yellow-500/5 border border-yellow-500/20 rounded-[30px] p-6 space-y-4">
          <div>
            <label class="text-[7px] font-black uppercase text-yellow-500 tracking-widest ml-1 mb-1 block">Full Name</label>
            <input v-model="editForm.full_name" class="w-full bg-black border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-white outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label class="text-[7px] font-black uppercase text-yellow-500 tracking-widest ml-1 mb-1 block">Bio / Desc</label>
            <textarea v-model="editForm.bio" rows="2" class="w-full bg-black border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-white outline-none focus:border-yellow-500/50 resize-none"></textarea>
          </div>
          <button @click="handleUpdate" :disabled="loading" class="w-full bg-yellow-500 text-black py-3.5 rounded-xl font-[1000] text-[9px] uppercase italic flex items-center justify-center gap-2 active:scale-95 transition-all">
            <ArrowPathIcon v-if="loading" class="w-3 h-3 animate-spin" />
            <CheckIcon v-else class="w-3 h-3 stroke-[3px]" />
            Save Profile Changes
          </button>
        </div>
      </transition>

      <div class="grid grid-cols-2 gap-3">
        <router-link to="/messages" class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] active:bg-white/5">
          <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-500 mb-3" />
          <span class="text-[9px] font-black uppercase italic tracking-widest">Pesan</span>
        </router-link>
        <router-link to="/vault" class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] active:bg-white/5">
          <ArchiveBoxIcon class="w-5 h-5 text-yellow-500 mb-3" />
          <span class="text-[9px] font-black uppercase italic tracking-widest">Vault</span>
        </router-link>
        <router-link to="/my-bids" class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] active:bg-white/5">
          <HeartIcon class="w-5 h-5 text-red-500 mb-3" />
          <span class="text-[9px] font-black uppercase italic tracking-widest">Wishlist</span>
        </router-link>
        <button class="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px] active:bg-white/5">
          <Cog6ToothIcon class="w-5 h-5 text-gray-500 mb-3" />
          <span class="text-[9px] font-black uppercase italic tracking-widest">Config</span>
        </button>
      </div>

    </div>
  </div>
</template>
