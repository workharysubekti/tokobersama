<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../../lib/supabase.js";
import { notify } from "../../utils/notify";
import {
  ArrowLeftIcon,
  UserIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const users = ref([]);
const targetUser = ref(null);
const searchQuery = ref("");
const currentUser = ref(null);
const myFollowings = ref([]); 

const type = ref(route.params.type); 

// --- LOGIKA FETCH DATA (KODE SUCI) ---
const fetchData = async () => {
  loading.value = true;
  const usernameParam = route.params.username;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser.value = session?.user;

    const { data: targetData } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", usernameParam)
      .single();
    
    if (!targetData) throw new Error("User tidak ditemukan");
    targetUser.value = targetData;

    if (currentUser.value) {
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.value.id);
      myFollowings.value = myFollows?.map((f) => f.following_id) || [];
    }

    let query = supabase.from("follows");
    if (type.value === "followers") {
      query = query
        .select(`profiles!follower_id (*)`)
        .eq("following_id", targetData.id);
    } else {
      query = query
        .select(`profiles!following_id (*)`)
        .eq("follower_id", targetData.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    users.value = data.map((item) => item.profiles).filter((u) => u !== null);
  } catch (error) {
    console.error("Gagal sinkronasi:", error.message);
  } finally {
    loading.value = false;
  }
};

const switchTab = (newType) => {
  type.value = newType;
  router.replace(`/user/${targetUser.value.username}/${newType}`);
  fetchData();
};

const handleAction = async (user) => {
  if (!currentUser.value) return router.push("/login");
  if (user.id === currentUser.value.id) return;

  const isAlreadyFollowing = myFollowings.value.some(
    (id) => String(id) === String(user.id),
  );

  try {
    if (isAlreadyFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", user.id);

      if (error) throw error;

      myFollowings.value = myFollowings.value.filter(
        (id) => String(id) !== String(user.id),
      );
      notify.success("Berhenti Mengikuti");
    } else {
      const { error: insertError } = await supabase
        .from("follows")
        .insert({ follower_id: currentUser.value.id, following_id: user.id });

      if (insertError) {
        if (insertError.code === "23505") {
          if (!myFollowings.value.includes(user.id))
            myFollowings.value.push(user.id);
          return;
        }
        throw insertError;
      }

      myFollowings.value.push(user.id);

      const senderName = currentUser.value.user_metadata?.username || "Seseorang";
      await supabase.from("notifications").insert({
        user_id: user.id,
        from_user_id: currentUser.value.id,
        title: "NEW TRANSMISSION!",
        message: `@${senderName} mulai mengikuti Anda.`,
        type: "activity",
      });

      notify.success("Berhasil Mengikuti");
    }
  } catch (e) {
    console.error("Mekanik Error:", e.message);
    notify.error("Gagal Sinkronasi");
    fetchData();
  }
};

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  return users.value.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.value.toLowerCase())),
  );
});

onMounted(fetchData);
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-4 lg:pt-8 pb-10 px-6 font-sans uppercase italic font-[1000]">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-5 mb-8">
        <button @click="router.back()" class="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeftIcon class="w-6 h-6 text-yellow-500" />
        </button>
        <div>
          <p class="text-[9px] text-yellow-500/50 tracking-[0.4em] mb-1">TRANSMISSION LIST</p>
          <h1 class="text-3xl lg:text-4xl tracking-tighter leading-none">@{{ targetUser?.username }}</h1>
        </div>
      </div>

      <div class="flex p-1.5 bg-white/[0.03] border border-white/10 rounded-3xl mb-8 w-full lg:max-w-md shadow-2xl">
        <button @click="switchTab('followers')" :class="type === 'followers' ? 'bg-yellow-500 text-black shadow-xl' : 'text-gray-500'" class="flex-1 py-4 rounded-2xl text-[10px] tracking-widest transition-all duration-500">PENGIKUT</button>
        <button @click="switchTab('following')" :class="type === 'following' ? 'bg-yellow-500 text-black shadow-xl' : 'text-gray-500'" class="flex-1 py-4 rounded-2xl text-[10px] tracking-widest transition-all duration-500">MENGIKUTI</button>
      </div>

      <div class="relative w-full mb-10">
        <MagnifyingGlassIcon class="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" />
        <input v-model="searchQuery" placeholder="CARI DATABASE USER..." class="w-full bg-white/[0.02] border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-xs outline-none focus:border-yellow-500/50 transition-all" />
      </div>

      <div v-if="!loading">
        <div v-if="filteredUsers.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div v-for="user in filteredUsers" :key="user.id" class="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-[35px] hover:border-white/10 transition-all group shadow-xl">
            <div @click="router.push(`/user/${user.username}`)" class="flex items-center gap-4 cursor-pointer flex-1">
              <div class="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-black flex-shrink-0">
                <img v-if="user.avatar_url" :src="user.avatar_url" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                <UserIcon v-else class="w-full h-full p-4 text-gray-800" />
              </div>
              <div class="truncate">
                <p class="text-base tracking-tight group-hover:text-yellow-500 transition-colors leading-none mb-1 truncate">
                  {{ user.full_name || "MEMBER" }}
                </p>
                <p class="text-[9px] text-gray-600 tracking-widest leading-none">@{{ user.username }} • {{ user.reputation }} REP</p>
              </div>
            </div>

            <div v-if="currentUser && user.id !== currentUser.id" class="ml-4">
              <button @click="handleAction(user)" :class="myFollowings.includes(user.id) ? 'bg-white/5 text-gray-400 border-white/5' : 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'" class="px-5 py-3 rounded-2xl text-[9px] font-black border transition-all active:scale-90 flex items-center gap-2 whitespace-nowrap">
                <template v-if="myFollowings.includes(user.id)">
                  <ArrowsRightLeftIcon class="w-3 h-3" />
                  <span>TEMAN</span>
                </template>
                <template v-else>
                  <UserPlusIcon class="w-3 h-3" />
                  <span>{{ (targetUser?.id === currentUser?.id && type === 'followers') ? 'IKUTI BALIK' : 'IKUTI' }}</span>
                </template>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-32 border-2 border-dashed border-white/5 rounded-[50px] opacity-30">
          <p class="text-xs tracking-[0.5em]">DATABASE KOSONG</p>
        </div>
      </div>

      <div v-else class="flex flex-col items-center py-40 gap-4">
        <div class="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-[8px] tracking-[0.4em] text-gray-600">TRANSMITTING...</p>
      </div>
    </div>
  </div>
</template>
