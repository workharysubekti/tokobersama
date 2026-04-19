<script setup>
import { ref } from "vue";
import Header from "./components/Header.vue";
import Toast from "./components/Toast.vue";
import BottomNav from "./components/BottomNav.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col relative bg-gray-50">
    <Header />

    <main class="flex-1 pb-32 md:pb-0">
      <router-view />
    </main>
    <BottomNav />
  </div>
</template>
