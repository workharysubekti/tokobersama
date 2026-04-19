<script setup>
import { ref } from "vue";
import Header from "./components/Header.vue";
import Toast from "./components/Toast.vue";
import BottomNav from "./components/BottomNav.vue";
</script>

<template>
  <div class="min-h-screen bg-black flex flex-col">
    <Header v-if="$route.path !== '/login'" />

    <main :class="{ 'pb-10': $route.path !== '/login' }">
      <router-view />
    </main>
    <BottomNav />
  </div>
</template>
