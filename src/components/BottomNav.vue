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
  // Cek session awal dengan lebih cepat
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) await getProfile(session.user);
  else isLoading.value = false;

  // Listener untuk perubahan status login
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
  <div
    class="fixed bottom-0 inset-x-0 z-[100] md:hidden px-4 pb-6 pointer-events-none"
  >
    <div class="max-w-md mx-auto pointer-events-auto">
      <nav
        class="bg-gray-900/90 backdrop-blur-xl border border-white/5 px-2 py-3 rounded-[32px] grid grid-cols-5 items-end shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <router-link to="/" class="flex flex-col items-center gap-1 group">
          <HomeIcon
            :class="[
              route.path === '/'
                ? 'text-yellow-500 scale-110'
                : 'text-gray-500',
              'w-6 h-6 transition-all duration-300',
            ]"
          />
          <span
            :class="[
              route.path === '/' ? 'text-yellow-500' : 'text-gray-500',
              'text-[8px] uppercase tracking-widest font-black italic',
            ]"
            >Home</span
          >
        </router-link>

        <router-link
          to="/search"
          class="flex flex-col items-center gap-1 group"
        >
          <MagnifyingGlassIcon
            :class="[
              route.path === '/search'
                ? 'text-yellow-500 scale-110'
                : 'text-gray-500',
              'w-6 h-6 transition-all duration-300',
            ]"
          />
          <span
            :class="[
              route.path === '/search' ? 'text-yellow-500' : 'text-gray-500',
              'text-[8px] uppercase tracking-widest font-black italic',
            ]"
            >Search</span
          >
        </router-link>

        <div class="flex flex-col items-center">
          <router-link v-if="userProfile" to="/admin" class="relative -top-6">
            <div
              class="p-3 bg-yellow-500 rounded-2xl border-[6px] border-black active:scale-90 transition-transform"
            >
              <PlusIcon class="w-6 h-6 text-black stroke-[3px]" />
            </div>
          </router-link>
          <div v-else class="w-10 h-10"></div>
          <span
            v-if="userProfile"
            class="text-[8px] uppercase tracking-widest text-gray-500 font-black italic -mt-5"
            >Lelang</span
          >
        </div>

        <router-link
          to="/my-bids"
          class="flex flex-col items-center gap-1 group"
        >
          <TrophyIcon
            :class="[
              route.path === '/my-bids'
                ? 'text-yellow-500 scale-110'
                : 'text-gray-500',
              'w-6 h-6 transition-all duration-300',
            ]"
          />
          <span
            :class="[
              route.path === '/my-bids' ? 'text-yellow-500' : 'text-gray-500',
              'text-[8px] uppercase tracking-widest font-black italic',
            ]"
            >Bids</span
          >
        </router-link>

        <router-link
          to="/profile"
          class="flex flex-col items-center gap-1 group"
        >
          <UserIcon
            :class="[
              route.path === '/profile'
                ? 'text-yellow-500 scale-110'
                : 'text-gray-500',
              'w-6 h-6 transition-all duration-300',
            ]"
          />
          <span
            :class="[
              route.path === '/profile' ? 'text-yellow-500' : 'text-gray-500',
              'text-[8px] uppercase tracking-widest font-black italic',
            ]"
            >User</span
          >
        </router-link>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Menghilangkan highlight biru saat diklik di HP */
div {
  -webkit-tap-highlight-color: transparent;
}

.router-link-active span {
  text-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
}
</style>
