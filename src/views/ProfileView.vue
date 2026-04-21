<script setup>
import { ref, watch, computed } from "vue";
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

// ID Owner Mas (Ganti dengan ID asli Mas)
const OWNER_ID = "68f80a52-d38c-4ac4-b483-8386026f436c"; 

const editForm = ref({
  full_name: "",
  bio: ""
});

// Penanda notifikasi (Nanti bisa dihubungkan ke logic database pesan)
const hasNewMessages = ref(true); 

watch(() => props.userProfile, (newVal) => {
  if (newVal) {
    editForm.value.full_name = newVal.full_name || "";
    editForm.value.bio = newVal.bio || "";
  }
}, { immediate: true });

const userRank = computed(() => {
  if (props.userProfile?.id === OWNER_ID) return "Owner";
  const score = props.userProfile?.reputation_score || 0;
  if (score >= 4.8) return "Legendary Trader";
  if (score >= 4.0) return "Master Bidder";
  return "Newbie";
});

const handleUpdate = async () => {
  if (!props.userProfile?.id) return;
  loading.value = true;
  const { error } = await supabase.from("profiles").update({
    full_name: editForm.value.full_name,
    bio: editForm.value.bio,
  }).eq("id", props.userProfile.id);
  
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
  <div class="min-h-screen bg-[#050505] text-white pt-20 pb-32 px-5">
    <div v-if="userProfile" class="max-w-md mx-auto">
      
      <div class="flex justify-between items-center mb-10 px-2">
        <div class="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
          <CheckBadgeIcon class="w-4 h-4 text-blue-500" />
          <span class="text-[9px] font-black uppercase tracking-widest text-blue-400 italic">Verified User</span>
        </div>
        <button @click="handleLogout" class="p-2 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all border border-white/5 group">
          <ArrowRightOnRectangleIcon class="w-5 h-5 text-gray-500 group-hover:text-red-500" />
        </button>
      </div>

      <div class="flex flex-col items-center mb-12">
        <div class="relative mb-6">
          <div class="w-28 h-28 rounded-full border-2 border-white/10 p-1 bg-gradient-to-tr from-yellow-500/20 to-transparent">
            <div class="w-full h-full rounded-full overflow-hidden bg-gray-900 border border-white/10">
              <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-700 font-black text-3xl italic">TB</div>
            </div>
          </div>
          <label class="absolute bottom-1 right-1 bg-yellow-500 p-2.5 rounded-full border-4 border-black cursor-pointer active:scale-90 transition-all shadow-xl">
            <CameraIcon class="w-4 h-4 text-black stroke-[2.5px]" />
            <input type="file" class="hidden" accept="image/*" />
          </label>
        </div>

        <div class="text-center space-y-1">
          <h2 class="text-2xl font-[1000] italic uppercase tracking-tighter leading-none">{{ userProfile.full_name || 'Tanpa Nama' }}</h2>
          <p class="text-xs font-medium text-gray-500 italic">@{{ userProfile.username }}</p>
          
          <router-link to="/reputation" class="inline-flex items-center gap-1.5 mt-4 hover:opacity-70 transition-opacity">
            <span class="text-[10px] font-black bg-white/5 px-3 py-1 rounded-lg border border-white/5 tracking-widest uppercase italic">
              Reputasi: <span class="text-yellow-500">{{ userProfile.reputation_score || '5.0' }}</span>
            </span>
          </router-link>

          <p class="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 mt-2 italic">
            {{ userRank }}
          </p>
        </div>
      </div>

      <div class="bg-white/[0.02] border border-white/5 rounded-[35px] p-8 mb-10 relative group">
        <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
          <span class="text-[9px] font-black uppercase text-gray-500 tracking-widest italic">Deskripsi Diri</span>
          <button @click="isEditing = !isEditing" class="text-[10px] font-bold text-yellow-500 uppercase px-4 py-1.5 rounded-full bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500 hover:text-black transition-all">
            {{ isEditing ? 'Batal' : 'Edit' }}
          </button>
        </div>

        <div v-if="!isEditing">
          <p class="text-sm font-medium italic text-gray-400 leading-relaxed">
            "{{ userProfile.bio || 'Belum ada deskripsi profil.' }}"
          </p>
        </div>

        <div v-else class="space-y-4">
          <input v-model="editForm.full_name" class="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-yellow-500" placeholder="Nama Lengkap" />
          <textarea v-model="editForm.bio" rows="3" class="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs font-medium text-gray-300 outline-none focus:border-yellow-500 resize-none" placeholder="Tulis bio singkat..."></textarea>
          <button @click="handleUpdate" class="w-full bg-yellow-500 text-black py-3 rounded-2xl font-black text-[10px] uppercase italic active:scale-95 transition-all">
            Simpan Perubahan
          </button>
        </div>
      </div>

      <div class="bg-white/[0.02] border border-white/5 rounded-[35px] overflow-hidden">
        <router-link v-for="(item, index) in [
          { name: 'Pesan', path: '/messages', showDot: hasNewMessages },
          { name: 'Inventory', path: '/vault', showDot: false },
          { name: 'Wishlist', path: '/my-bids', showDot: false },
          { name: 'Pengaturan Akun', path: '/settings', showDot: false }
        ]" :key="item.path" :to="item.path"
          class="flex items-center justify-between p-6 hover:bg-white/[0.03] transition-colors"
          :class="{ 'border-b border-white/5': index !== 3 }">
          
          <div class="flex items-center gap-3">
            <span class="text-xs font-black uppercase italic tracking-widest text-gray-200">{{ item.name }}</span>
            <div v-if="item.showDot" class="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse"></div>
          </div>
          
          <ChevronRightIcon class="w-4 h-4 text-gray-700" />
        </router-link>
      </div>

    </div>

    <div v-else class="flex flex-col items-center justify-center py-40">
      <div class="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
    </div>
  </div>
</template>

<style scoped>
/* Hilangkan highlight biru di mobile */
div, button, a { -webkit-tap-highlight-color: transparent; }
</style>
