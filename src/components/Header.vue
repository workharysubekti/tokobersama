<script setup>
import { ref } from "vue";
import { useSearchStore } from "../store/search.js";
import { useRouter } from "vue-router";
import {
  UserCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  TrophyIcon,
  ChevronDownIcon,
} from "@heroicons/vue/24/outline";
import { supabase } from "../lib/supabase.js";

const props = defineProps({
  userProfile: Object,
  authReady: Boolean,
});

const router = useRouter();
const searchStore = useSearchStore();
const isProfileOpen = ref(false);

const categories = [
  "TCG",
  "FIGURE",
  "DIECAST",
  "THRIFT",
  "VIRTUAL",
  "EKSKLUSIF",
];

const handleSearch = () => {
  if (searchStore.searchQuery.trim()) {
    router.push({ name: "Search", query: { q: searchStore.searchQuery } });
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
};
</script>

<template>
  <nav
    class="fixed top-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5"
  >
    <div class="max-w-[1440px] mx-auto px-4 sm:px-8">
      <div class="grid grid-cols-3 items-center h-20">
        <div class="flex justify-start">
          <router-link to="/" class="flex items-center space-x-3 group">
            <div
              class="w-9 h-9 bg-yellow-500 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
            >
              <span class="text-black font-black text-xl italic">T</span>
            </div>
            <span
              class="hidden lg:block text-xl font-[1000] italic tracking-tighter uppercase text-white"
            >
              TOKO<span class="text-yellow-500">BERSAMA</span>
            </span>
          </router-link>
        </div>

        <div class="flex justify-center">
          <div class="w-full max-w-md relative group">
            <MagnifyingGlassIcon
              class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-500 transition-colors"
            />
            <input
              v-model="searchStore.searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Cari lelang idaman..."
              class="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-xs font-bold tracking-widest uppercase text-white placeholder:text-gray-500 focus:placeholder:text-transparent focus:outline-none focus:border-yellow-500/50 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>
        </div>

        <div class="flex justify-end items-center space-x-6">
          <div v-if="authReady" class="flex items-center space-x-6">
            <div v-if="userProfile" class="flex items-center space-x-6">
              <router-link
                to="/admin"
                class="hidden md:flex items-center space-x-2 bg-yellow-500 hover:bg-white text-black px-4 py-2 rounded-xl transition-all duration-300 shadow-[0_5px_15px_rgba(234,179,8,0.2)] active:scale-95 group"
              >
                <PlusIcon class="w-5 h-5 stroke-[3px]" />
                <span
                  class="text-[10px] font-black uppercase tracking-widest italic"
                  >Buka Lelang</span
                >
              </router-link>

              <div
                class="hidden xl:block text-right border-l border-white/10 pl-6"
              >
                <p
                  class="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-0.5"
                >
                  Reputation
                </p>
                <p
                  class="text-[11px] font-black text-yellow-500 uppercase italic leading-none"
                >
                  {{ userProfile.reputation_score }}
                  <span class="text-[8px] text-gray-400">PTS</span>
                </p>
              </div>

              <div class="relative">
                <button
                  @click="isProfileOpen = !isProfileOpen"
                  class="flex items-center space-x-3 p-1 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                >
                  <div
                    class="w-9 h-9 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center font-black text-yellow-500 italic shadow-lg"
                  >
                    {{ userProfile.username?.charAt(0).toUpperCase() }}
                  </div>
                  <ChevronDownIcon
                    class="w-3 h-3 text-gray-500 group-hover:text-white transition-colors mr-2"
                  />
                </button>

                <transition
                  enter-active-class="transition duration-100 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-75 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div
                    v-if="isProfileOpen"
                    class="absolute right-0 mt-3 w-52 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 z-[110]"
                  >
                    <div class="px-4 py-2 border-b border-white/5 mb-2">
                      <p
                        class="text-[8px] text-gray-500 uppercase font-black tracking-tighter"
                      >
                        Signed in as
                      </p>
                      <p
                        class="text-[10px] text-white font-bold truncate italic"
                      >
                        {{ userProfile.username }}
                      </p>
                    </div>

                    <router-link
                      to="/profile"
                      @click="isProfileOpen = false"
                      class="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                      <UserCircleIcon class="w-5 h-5 text-yellow-500" />
                      <span
                        class="text-[10px] font-black uppercase tracking-widest italic"
                        >Profil Saya</span
                      >
                    </router-link>

                    <router-link
                      to="/my-bids"
                      @click="isProfileOpen = false"
                      class="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 text-gray-400 hover:text-white transition-colors border-b border-white/5"
                    >
                      <TrophyIcon class="w-5 h-5 text-yellow-500" />
                      <span
                        class="text-[10px] font-black uppercase tracking-widest italic"
                        >Riwayat Bids</span
                      >
                    </router-link>

                    <button
                      @click="handleLogout"
                      class="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon class="w-5 h-5" />
                      <span
                        class="text-[10px] font-black uppercase tracking-widest italic"
                        >Log Out</span
                      >
                    </button>
                  </div>
                </transition>
              </div>
            </div>

            <router-link
              v-else
              to="/login"
              class="bg-yellow-500 text-black px-6 py-2.5 rounded-xl font-[1000] text-[11px] uppercase italic tracking-widest active:scale-95 hover:bg-white transition-all shadow-[0_10px_20px_rgba(234,179,8,0.2)]"
            >
              Login Member
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
