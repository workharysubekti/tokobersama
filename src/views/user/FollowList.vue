<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../../lib/supabase.js";
import {
  ArrowLeftIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const users = ref([]);
const targetUser = ref(null);
const searchQuery = ref("");

// Tipe halaman: 'followers' atau 'following'
const type = computed(() => route.params.type);

// --- KODE SUCI (LOGIKA TIDAK DISENTUH) ---
const fetchUsers = async () => {
  loading.value = true;
  const usernameParam = route.params.username;
  const typeParam = route.params.type;

  try {
    const { data: targetData } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", usernameParam)
      .single();

    if (!targetData) throw new Error("User tidak ditemukan");
    targetUser.value = targetData;

    let query;

    if (typeParam === "followers") {
      query = supabase
        .from("follows")
        .select(
          `
          profiles!follower_id (id, username, full_name, avatar_url, reputation)
        `,
        )
        .eq("following_id", targetData.id);
    } else {
      query = supabase
        .from("follows")
        .select(
          `
          profiles!following_id (id, username, full_name, avatar_url, reputation)
        `,
        )
        .eq("follower_id", targetData.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data) {
      users.value = data.map((item) => item.profiles).filter((u) => u !== null);
    }
  } catch (error) {
    console.error("Gagal narik data follow:", error.message);
  } finally {
    loading.value = false;
  }
};

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  return users.value.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (u.full_name &&
        u.full_name.toLowerCase().includes(searchQuery.value.toLowerCase())),
  );
});

onMounted(fetchUsers);
</script>

<template>
  <div
    class="min-h-screen bg-[#050505] text-white pt-6 lg:pt-10 pb-10 px-6 font-sans uppercase italic font-[1000]"
  >
    <div class="max-w-6xl mx-auto">
      <div
        class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10"
      >
        <div class="flex items-center gap-5">
          <button
            @click="router.back()"
            class="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all hover:bg-white/10"
          >
            <ArrowLeftIcon class="w-6 h-6 text-yellow-500" />
          </button>
          <div>
            <h1 class="text-3xl lg:text-4xl tracking-tighter leading-none">
              {{ type === "followers" ? "PENGIKUT" : "MENGIKUTI" }}
            </h1>
            <p class="text-[10px] text-gray-600 tracking-[0.4em] mt-1">
              @{{ targetUser?.username }}
            </p>
          </div>
        </div>

        <div class="relative w-full lg:max-w-md">
          <MagnifyingGlassIcon
            class="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-600"
          />
          <input
            v-model="searchQuery"
            placeholder="CARI TRANSMISI USER..."
            class="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-xs outline-none focus:border-yellow-500/50 transition-all shadow-2xl"
          />
        </div>
      </div>

      <div v-if="!loading">
        <div
          v-if="filteredUsers.length > 0"
          class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
        >
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            @click="router.push(`/user/${user.username}`)"
            class="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[32px] cursor-pointer hover:border-yellow-500/20 hover:bg-white/[0.04] transition-all group shadow-xl"
          >
            <div class="flex items-center gap-5">
              <div
                class="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl overflow-hidden border border-white/10 bg-black flex-shrink-0 shadow-inner"
              >
                <img
                  v-if="user.avatar_url"
                  :src="user.avatar_url"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <UserIcon v-else class="w-full h-full p-4 text-gray-800" />
              </div>
              <div>
                <p
                  class="text-base lg:text-lg tracking-tight group-hover:text-yellow-500 transition-colors leading-none mb-1"
                >
                  {{ user.full_name || "MEMBER" }}
                </p>
                <p
                  class="text-[9px] text-gray-600 tracking-widest leading-none"
                >
                  @{{ user.username }} •
                  <span class="text-yellow-500/50"
                    >{{ user.reputation || 0 }} REP PTS</span
                  >
                </p>
              </div>
            </div>
            <div
              class="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-gray-800 group-hover:text-white group-hover:border-white/20 transition-all bg-white/5"
            >
              <ArrowLeftIcon class="w-4 h-4 rotate-180" />
            </div>
          </div>
        </div>

        <div
          v-else
          class="text-center py-32 border-2 border-dashed border-white/5 rounded-[50px] bg-white/[0.01]"
        >
          <div
            class="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <UserIcon class="w-10 h-10 text-gray-800" />
          </div>
          <p class="text-xs text-gray-700 tracking-[0.5em] uppercase">
            TIDAK ADA DATA TRANSMISI
          </p>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-40 gap-4">
        <div
          class="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"
        ></div>
        <p class="text-[8px] tracking-[0.4em] text-gray-600">SYNCING DATA...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Menghilangkan scrollbar tapi tetap bisa scroll */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
