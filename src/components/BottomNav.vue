<script setup>
import { HomeIcon, ChatBubbleLeftRightIcon, TrophyIcon, UserIcon, PlusIcon } from "@heroicons/vue/24/outline";
import { useRoute } from "vue-router";

// Cukup terima data dari App.vue, jangan fetch sendiri lagi!
const props = defineProps({ userProfile: Object });
const route = useRoute();
</script>

<template>
  <div class="fixed bottom-0 inset-x-0 z-[100] md:hidden px-4 pb-6 pointer-events-none">
    <div class="max-w-md mx-auto pointer-events-auto bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/5 rounded-[32px] p-2 flex justify-around items-center shadow-2xl">
      
      <router-link to="/" class="flex flex-col items-center gap-1 group">
        <HomeIcon :class="[route.path === '/' ? 'text-yellow-500 scale-110' : 'text-gray-500', 'w-6 h-6 transition-all']" />
        <span class="text-[7px] uppercase font-black italic">Home</span>
      </router-link>

      <router-link to="/messages" class="flex flex-col items-center gap-1 group">
        <ChatBubbleLeftRightIcon :class="[route.path.includes('/messages') ? 'text-yellow-500' : 'text-gray-500', 'w-6 h-6']" />
        <span class="text-[7px] uppercase font-black italic">Chat</span>
      </router-link>

      <router-link v-if="userProfile" to="/create-listing" class="relative -top-6">
        <div class="p-3 bg-yellow-500 rounded-2xl border-[6px] border-[#0f0f0f] shadow-lg">
          <PlusIcon class="w-6 h-6 text-black stroke-[3px]" />
        </div>
      </router-link>

      <router-link to="/my-bids" class="flex flex-col items-center gap-1 group">
        <TrophyIcon :class="[route.path === '/my-bids' ? 'text-yellow-500' : 'text-gray-500', 'w-6 h-6']" />
        <span class="text-[7px] uppercase font-black italic">Bids</span>
      </router-link>

      <router-link :to="userProfile ? '/profile' : '/login'" class="flex flex-col items-center gap-1 group">
        <UserIcon :class="[route.path === '/profile' || route.path === '/login' ? 'text-yellow-500' : 'text-gray-500', 'w-6 h-6']" />
        <span class="text-[7px] uppercase font-black italic">{{ userProfile ? 'Me' : 'Login' }}</span>
      </router-link>

    </div>
  </div>
</template>
