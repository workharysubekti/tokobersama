<script setup>
import { ref, computed } from "vue";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
} from "@heroicons/vue/24/outline";

const activeTab = ref("activity");
const notifications = ref({
  activity: [
    {
      id: 1,
      title: "Outbid!",
      message: "Penawaranmu di iPhone 15 dilewati!",
      time: "2 mins ago",
      link: "/product/1",
    },
    {
      id: 2,
      title: "Approved",
      message: "Produk Laptop Gaming kamu sudah Live!",
      time: "1 hour ago",
      link: "/my-auctions",
    },
  ],
  support: [
    {
      id: 1,
      title: "Ticket Resolved",
      message: 'Laporan #123: "Masalah Bid" sudah dibalas Admin.',
      time: "5 hours ago",
    },
  ],
  broadcast: [
    {
      id: 1,
      title: "Update V2.0",
      message: "Fitur Live Monitor sekarang sudah aktif!",
      time: "1 day ago",
    },
  ],
});

// Nanti datanya ditarik dari Supabase, sekarang kita buat UI-nya dulu biar cepat
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-[1000] italic uppercase tracking-tighter">
        System <span class="text-yellow-500">Alerts</span>
      </h2>
    </div>

    <div class="flex gap-2 bg-white/5 p-1 rounded-2xl w-full md:w-fit">
      <button
        @click="activeTab = 'activity'"
        :class="
          activeTab === 'activity'
            ? 'bg-yellow-500 text-black'
            : 'text-gray-500'
        "
        class="flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
      >
        <BellIcon class="w-3 h-3" /> Activity
      </button>
      <button
        @click="activeTab = 'support'"
        :class="
          activeTab === 'support' ? 'bg-yellow-500 text-black' : 'text-gray-500'
        "
        class="flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
      >
        <ChatBubbleLeftRightIcon class="w-3 h-3" /> Support
      </button>
      <button
        @click="activeTab = 'broadcast'"
        :class="
          activeTab === 'broadcast'
            ? 'bg-yellow-500 text-black'
            : 'text-gray-500'
        "
        class="flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center gap-2"
      >
        <MegaphoneIcon class="w-3 h-3" /> Updates
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="notif in notifications[activeTab]"
        :key="notif.id"
        class="bg-[#0d0d0d] border border-white/5 p-4 rounded-[24px] hover:border-yellow-500/50 transition-all cursor-pointer"
      >
        <div class="flex justify-between items-start">
          <div>
            <p
              class="text-[10px] font-black text-yellow-500 uppercase italic tracking-widest"
            >
              {{ notif.title }}
            </p>
            <p class="text-xs text-gray-300 font-bold mt-1 uppercase">
              {{ notif.message }}
            </p>
          </div>
          <span class="text-[8px] text-gray-600 font-bold italic">{{
            notif.time
          }}</span>
        </div>
      </div>

      <div
        v-if="notifications[activeTab].length === 0"
        class="py-20 text-center opacity-20"
      >
        <p class="text-[10px] font-black uppercase tracking-[0.5em] italic">
          No Logs Found
        </p>
      </div>
    </div>
  </div>
</template>
