<script setup>
import { ref, watch } from "vue";
import { supabase } from "../lib/supabase.js";
import { UserCircleIcon, ArrowPathIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const loading = ref(false);
const isEditing = ref(false);

const editForm = ref({
  full_name: "",
  bio: "",
  avatar_url: ""
});

// Pantau kalau data profile datang, isi form-nya
watch(() => props.userProfile, (newVal) => {
  if (newVal) {
    editForm.value.full_name = newVal.full_name || "";
    editForm.value.bio = newVal.bio || "";
    editForm.value.avatar_url = newVal.avatar_url || "";
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
  <div class="min-h-screen bg-black text-white pt-24 px-6 pb-32">
    <div v-if="userProfile" class="max-w-2xl mx-auto space-y-8">
      <div class="flex flex-col items-center space-y-4">
        <div class="relative group">
          <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" class="w-full h-full object-cover" />
            <UserCircleIcon v-else class="w-full h-full text-gray-800" />
          </div>
        </div>
        <div class="text-center">
          <h2 class="text-2xl font-[1000] italic uppercase tracking-tighter">{{ userProfile.username }}</h2>
          <p class="text-[9px] font-black text-yellow-500 uppercase tracking-[0.3em] italic">Member Status: Verified</p>
        </div>
      </div>

      <div class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 space-y-6">
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-black uppercase italic text-gray-500 tracking-widest">Identitas Vault</h3>
          <button @click="isEditing = !isEditing" class="text-yellow-500 p-2 hover:bg-yellow-500/10 rounded-xl transition-all">
            <PencilSquareIcon v-if="!isEditing" class="w-5 h-5" />
            <XMarkIcon v-else class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-[8px] font-black uppercase text-gray-600 ml-1">Full Name</label>
            <input v-if="isEditing" v-model="editForm.full_name" class="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-yellow-500" />
            <p v-else class="text-sm font-bold italic px-1">{{ userProfile.full_name || '-' }}</p>
          </div>
          <div>
            <label class="text-[8px] font-black uppercase text-gray-600 ml-1">Bio</label>
            <textarea v-if="isEditing" v-model="editForm.bio" class="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-yellow-500" rows="3"></textarea>
            <p v-else class="text-sm font-bold italic px-1 leading-relaxed">{{ userProfile.bio || 'No bio signal...' }}</p>
          </div>
        </div>

        <button v-if="isEditing" @click="handleUpdate" :disabled="loading" class="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black text-[10px] uppercase italic flex items-center justify-center gap-2">
          <ArrowPathIcon v-if="loading" class="w-4 h-4 animate-spin" />
          <CheckIcon v-else class="w-4 h-4" />
          Update Signal
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-40">
      <ArrowPathIcon class="w-8 h-8 text-yellow-500 animate-spin opacity-30" />
    </div>
  </div>
</template>
