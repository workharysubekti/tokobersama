<script setup>
import { ref } from "vue";
import Header from "./components/Header.vue";
import Toast from "./components/Toast.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col relative bg-gray-50">
    <Header />

    <main class="flex-1 pb-32 md:pb-0">
      <router-view />
    </main>

    <nav>
      <div
        class="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-3 shadow-2xl flex items-center justify-around"
      >
        <router-link to="/" class="flex flex-col items-center gap-1 group">
          <div
            :class="[
              'p-2 rounded-2xl transition-all',
              $route.path === '/'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
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
          <span
            class="text-[9px] font-bold text-white/50 uppercase tracking-tighter"
            >Beranda</span
          >
        </router-link>

        <router-link
          to="/notifications"
          class="flex flex-col items-center gap-1 group relative"
        >
          <div
            :class="[
              'p-2 rounded-2xl transition-all',
              $route.path === '/notifications'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <span
            class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"
          ></span>
          <span
            class="text-[9px] font-bold text-white/50 uppercase tracking-tighter"
            >Notif</span
          >
        </router-link>

        <router-link
          to="/admin"
          class="relative -top-2 flex flex-col items-center group"
        >
          <div
            class="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-active:bg-blue-700"
          >
            <svg
              class="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span
            class="text-[10px] font-bold text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            JUAL
          </span>
        </router-link>

        <router-link
          to="/messages"
          class="flex flex-col items-center gap-1 group"
        >
          <div
            :class="[
              'p-2 rounded-2xl transition-all',
              $route.path === '/messages'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
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
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <span
            class="text-[9px] font-bold text-white/50 uppercase tracking-tighter"
            >Pesan</span
          >
        </router-link>

        <router-link
          to="/profile"
          class="flex flex-col items-center gap-1 group"
        >
          <div
            :class="[
              'p-2 rounded-2xl transition-all',
              $route.path === '/profile'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <span
            class="text-[9px] font-bold text-white/50 uppercase tracking-tighter"
            >Profil</span
          >
        </router-link>
      </div>
    </nav>
  </div>
</template>
