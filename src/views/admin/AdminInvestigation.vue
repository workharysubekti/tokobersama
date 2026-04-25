<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase";

const testData = ref("Koneksi Supabase OK");

onMounted(() => {
  console.log("Halaman Admin Terpasang!");
});
</script>

<template>
  <div class="min-h-screen bg-red-900 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-5xl font-black text-white italic">ADMIN ROOM TEST</h1>
      <p class="text-white mt-4">{{ testData }}</p>
    </div>
  </div>
</template>
