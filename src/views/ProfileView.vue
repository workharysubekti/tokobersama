<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon,
  StarIcon,
  WalletIcon,
  Cog6ToothIcon,
} from "@heroicons/vue/24/outline";

const user = ref(null);
const profile = ref(null);
const loading = ref(true);
const router = useRouter();

const fetchProfile = async () => {
  loading.value = true;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    user.value = session.user;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (data) profile.value = data;
  } else {
    router.push("/login");
  }
  loading.value = false;
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/");
  window.location.reload();
};

onMounted(() => {
  fetchProfile();
});
</script>

<template>
  <div
    class="min-h-screen bg-[#0a0a0a] pt-28 pb-24 px-6 relative overflow-hidden text-white"
  >
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-yellow-500/10 blur-[120px] -z-10"
    ></div>

    <div v-if="!loading && profile" class="max-w-md mx-auto">
      <div class="flex flex-col items-center text-center mb-10">
        <div class="relative mb-4 group">
          <div
            class="absolute -inset-1 bg-gradient-to-tr from-yellow-500 to-amber-200 rounded-full blur opacity-40 group-hover:opacity-70 transition duration-1000"
          ></div>
          <div
            class="relative w-24 h-24 bg-[#111] rounded-full border-2 border-white/10 flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="profile.avatar_url"
              :src="profile.avatar_url"
              class="w-full h-full object-cover"
            />
            <UserCircleIcon v-else class="w-16 h-16 text-gray-700" />
          </div>
          <div
            class="absolute bottom-0 right-0 bg-yellow-500 text-black p-1.5 rounded-lg shadow-xl border-2 border-[#0a0a0a]"
          >
            <ShieldCheckIcon class="w-4 h-4" />
          </div>
        </div>

        <h2 class="text-2xl font-[1000] italic uppercase tracking-tighter">
          {{ profile.full_name || profile.username }}
        </h2>
        <p
          class="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1 italic"
        >
          @{{ profile.username }}
        </p>

        <div
          class="mt-6 w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500"
            >
              <StarIcon class="w-6 h-6 fill-current" />
            </div>
            <div class="text-left">
              <p
                class="text-[8px] font-black text-gray-500 uppercase tracking-widest"
              >
                Collector Reputation
              </p>
              <p class="text-lg font-black italic">
                {{ profile.reputation_score || 0 }}
                <span
                  class="text-[10px] text-gray-400 not-italic uppercase font-bold"
                  >Points</span
                >
              </p>
            </div>
          </div>
          <div class="text-right">
            <p
              class="text-[8px] font-black text-green-500 uppercase tracking-widest italic"
            >
              Verified Player
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-8">
        <div class="bg-white/5 border border-white/5 rounded-2xl p-4">
          <p class="text-[8px] font-black text-gray-500 uppercase mb-1">
            Active Bids
          </p>
          <div class="flex items-center justify-between">
            <span class="text-xl font-black italic">12</span>
            <ShoppingBagIcon class="w-5 h-5 text-gray-700" />
          </div>
        </div>
        <div class="bg-white/5 border border-white/5 rounded-2xl p-4">
          <p class="text-[8px] font-black text-gray-500 uppercase mb-1">
            Vault Value
          </p>
          <div class="flex items-center justify-between">
            <span class="text-xl font-black italic text-yellow-500">2.4M</span>
            <WalletIcon class="w-5 h-5 text-gray-700" />
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <p
          class="text-[9px] font-black text-gray-600 uppercase tracking-[.4em] ml-2 mb-2"
        >
          Interaction Hub
        </p>

        <button
          @click="router.push('/messages')"
          class="w-full group flex items-center justify-between bg-white/5 hover:bg-yellow-500 transition-all p-4 rounded-[20px] border border-white/5 hover:border-yellow-500"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center group-hover:bg-black/20"
            >
              <ChatBubbleLeftRightIcon
                class="w-5 h-5 text-yellow-500 group-hover:text-black"
              />
            </div>
            <div class="text-left">
              <p
                class="text-xs font-black uppercase italic group-hover:text-black"
              >
                Messages
              </p>
              <p
                class="text-[9px] text-gray-500 font-bold group-hover:text-black/70 italic leading-none"
              >
                Negosiasi & Chat Collector
              </p>
            </div>
          </div>
          <div
            class="w-5 h-5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-black animate-pulse group-hover:bg-black group-hover:text-yellow-500"
          >
            3
          </div>
        </button>

        <button
          class="w-full group flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-all p-4 rounded-[20px] border border-white/5"
        >
          <div
            class="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center"
          >
            <Cog6ToothIcon
              class="w-5 h-5 text-gray-400 group-hover:text-white"
            />
          </div>
          <div class="text-left">
            <p class="text-xs font-black uppercase italic">Vault Settings</p>
            <p class="text-[9px] text-gray-600 font-bold italic leading-none">
              Keamanan & Data Akun
            </p>
          </div>
        </button>

        <button
          @click="handleLogout"
          class="w-full group flex items-center gap-4 bg-red-500/5 hover:bg-red-500 transition-all p-4 rounded-[20px] border border-red-500/10 mt-8"
        >
          <div
            class="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center group-hover:bg-black/20"
          >
            <ArrowRightOnRectangleIcon
              class="w-5 h-5 text-red-500 group-hover:text-white"
            />
          </div>
          <div class="text-left">
            <p
              class="text-xs font-black uppercase italic text-red-500 group-hover:text-white"
            >
              Terminate Session
            </p>
            <p
              class="text-[9px] text-red-900 font-bold italic leading-none group-hover:text-white/70"
            >
              Keluar dari aplikasi
            </p>
          </div>
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-40">
      <div
        class="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"
      ></div>
    </div>
  </div>
</template>

<style scoped>
/* Transisi halus untuk hover */
button {
  -webkit-tap-highlight-color: transparent;
}
</style>
