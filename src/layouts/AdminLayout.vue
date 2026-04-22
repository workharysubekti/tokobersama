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
      class="w-20 md:w-64 bg-[#0d0d0d] border-r border-white/5 flex flex-col transition-all duration-300 shrink-0"
    ></aside>

    <main class="flex-1 overflow-y-auto no-scrollbar bg-[#050505]">
      <header
        class="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-8 py-8 flex justify-between items-end"
      >
        <div>
          <p
            class="text-[8px] font-black uppercase text-yellow-500 tracking-[0.4em] italic mb-1"
          >
            Command Center
          </p>
          <h2
            class="font-[1000] italic text-2xl md:text-3xl tracking-tighter uppercase"
          >
            ADMIN<span class="text-yellow-500">VAULT</span>
          </h2>
        </div>

        <div class="flex flex-col items-end gap-1">
          <div
            class="flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/5"
          >
            <div
              class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"
            ></div>
            <span
              class="text-[9px] font-black uppercase italic tracking-widest text-green-500"
              >System Live</span
            >
          </div>
          <p
            class="text-[8px] font-black uppercase tracking-widest text-gray-600 italic"
          >
            Active Session: <span class="text-white">Authorized</span>
          </p>
        </div>
      </header>

      <div class="p-8 pb-24">
        <router-view />
      </div>
    </main>
  </div>
</template>
