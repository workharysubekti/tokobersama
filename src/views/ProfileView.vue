<script setup>
import { ref, watch, computed } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { 
  PencilSquareIcon, 
  CameraIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const isEditing = ref(false);

const OWNER_ID = "ID_SUPABASE_MAS_DI_SINI"; 

const editForm = ref({
  full_name: "",
  bio: ""
});

watch(() => props.userProfile, (newVal) => {
  if (newVal) {
    editForm.value.full_name = newVal.full_name || "";
    editForm.value.bio = newVal.bio || "";
  }
}, { immediate: true });

const userRank = computed(() => {
  if (props.userProfile?.id === OWNER_ID) return "OWNER / ADMIN";
  const score = props.userProfile?.reputation_score || 0;
  if (score >= 4.8) return "LEGENDARY";
  if (score >= 4.0) return "MASTER";
  return "MEMBER";
});

const handleUpdate = async () => {
  if (!props.userProfile?.id) return;
  loading.value = true;
  const { error } = await supabase.from("profiles").update({
    full_name: editForm.value.full_name,
    bio: editForm.value.bio,
  }).eq("id", props.userProfile.id);
  if (!error) { isEditing.value = false; window.location.reload(); }
  loading.value = false;
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/").then(() => window.location.reload());
};
</script>

<template>
  <div class="min-h-screen bg-[#080808] text-[#e0e0e0] pt-20 pb-32 px-5">
    <div v-if="userProfile" class="max-w-md mx-auto">
      
      <div class="flex justify-between items-center mb-8">
        <span class="text-[10px] font-bold tracking-[0.4em] text-white/30 uppercase italic">Vault Terminal v2.1</span>
        <button @click="handleLogout" class="text-[10px] font-bold text-red-500/70 hover:text-red-500 uppercase tracking-widest transition-colors">
          Terminate Session
        </button>
      </div>

      <div class="flex items-start gap-6 mb-10">
        <div class="relative shrink-0">
          <div class="w-20 h-20 bg-[#111] border border-white/10 rounded-sm overflow-hidden">
            <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" class="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all duration-500" />
            <div v-else class="w-full h-full flex items-center justify-center text-white/10 font-black text-2xl italic">TB</div>
          </div>
          <label class="absolute -bottom-2 -right-2 bg-white text-black p-1.5 rounded-sm cursor-pointer hover:bg-yellow-500 transition-colors">
            <CameraIcon class="w-3 h-3 stroke-[3px]" />
            <input type="file" class="hidden" accept="image/*" />
          </label>
        </div>

        <div class="flex-1 pt-1">
          <h2 class="text-2xl font-black italic uppercase leading-none tracking-tighter text-white mb-1">
            {{ userProfile.full_name || 'Anonymous' }}
          </h2>
          <p class="text-[11px] font-medium text-white/40 italic">@{{ userProfile.username }}</p>
          
          <div class="mt-3 flex items-center gap-2">
            <span class="text-[9px] font-black px-2 py-0.5 border border-yellow-500/50 text-yellow-500 italic uppercase">
              {{ userRank }}
            </span>
            <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest">
              Rep: {{ userProfile.reputation_score || '5.0' }}
            </span>
          </div>
        </div>
      </div>

      <div class="mb-12">
        <div class="flex justify-between items-end mb-3 border-b border-white/5 pb-2">
          <span class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Transmission Bio</span>
          <button @click="isEditing = !isEditing" class="text-[10px] font-bold text-yellow-500 uppercase hover:underline">
            {{ isEditing ? '[ Cancel ]' : '[ Edit ]' }}
          </button>
        </div>
        
        <div v-if="!isEditing">
          <p class="text-sm italic leading-relaxed text-white/60 font-medium">
            "{{ userProfile.bio || 'No active transmission signal.' }}"
          </p>
        </div>
        
        <div v-else class="space-y-4 pt-2">
          <input v-model="editForm.full_name" class="w-full bg-transparent border-b border-white/10 py-2 text-sm outline-none focus:border-yellow-500 transition-colors font-bold text-white uppercase italic" placeholder="Update Name..." />
          <textarea v-model="editForm.bio" class="w-full bg-transparent border-b border-white/10 py-2 text-sm outline-none focus:border-yellow-500 transition-colors font-medium text-white/70 italic resize-none" rows="2" placeholder="Update Bio..."></textarea>
          <button @click="handleUpdate" class="bg-yellow-500 text-black text-[10px] font-black px-4 py-2 uppercase italic hover:bg-white transition-all">
            Apply Changes
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-[1px] bg-white/5 border border-white/5 overflow-hidden">
        
        <router-link v-for="link in [
          { name: 'Incoming Messages', path: '/messages', color: 'text-blue-400' },
          { name: 'Asset Vault', path: '/vault', color: 'text-yellow-500' },
          { name: 'Wishlist Signal', path: '/my-bids', color: 'text-red-500' },
          { name: 'Terminal Config', path: '/settings', color: 'text-gray-500' }
        ]" :key="link.path" :to="link.path" 
          class="flex items-center justify-between p-6 bg-[#080808] hover:bg-white/[0.03] transition-colors group">
          <span class="text-[11px] font-black uppercase tracking-[0.2em] italic text-white/80 group-hover:text-white transition-colors">
            {{ link.name }}
          </span>
          <ChevronRightIcon class="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
        </router-link>

      </div>

    </div>
  </div>
</template>

<style scoped>
/* Brutalist Feel: Hilangkan rounded-full, ganti jadi rounded-sm (kotak tegas) */
.rounded-sm { border-radius: 2px; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
