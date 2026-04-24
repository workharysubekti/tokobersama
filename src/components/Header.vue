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
  WalletIcon,
} from "@heroicons/vue/24/outline";
import { supabase } from "../lib/supabase.js";

const props = defineProps({
  userProfile: Object,
  authReady: Boolean,
});

const router = useRouter();
const searchStore = useSearchStore();
const isProfileOpen = ref(false);
const isCategoryOpen = ref(false);

const handleSearch = () => {
  if (searchStore.searchQuery.trim()) {
    router.push({ name: "Search", query: { q: searchStore.searchQuery } });
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/").then(() => window.location.reload());
};

// Fungsi Smooth Scroll ke Elite Section
const scrollToElite = () => {
  const element = document.getElementById('elite-section');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  } else {
    // Kalau user lagi di halaman lain, balik ke home dulu baru scroll
    router.push('/').then(() => {
      setTimeout(() => {
        document.getElementById('elite-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
  }
};

const categories = [
  "Trading Card Game(TCG)",
  "Action Figure",
  "Diecast",
  "Virtual Item",
  "Eksklusif"
];
</script>

<template>
  <nav
    class="fixed top-0 inset-x-0 z-[100] bg-black/90 backdrop-blur-xl border-b border-white/5"
  >
    <div class="max-w-[1440px] mx-auto px-3 sm:px-8">
      <div
        class="flex items-center justify-between h-16 md:h-20 gap-2 md:gap-6"
      >
        <div class="flex items-center gap-4 lg:gap-8">
          <div class="flex-shrink-0">
            <router-link
              to="/"
              class="flex items-center space-x-2 md:space-x-3 group"
            >
              <div
                class="w-8 h-8 md:w-9 md:h-9 bg-yellow-500 rounded-lg md:rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              >
                <span class="text-black font-black text-lg md:text-xl italic">T</span>
              </div>
              <span
                class="hidden lg:block text-sm md:text-xl font-[1000] italic tracking-tighter uppercase text-white"
              >
                TOKO<span class="text-yellow-500">BERSAMA</span>
              </span>
            </router-link>
          </div>

          <div class="hidden md:flex items-center gap-4 lg:gap-6">
            <div class="relative group">
              <button 
                @click="isCategoryOpen = !isCategoryOpen"
                class="flex items-center space-x-1 text-[10px] font-black uppercase tracking-widest italic text-gray-400 hover:text-yellow-500 transition-colors"
              >
                <span>Kategori</span>
                <ChevronDownIcon class="w-3 h-3 transition-transform group-hover:rotate-180" />
              </button>
              
              <div v-if="isCategoryOpen" class="absolute top-full mt-4 w-48 bg-[#0a0a0a] border border-white/10 rounded-2xl py-2 shadow-2xl z-[120]">
                <a v-for="cat in categories" :key="cat" href="#" class="block px-4 py-3 text-[9px] font-black uppercase tracking-widest italic text-gray-400 hover:bg-white/5 hover:text-yellow-500 border-b border-white/5 last:border-0">
                  {{ cat }}
                </a>
              </div>
            </div>

            <button 
              @click="scrollToElite"
              class="flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-widest italic text-yellow-500 hover:text-white transition-colors"
            >
              <TrophyIcon class="w-3.5 h-3.5" />
              <span>Elite Section</span>
            </button>
          </div>
        </div>

        <div class="flex-1 max-w-md relative group">
          <MagnifyingGlassIcon
            class="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-yellow-500 transition-colors"
          />
          <input
            v-model="searchStore.searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Cari Barang atau @User..."
            class="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-2 md:py-2.5 pl-9 md:pl-12 pr-3 text-[10px] md:text-xs font-bold tracking-widest uppercase text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/50 transition-all shadow-inner"
          />
        </div>

        <div class="flex-shrink-0 flex items-center">
          <div v-if="authReady" class="flex items-center gap-3 md:gap-4 lg:gap-6">
            
            <div v-if="userProfile" class="hidden sm:flex flex-col items-end px-3 py-1.5 border-r border-white/10">
              <span class="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 italic">Dompet Saya</span>
              <div class="flex items-center gap-1.5 font-black italic">
                <span class="text-[11px] text-white tracking-wider">Rp 500.000</span>
                <WalletIcon class="w-3.5 h-3.5 text-yellow-500" />
              </div>
            </div>

            <div v-if="userProfile" class="flex items-center gap-3 md:gap-4">
              <router-link
                to="/create-listing"
                class="hidden sm:flex items-center space-x-2 bg-yellow-500 hover:bg-white text-black px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <PlusIcon class="w-5 h-5 stroke-[3px]" />
                <span
                  class="hidden lg:block text-[10px] font-black uppercase tracking-widest italic"
                  >Buka Lelang</span
                >
              </router-link>

              <div class="relative">
                <button
                  @click="isProfileOpen = !isProfileOpen"
                  class="flex items-center p-1 bg-white/5 rounded-xl border border-white/10 hover:border-yellow-500/50 transition-colors"
                >
                  <div
                    class="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center font-black text-yellow-500 italic text-sm"
                  >
                    {{ userProfile.username?.charAt(0).toUpperCase() }}
                  </div>
                  <ChevronDownIcon class="w-3 h-3 text-gray-500 ml-2 mr-1" />
                </button>

                <transition
                  enter-active-class="transition duration-100"
                  enter-from-class="opacity-0 scale-95"
                  enter-to-class="opacity-100 scale-100"
                >
                  <div
                    v-if="isProfileOpen"
                    class="absolute right-0 mt-3 w-56 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl py-2 z-[110]"
                  >
                    <div class="sm:hidden px-4 py-3 border-b border-white/5 bg-white/5 mb-1">
                       <span class="text-[8px] font-black uppercase tracking-widest text-gray-500 italic">Saldo</span>
                       <p class="text-xs font-black text-yellow-500 italic">Rp 500.000</p>
                    </div>

                    <router-link
                      to="/profile"
                      @click="isProfileOpen = false"
                      class="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                      <UserCircleIcon class="w-5 h-5 text-yellow-500" />
                      <span class="text-[9px] font-black uppercase tracking-widest italic">Pengaturan Profil</span>
                    </router-link>

                    <button
                      @click="handleLogout"
                      class="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors border-t border-white/5 mt-1"
                    >
                      <ArrowRightOnRectangleIcon class="w-5 h-5" />
                      <span class="text-[9px] font-black uppercase tracking-widest italic">Keluar Akun</span>
                    </button>
                  </div>
                </transition>
              </div>
            </div>

            <router-link
              v-else
              to="/login"
              class="whitespace-nowrap bg-yellow-500 text-black px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[9px] md:text-[11px] uppercase italic tracking-tighter md:tracking-widest hover:bg-white transition-all shadow-lg active:scale-95"
            >
              Login Member
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
