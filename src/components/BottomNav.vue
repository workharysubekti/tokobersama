<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
  UserIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";
import { useRoute } from "vue-router";

const route = useRoute();
const userProfile = ref(null);
const isLoading = ref(true);

const getProfile = async (user) => {
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    userProfile.value = data;
  } else {
    userProfile.value = null;
  }
  isLoading.value = false;
};

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await getProfile(session.user);
  else isLoading.value = false;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) await getProfile(session.user);
    else {
      userProfile.value = null;
      isLoading.value = false;
    }
  });
});
</script>

<template>
  <div class="fixed bottom-0 inset-x-0 z-[100] md:hidden px-4 pb-6 pointer-events-none">
    <div class="max-w-md mx-auto pointer-events-auto">
      <nav
        :class="[
          'bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 px-2 py-3 rounded-[32px] grid items-end shadow-[0_-10px_40px_rgba(0,0,0,0.8)] transition-all duration-500',
          userProfile ? 'grid-cols-5' : 'grid-cols-4'
        ]"
      >
        <router-link to="/" class="flex flex-col items-center gap-1 group">
          <HomeIcon :class="[route.path === '/' ? 'text-yellow-500 scale-110' : 'text-gray-500', 'w-6 h-6 transition-all']" />
          <span :class="[route.path === '/' ? 'text-yellow-500' : 'text-gray-500', 'text-[7px] uppercase font-black italic tracking-tighter']">Home</span>
        </router-link>

        <router-link to="/search" class="flex flex-col items-center gap-1 group">
          <MagnifyingGlassIcon :class="[route.path === '/search' ? 'text-yellow-500 scale-110' : 'text-gray-500', 'w-6 h-6 transition-all']" />
          <span :class="[route.path === '/search' ? 'text-yellow-500' : 'text-gray-500', 'text-[7px] uppercase font-black italic tracking-tighter']">Search</span>
        </router-link>

        <div v-if="userProfile" class="flex flex-col items-center">
          <router-link to="/create-listing" class="relative -top-6">
            <div class="p-3 bg-yellow-500 rounded-2xl border-[6px] border-[#0f0f0f] active:scale-90 transition-transform shadow-[0_10px_20px_rgba(234,179,8,0.3)]">
              <PlusIcon class="w-6 h-6 text-black stroke-[3px]" />
            </div>
          </router-link>
          <span class="text-[7px] uppercase font-black text-gray-500 italic -mt-5">Lelang</span>
        </div>

        <router-link to="/my-bids" class="flex flex-col items-center gap-1 group">
          <TrophyIcon :class="[route.path === '/my-bids' ? 'text-yellow-500 scale-110' : 'text-gray-500', 'w-6 h-6 transition-all']" />
          <span :class="[route.path === '/my-bids' ? 'text-yellow-500' : 'text-gray-500', 'text-[7px] uppercase font-black italic tracking-tighter']">Bids</span>
        </router-link>

        <router-link :to="userProfile ? '/profile' : '/login'" class="flex flex-col items-center gap-1 group">
          <UserIcon :class="[route.path === '/profile' || route.path === '/login' ? 'text-yellow-500 scale-110' : 'text-gray-500', 'w-6 h-6 transition-all']" />
          <span :class="[route.path === '/profile' || route.path === '/login' ? 'text-yellow-500' : 'text-gray-500', 'text-[7px] uppercase font-black italic tracking-tighter']">
            {{ userProfile ? 'User' : 'Login' }}
          </span>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<style scoped>
div { -webkit-tap-highlight-color: transparent; }
.router-link-active span { text-shadow: 0 0 10px rgba(234, 179, 8, 0.4); }
</style>
