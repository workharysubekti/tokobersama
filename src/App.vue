<script setup>
import { ref } from "vue";
import Header from "./components/Header.vue";
import CartModal from "./components/CartModal.vue";
import Toast from "./components/Toast.vue";

const scrollToKatalog = () => {
  const el = document.getElementById("product-grid");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const isCartOpen = ref(false);
</script>

<template>
  <div>
    <Header @open-cart="isCartOpen = true" />

    <router-view />
    <CartModal
      v-if="isCartOpen"
      @close="
        () => {
          console.log('Sinyal TUTUP diterima');
          isCartOpen = false;
        }
      "
    />
    <Toast />
  </div>
  <nav
    class="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
  >
    <div
      class="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-3 shadow-2xl flex items-center justify-around"
    >
      <router-link to="/" class="flex flex-col items-center gap-1 group">
        <div
          :class="[
            'p-2 rounded-2xl transition-all',
            $route.path === '/'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 group-hover:bg-slate-800',
          ]"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <span class="text-[10px] font-bold text-white/50">Beranda</span>
      </router-link>

      <button class="flex flex-col items-center gap-1 group relative">
        <div
          class="p-2 rounded-2xl text-slate-400 group-hover:bg-slate-800 transition-all"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span
            class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"
          ></span>
        </div>
        <span class="text-[10px] font-bold text-white/50">Notifikasi</span>
      </button>

      <button
        @click="scrollToKatalog"
        class="bg-white p-4 rounded-full -translate-y-6 shadow-xl shadow-blue-600/20 active:scale-90 transition-all border-4 border-slate-900"
      >
        <svg
          class="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      <button class="flex flex-col items-center gap-1 group">
        <div
          class="p-2 rounded-2xl text-slate-400 group-hover:bg-slate-800 transition-all"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <span class="text-[10px] font-bold text-white/50">Pesan</span>
      </button>

      <button class="flex flex-col items-center gap-1 group">
        <div
          class="p-2 rounded-2xl text-slate-400 group-hover:bg-slate-800 transition-all"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <span class="text-[10px] font-bold text-white/50">Profil</span>
      </button>
    </div>
  </nav>
</template>
