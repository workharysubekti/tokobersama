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

const fetchUsers = async () => {
  loading.value = true;
  const usernameParam = route.params.username;
  const typeParam = route.params.type; // 'followers' atau 'following'

  try {
    // 1. Ambil ID user target berdasarkan username di URL
    const { data: targetData, error: userError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", usernameParam)
      .single();

    if (userError || !targetData) throw new Error("User tidak ditemukan");
    targetUser.value = targetData;

    let query;

    if (typeParam === "followers") {
      // MENCARI PENGIKUT: Orang-orang yang mem-follow ID target
      // Kita ambil data dari kolom follower_id
      query = supabase
        .from("follows")
        .select(
          `
          user:follower_id (id, username, full_name, avatar_url, reputation)
        `,
        )
        .eq("following_id", targetData.id);
    } else {
      // MENCARI MENGIKUTI: Orang-orang yang di-follow oleh ID target
      // Kita ambil data dari kolom following_id
      query = supabase
        .from("follows")
        .select(
          `
          user:following_id (id, username, full_name, avatar_url, reputation)
        `,
        )
        .eq("follower_id", targetData.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Mapping data agar lebih rapi masuk ke array users
    if (data) {
      users.value = data.map((item) => item.user).filter((u) => u !== null);
    }
  } catch (error) {
    console.error("Gagal narik data follow:", error.message);
    notify.error("Gagal sinkronasi data");
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
    class="min-h-screen bg-[#050505] text-white pt-20 pb-10 px-6 font-sans uppercase italic font-[1000]"
  >
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center gap-4 mb-8">
        <button
          @click="router.back()"
          class="p-2 bg-white/5 rounded-xl border border-white/10"
        >
          <ArrowLeftIcon class="w-5 h-5 text-yellow-500" />
        </button>
        <div>
          <h1 class="text-2xl tracking-tighter leading-none">
            {{ type === "followers" ? "PENGIKUT" : "MENGIKUTI" }}
          </h1>
          <p class="text-[9px] text-gray-600 tracking-[0.3em]">
            @{{ targetUser?.username }}
          </p>
        </div>
      </div>

      <div class="relative mb-8">
        <MagnifyingGlassIcon
          class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
        />
        <input
          v-model="searchQuery"
          placeholder="CARI USER..."
          class="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-xs outline-none focus:border-yellow-500/50 transition-all"
        />
      </div>

      <div v-if="!loading" class="space-y-4">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          @click="router.push(`/user/${user.username}`)"
          class="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-[28px] cursor-pointer hover:border-yellow-500/20 transition-all group"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 bg-black flex-shrink-0"
            >
              <img
                v-if="user.avatar_url"
                :src="user.avatar_url"
                class="w-full h-full object-cover"
              />
              <UserIcon v-else class="w-full h-full p-3 text-gray-800" />
            </div>
            <div>
              <p
                class="text-sm tracking-tight group-hover:text-yellow-500 transition-colors"
              >
                {{ user.full_name || "MEMBER" }}
              </p>
              <p class="text-[8px] text-gray-600 tracking-widest leading-none">
                @{{ user.username }} • {{ user.reputation || 0 }} REP
              </p>
            </div>
          </div>
          <div
            class="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-gray-800 group-hover:text-white transition-all"
          >
            <ArrowLeftIcon class="w-3 h-3 rotate-180" />
          </div>
        </div>

        <div
          v-if="filteredUsers.length === 0"
          class="text-center py-20 border border-dashed border-white/5 rounded-[40px]"
        >
          <p class="text-[10px] text-gray-700 tracking-[0.4em]">
            TIDAK ADA DATA DITEMUKAN
          </p>
        </div>
      </div>

      <div v-else class="flex justify-center py-20">
        <div
          class="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
    </div>
  </div>
</template>
