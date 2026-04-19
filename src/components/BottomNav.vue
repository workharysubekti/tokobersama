<script setup>
import {
  HomeIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
  UserIcon,
} from "@heroicons/vue/24/outline";
</script>

<template>
  <div
    class="fixed bottom-0 inset-x-0 z-[100] md:hidden px-4 pb-6 pointer-events-none"
  >
    <div class="max-w-md mx-auto pointer-events-auto">
      <nav
        class="bg-gray-900/80 backdrop-blur-xl border border-gray-800 px-8 py-4 rounded-[30px] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <router-link to="/" class="flex flex-col items-center gap-1 group">
          <HomeIcon
            class="w-6 h-6 text-gray-500 group-[.router-link-active]:text-yellow-500 transition-colors"
          />
          <span
            class="text-[9px] uppercase tracking-widest text-gray-500 group-[.router-link-active]:text-yellow-500 font-bold italic"
            >Home</span
          >
        </router-link>

        <button class="flex flex-col items-center gap-1 group">
          <MagnifyingGlassIcon
            class="w-6 h-6 text-gray-500 group-hover:text-yellow-500 transition-colors"
          />
          <span
            class="text-[9px] uppercase tracking-widest text-gray-500 italic font-bold"
            >Search</span
          >
        </button>

        <router-link
          to="/my-bids"
          class="flex flex-col items-center gap-1 group"
        >
          <TrophyIcon
            class="w-6 h-6 text-gray-500 group-[.router-link-active]:text-yellow-500 transition-colors"
          />
          <span
            class="text-[9px] uppercase tracking-widest text-gray-500 group-[.router-link-active]:text-yellow-500 font-bold italic"
            >Bids</span
          >
        </router-link>

        <router-link
          to="/profile"
          class="flex flex-col items-center gap-1 group"
        >
          <UserIcon
            class="w-6 h-6 text-gray-500 group-[.router-link-active]:text-yellow-500 transition-colors"
          />
          <span
            class="text-[9px] uppercase tracking-widest text-gray-500 group-[.router-link-active]:text-yellow-500 font-bold italic"
            >User</span
          >
        </router-link>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Animasi halus saat icon aktif */
.router-link-active svg {
  transform: translateY(-2px);
  transition: transform 0.3s ease;
}
</style>
