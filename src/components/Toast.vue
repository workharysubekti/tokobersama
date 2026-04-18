<script setup>
import { useCart } from "../store/cart.js";
const { showToast, toastMsg } = useCart();
</script>

<template>
  <Transition
    enter-active-class="transform transition duration-300 ease-out"
    enter-from-class="translate-y-10 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showToast"
      class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999]"
    >
      <div
        class="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
      >
        <span class="text-green-400">✅</span>
        <span class="font-bold text-sm">{{ toastMsg }}</span>
      </div>
    </div>
  </Transition>
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
