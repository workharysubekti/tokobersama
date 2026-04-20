<script setup>
import { ref, watch, computed } from "vue"; // Tambah computed
// ... import icon lainnya tetap sama ...

const props = defineProps({ userProfile: Object });

// 1. DATA ID OWNER (Masukkan ID Supabase Mas di sini)
const OWNER_ID = "68f80a52-d38c-4ac4-b483-8386026f436c"; 

// 2. LOGIC PANGKAT (Rank System)
const userRank = computed(() => {
  // Cek apakah ini Mas (Owner)
  if (props.userProfile?.id === OWNER_ID) {
    return { name: "OWNER", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
  }

  const score = props.userProfile?.reputation_score || 0;

  if (score >= 4.8) {
    return { name: "LEGENDARY TRADER", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
  } else if (score >= 4.0) {
    return { name: "MASTER BIDDER", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" };
  } else if (score >= 3.0) {
    return { name: "PRO MERCHANT", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
  } else {
    return { name: "NEWBIE", color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20" };
  }
});

// ... handleUpdate dan handleAvatarUpload tetap sama ...
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-20 px-5 pb-32">
    <div v-if="userProfile" class="max-w-md mx-auto space-y-6">
      
      <div class="relative bg-gradient-to-b from-white/[0.03] to-transparent p-6 rounded-[35px] border border-white/5 text-center shadow-2xl">
        <h2 class="text-xl font-black italic uppercase tracking-tighter">{{ userProfile.full_name || 'No Name Signal' }}</h2>
        <p class="text-[10px] font-bold text-gray-500 italic mt-0.5 tracking-tight">@{{ userProfile.username }}</p>

        <div class="mt-4 flex flex-col items-center gap-2">
          <div :class="[userRank.bg, userRank.border]" class="px-4 py-1 rounded-full border flex items-center gap-2 animate-pulse">
             <div :class="userRank.bg.replace('/10', '')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
             <span :class="userRank.color" class="text-[8px] font-black uppercase tracking-[0.2em] italic">
               Rank: {{ userRank.name }}
             </span>
          </div>

          <div class="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-3 py-1 rounded-lg">
            <StarIcon class="w-3 h-3 text-yellow-500 fill-current" />
            <span class="text-[10px] font-black italic tracking-tighter">{{ userProfile.reputation_score || '0.0' }}</span>
          </div>
        </div>

        </div>

      </div>
  </div>
</template>
