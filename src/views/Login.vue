<script setup>
import { ref } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { notify } from "../utils/notify";

const router = useRouter();
const email = ref("");
const password = ref("");

const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });

  if (error) {
    notify.error("Gagal Login", error.message);
  } else {
    notify.success("Gacor!", "Selamat datang kembali, Mas!");
    router.push("/").then(() => {
      window.location.reload();
    }); // Balik ke Home
  }
};
</script>

<template>
  <div
    class="fixed inset-0 h-screen w-full bg-black flex items-center justify-center px-4 overflow-hidden z-[110]"
  >
    <div
      class="max-w-md w-full bg-gray-900 p-10 rounded-[30px] border border-gray-800 shadow-2xl"
    >
      <h2 class="text-3xl font-black text-white italic mb-2 tracking-tighter">
        MASUK KE AKUN
      </h2>
      <p class="text-gray-500 text-sm mb-8 uppercase tracking-widest">
        TokoBersama Auction Platform
      </p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full bg-black border border-gray-800 p-4 text-white focus:border-yellow-500 outline-none transition-all"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          class="w-full bg-black border border-gray-800 p-4 text-white focus:border-yellow-500 outline-none transition-all"
        />
        <button
          type="submit"
          class="w-full bg-yellow-500 py-4 font-bold uppercase tracking-widest text-black hover:bg-white transition-all"
        >
          Masuk Sekarang
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Paksa body tidak boleh scroll saat komponen ini muncul */
:deep(body) {
  overflow: hidden !important;
  touch-action: none; /* Matikan gerakan sentuh untuk scroll */
}
</style>
