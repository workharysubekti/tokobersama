<script setup>
defineProps(["show", "message"]);
</script>

<template>
  <transition name="toast-fade">
    <div v-if="show" class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200]">
      <div
        class="bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] border border-white/10"
      >
        <div
          class="bg-green-500 rounded-full p-1 shadow-lg shadow-green-500/20"
        >
          <svg
            class="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <div class="flex flex-col">
          <span
            class="text-[11px] font-black tracking-widest uppercase opacity-50"
            >Berhasil</span
          >
          <span class="text-xs font-bold leading-none">{{ message }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Animasi biar toast-nya muncul halus dari bawah */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
