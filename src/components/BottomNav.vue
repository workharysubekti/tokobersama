<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js"; // Sesuaikan path-nya
import {
  HomeIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
  UserIcon,
  PlusIcon, // Import juga di sini buat tombol tengah
} from "@heroicons/vue/24/outline";
import { useRoute } from "vue-router";

const route = useRoute();
const userProfile = ref(null);

const handleSearchClick = () => {
  // Masuk ke halaman search dengan query kosong biar muncul "Ready to Hunt"
  router.push("/search");
};

const getProfile = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    userProfile.value = data;
  }
};

onMounted(() => {
  getProfile();
  // Tambahkan listener biar kalau logout/login langsung berubah
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") getProfile();
    else if (event === "SIGNED_OUT") userProfile.value = null;
  });
});
</script>

<template>
  <div
    class="fixed bottom-0 inset-x-0 z-[100] md:hidden px-4 pb-6 pointer-events-none"
  >
    <div class="max-w-md mx-auto pointer-events-auto">
      <nav
        class="bg-gray-900/80 backdrop-blur-xl border border-gray-800 px-8 py-4 rounded-[30px] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <router-link to="/" class="flex flex-col items-center gap-1 group">
          <HomeIcon
            class="w-6 h-6 text-gray-500 group-[.router-link-active]:text-yellow-500 transition-colors"
          />
          <span
            class="text-[9px] uppercase tracking-widest text-gray-500 group-[.router-link-active]:text-yellow-500 font-bold italic"
            >Home</span
          >
        </router-link>

        <router-link
          to="/search"
          class="flex flex-col items-center gap-1 group"
          active-class="text-yellow-500"
        >
          <MagnifyingGlassIcon
            :class="[
              'w-6 h-6 transition-colors',
              route?.path === '/search' ? 'text-yellow-500' : 'text-gray-400',
            ]"
          />

          <div v-if="route?.path === '/search'"></div>
          <span
            :class="[
              'text-[9px] uppercase tracking-widest',
              route?.path === '/search' ? 'text-yellow-500' : 'text-gray-400',
            ]"
            >Search</span
          >
        </router-link>

        <router-link
          v-if="userProfile"
          to="/admin-tambah"
          class="flex flex-col items-center gap-1 group"
        >
          <div
            class="p-2 bg-yellow-500 rounded-full -mt-8 border-4 border-black"
          >
            <PlusIcon class="w-5 h-5 font-bold" />
          </div>
          <span
            class="text-[12px] uppercase tracking-widest text-gray-500 font-bold"
            >Buka Lelang</span
          >
        </router-link>

        <router-link
          to="/my-bids"
          class="flex flex-col items-center gap-1 group"
        >
          <TrophyIcon
            class="w-6 h-6 text-gray-500 group-[.router-link-active]:text-yellow-500 transition-colors"
          />
          <span
            class="text-[9px] uppercase tracking-widest text-gray-500 group-[.router-link-active]:text-yellow-500 font-bold italic"
            >Bids</span
          >
        </router-link>

        <router-link
          to="/profile"
          class="flex flex-col items-center gap-1 group"
        >
          <UserIcon
            class="w-6 h-6 text-gray-500 group-[.router-link-active]:text-yellow-500 transition-colors"
          />
          <span
            class="text-[9px] uppercase tracking-widest text-gray-500 group-[.router-link-active]:text-yellow-500 font-bold italic"
            >User</span
          >
        </router-link>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Animasi halus saat icon aktif */
.router-link-active svg {
  transform: translateY(-2px);
  transition: transform 0.3s ease;
}
</style>
