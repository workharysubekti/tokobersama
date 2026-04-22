<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabase";
import {
  UserMinusIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
} from "@heroicons/vue/24/solid";

const searchQuery = ref(""); // Cukup deklarasi satu kali di sini
const users = ref([]);
const loading = ref(true);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    users.value = data || [];
  } catch (err) {
    console.error("Gagal tarik user:", err.message);
  } finally {
    loading.value = false;
  }
};

const toggleBanUser = async (user) => {
  const newStatus = user.status === "banned" ? "active" : "banned";
  const { error } = await supabase
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", user.id);

  if (!error) fetchUsers();
};

// LOGIKA FILTER: Ngetik dikit langsung nyaring sendiri tanpa perlu ENTER
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;

  return users.value.filter((user) => {
    const username = (user.username || "").toLowerCase();
    const fullName = (user.full_name || "").toLowerCase();
    const query = searchQuery.value.toLowerCase();

    return username.includes(query) || fullName.includes(query);
  });
});

onMounted(fetchUsers);
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <h3 class="text-xl font-[1000] italic uppercase tracking-tighter">
        User <span class="text-yellow-500">Registry</span>
      </h3>

      <div class="relative">
        <MagnifyingGlassIcon
          class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="SEARCH USERNAME..."
          class="bg-[#0d0d0d] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black uppercase outline-none focus:border-yellow-500 w-full md:w-64"
        />
      </div>
    </div>

    <div
      class="bg-[#0d0d0d] border border-white/5 rounded-[32px] overflow-hidden"
    >
      <table class="w-full text-left">
        <thead
          class="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5"
        >
          <tr>
            <th class="px-8 py-4">Identity</th>
            <th class="px-8 py-4">Reputation</th>
            <th class="px-8 py-4">Status</th>
            <th class="px-8 py-4 text-right">Operation</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="hover:bg-white/[0.01] transition-all"
          >
            <td class="px-8 py-6">
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-full overflow-hidden bg-gray-900 border border-white/10 flex items-center justify-center shrink-0"
                >
                  <img
                    v-if="user.avatar_url"
                    :src="user.avatar_url"
                    class="w-full h-full object-cover"
                  />
                  <span
                    v-else
                    class="text-[10px] font-black text-yellow-500 italic"
                  >
                    {{ user.username?.[0]?.toUpperCase() }}
                  </span>
                </div>

                <div>
                  <p class="text-xs font-black italic uppercase">
                    @{{ user.username }}
                  </p>
                  <p
                    class="text-[8px] text-gray-600 font-bold uppercase italic tracking-tighter"
                  >
                    {{ user.full_name || "N/A" }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-8 py-6">
              <span
                class="text-[10px] font-black italic text-yellow-500 uppercase tracking-widest"
              >
                {{ user.reputation_score || 0 }} PTS
              </span>
            </td>
            <td class="px-8 py-6">
              <span
                :class="
                  user.status === 'banned'
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                "
                class="px-3 py-1 rounded-full text-[8px] font-black uppercase italic border"
              >
                {{ user.status || "Active" }}
              </span>
            </td>
            <td class="px-8 py-6 text-right">
              <button
                @click="toggleBanUser(user)"
                :class="
                  user.status === 'banned'
                    ? 'text-green-500 hover:bg-green-500/10'
                    : 'text-red-500 hover:bg-red-500/10'
                "
                class="p-2 rounded-xl transition-all"
              >
                <UserMinusIcon class="w-5 h-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredUsers.length === 0" class="py-20 text-center">
        <p
          class="text-[8px] font-black text-gray-700 uppercase tracking-[0.5em] italic"
        >
          Frequency Mismatch: User Not Found
        </p>
      </div>
    </div>
  </div>
</template>
