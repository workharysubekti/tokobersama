<script setup>
import { ref, watch } from "vue";
import { supabase } from "../lib/supabase.js";
import { 
  UserCircleIcon, 
  ArrowPathIcon, 
  PencilSquareIcon, 
  CheckIcon, 
  XMarkIcon,
  ShieldCheckIcon,
  WalletIcon
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const loading = ref(false);
const isEditing = ref(false);

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
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-24 px-5 pb-32">
    <div v-if="userProfile" class="max-w-md mx-auto space-y-6">
      
      <div class="relative bg-gradient-to-b from-yellow-500/10 to-transparent p-8 rounded-[40px] border border-white/5 text-center">
        <div class="relative w-24 h-24 mx-auto mb-4">
          <div class="absolute inset-0 bg-yellow-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div class="relative w-full h-full rounded-full border-2 border-yellow-500/50 p-1 bg-black">
            <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" class="w-full h-full rounded-full object-cover" />
            <UserCircleIcon v-else class="w-full h-full text-gray-800" />
          </div>
          <div class="absolute -bottom-1 -right-1 bg-yellow-500 p-1.5 rounded-full border-4 border-black">
            <ShieldCheckIcon class="w-4 h-4 text-black stroke-[3px]" />
          </div>
        </div>
        <h2 class="text-2xl font-[1000] italic uppercase tracking-tighter">{{ userProfile.username }}</h2>
        <div class="inline-flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-full mt-2 border border-yellow-500/20">
          <div class="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></div>
          <span class="text-[8px] font-black text-yellow-500 uppercase tracking-widest italic">Rank: Elite Trader</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white/[0.03] border border-white/5 p-4 rounded-3xl">
          <p class="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Reputation</p>
          <p class="text-xl font-[1000] italic text-yellow-500 tracking-tighter">4.9<span class="text-[10px] text-gray-600 ml-1">/5.0</span></p>
        </div>
        <div class="bg-white/[0.03] border border-white/5 p-4 rounded-3xl text-right">
          <p class="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Vault Status</p>
          <p class="text-xl font-[1000] italic text-white tracking-tighter uppercase">Secure</p>
        </div>
      </div>

      <div class="bg-[#0a0a0a] border border-white/5 rounded-[35px] p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-2">
            <WalletIcon class="w-4 h-4 text-gray-600" />
            <h3 class="text-[9px] font-black uppercase italic text-gray-500 tracking-[0.3em]">Identity Vault</h3>
          </div>
          <button @click="isEditing = !isEditing" class="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all">
            <PencilSquareIcon v-if="!isEditing" class="w-4 h-4 text-yellow-500" />
            <XMarkIcon v-else class="w-4 h-4 text-red-500" />
          </button>
        </div>

        <div class="space-y-5">
          <div class="group">
            <label class="text-[7px] font-black uppercase text-gray-600 tracking-widest ml-1 mb-1 block">Full Name Signal</label>
            <input v-if="isEditing" v-model="editForm.full_name" class="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-yellow-500 outline-none focus:border-yellow-500/50 transition-all" />
            <div v-else class="px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <p class="text-sm font-black italic">{{ userProfile.full_name || 'NO_DATA' }}</p>
            </div>
          </div>

          <div class="group">
            <label class="text-[7px] font-black uppercase text-gray-600 tracking-widest ml-1 mb-1 block">Bio / Transmission</label>
            <textarea v-if="isEditing" v-model="editForm.bio" rows="3" class="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-yellow-500 outline-none focus:border-yellow-500/50 transition-all resize-none"></textarea>
            <div v-else class="px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <p class="text-[11px] font-bold italic leading-relaxed text-gray-400">{{ userProfile.bio || 'Waiting for signal transmission...' }}</p>
            </div>
          </div>
        </div>

        <button v-if="isEditing" @click="handleUpdate" :disabled="loading" class="w-full mt-8 bg-yellow-500 text-black py-4 rounded-2xl font-[1000] text-[10px] uppercase italic flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(234,179,8,0.2)] active:scale-95 transition-all">
          <ArrowPathIcon v-if="loading" class="w-4 h-4 animate-spin" />
          <CheckIcon v-else class="w-4 h-4 stroke-[3px]" />
          Synchronize Data
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-40">
      <div class="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
      <p class="text-[8px] font-black uppercase tracking-[0.4em] text-gray-700 mt-6">Connecting to Server...</p>
    </div>
  </div>
</template>
