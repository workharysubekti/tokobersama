<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  Squares2X2Icon,
  UsersIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  FireIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const route = useRoute();

const menuItems = [
  { name: "Dashboard", icon: Squares2X2Icon, path: "/admin" },
  { name: "Live Auctions", icon: FireIcon, path: "/admin/auctions" },
  { name: "Users", icon: UsersIcon, path: "/admin/users" },
  { name: "Tickets", icon: ChatBubbleLeftRightIcon, path: "/admin/tickets" },
  { name: "Stats", icon: ChartBarIcon, path: "/admin/stats" },
  { name: "Income", icon: BanknotesIcon, path: "/admin/income" },
];

const { data, error } = await supabase
  .from("reports")
  .select(
    `
    *,
    reporter:profiles(username), 
    product:products(name, image_url)
  `,
  )
  .order("created_at", { ascending: false });

const logout = () => {
  // Masukkan logic clear session Supabase di sini jika perlu
  router.push("/auth");
};
</script>

<template>
  <div class="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
    <aside
      class="w-20 md:w-64 bg-[#0d0d0d] border-r border-white/5 flex flex-col transition-all duration-300 shrink-0 z-[60]"
    >
      <div class="p-6 flex items-center gap-3">
        <div
          class="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]"
        >
          <ShieldCheckIcon class="w-5 h-5 text-black stroke-[2.5]" />
        </div>
        <span
          class="hidden md:block font-[1000] italic text-xl tracking-tighter uppercase"
        >
          ADMIN<span class="text-yellow-500">VAULT</span>
        </span>
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

    <main
      class="flex-1 overflow-y-auto no-scrollbar bg-[#050505] relative flex flex-col"
    >
      <header
        class="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-8 py-7 flex justify-between items-center w-full"
      >
        <div class="flex flex-col">
          <h2
            class="font-[1000] italic text-xl md:text-2xl tracking-tighter uppercase leading-none"
          >
            COMMAND<span class="text-yellow-500">CENTER</span>
          </h2>
        </div>

        <div class="flex flex-col items-end gap-1.5">
          <div
            class="flex items-center gap-2 bg-white/[0.03] px-3 py-1 rounded-full border border-white/5"
          >
            <div
              class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"
            ></div>
            <span
              class="text-[9px] font-black uppercase italic tracking-widest text-green-500"
              >System Live</span
            >
          </div>
          <h2
            class="font-black italic uppercase tracking-widest text-[9px] text-gray-500"
          >
            Active Session: <span class="text-white">Authorized Admin</span>
          </h2>
        </div>
      </header>

      <div class="p-8 pb-32">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Menghilangkan scrollbar tapi tetap bisa scroll */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
