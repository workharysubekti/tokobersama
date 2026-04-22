<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  Squares2X2Icon,
  ShoppingBagIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const route = useRoute();

const menuItems = [
  { name: "Dashboard", icon: Squares2X2Icon, path: "/admin" },
  { name: "Users", icon: UsersIcon, path: "/admin/users" },
  { name: "Tickets", icon: ChatBubbleLeftRightIcon, path: "/admin/tickets" },
  { name: "Stats", icon: ChartBarIcon, path: "/admin/stats" }, // TAMBAH INI
  { name: "Income", icon: BanknotesIcon, path: "/admin/income" }, // TAMBAH INI
];

const logout = () => {
  // Logic logout Mas di sini
  router.push("/auth");
};
</script>

<template>
  <div class="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
    <aside
      class="w-20 md:w-64 bg-[#0d0d0d] border-r border-white/5 flex flex-col transition-all duration-300"
    >
      <div class="p-6 flex items-center gap-3">
        <div
          class="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center"
        >
          <ShieldCheckIcon class="w-5 h-5 text-black stroke-[2.5]" />
        </div>
        <span
          class="hidden md:block font-[1000] italic text-xl tracking-tighter uppercase"
          >ADMIN<span class="text-yellow-500">VAULT</span></span
        >
      </div>

      <nav class="flex-1 px-3 space-y-2 mt-4">
        <router-link
          v-for="item in menuItems"
          :key="item.name"
          :to="item.path"
          class="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group"
          :class="
            route.path === item.path
              ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.2)]'
              : 'hover:bg-white/5 text-gray-500'
          "
        >
          <component :is="item.icon" class="w-6 h-6 shrink-0" />
          <span
            class="hidden md:block font-black uppercase italic text-[10px] tracking-widest"
            >{{ item.name }}</span
          >
        </router-link>
      </nav>

      <div class="p-4 border-t border-white/5">
        <button
          @click="logout"
          class="flex items-center gap-4 px-4 py-3 w-full text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
        >
          <ArrowLeftOnRectangleIcon class="w-6 h-6" />
          <span
            class="hidden md:block font-black uppercase italic text-[10px] tracking-widest"
            >Terminate</span
          >
        </button>
      </div>
    </aside>

    <main class="flex-1 overflow-y-auto no-scrollbar bg-[#050505] relative">
      <header
        class="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex justify-between items-center"
      >
        <h2
          class="font-black italic uppercase tracking-widest text-[11px] text-gray-500"
        >
          Active Session: <span class="text-white">Authorized Admin</span>
        </h2>
        <div class="flex items-center gap-4">
          <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span
            class="text-[9px] font-black uppercase italic tracking-widest text-green-500"
            >System Live</span
          >
        </div>
      </header>

      <div class="p-8">
        <router-view />
      </div>
    </main>
  </div>
</template>
