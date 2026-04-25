<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabase";
import { notify } from "../../utils/notify"; // Pastikan path notify benar
import {
  UserMinusIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  KeyIcon,
  NoSymbolIcon,
} from "@heroicons/vue/24/solid";

const searchQuery = ref("");
const users = ref([]);
const loading = ref(true);
const openDropdown = ref(null); // Tracking dropdown yang sedang terbuka

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

// --- ACTION: TOGGLE BAN ---
const toggleBanUser = async (user) => {
  const newStatus = user.status === "banned" ? "active" : "banned";
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", user.id);

    if (error) throw error;
    notify.success("Status Updated", `User is now ${newStatus}`);
    openDropdown.value = null;
    fetchUsers();
  } catch (err) {
    notify.error("Action Failed", err.message);
  }
};

// --- ACTION: DELETE USER (TOTAL REMOVAL) ---
const deleteUser = async (userId) => {
  if (!confirm("HAPUS TOTAL? Data akun ini akan hilang selamanya dari sistem!")) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;
    notify.success("Purged", "Personnel data removed from registry.");
    openDropdown.value = null;
    fetchUsers();
  } catch (err) {
    notify.error("Purge Failed", err.message);
  }
};

// --- ACTION: RESET PASSWORD ---
const resetPassword = async (email) => {
  if (!email) return notify.error("Error", "Email target tidak terdeteksi.");
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    notify.success("Transmitted", "Reset link sent to personnel email.");
    openDropdown.value = null;
  } catch (err) {
    notify.error("Reset Failed", err.message);
  }
};

const toggleDropdown = (id) => {
  openDropdown.value = openDropdown.value === id ? null : id;
};

// LOGIKA FILTER
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  return users.value.filter((user) => {
    const username = (user.username || "").toLowerCase();
    const fullName = (user.full_name || "").toLowerCase();
    const query = searchQuery.value.toLowerCase();
    return username.includes(query) || fullName.includes(query);
  });
});

onMounted(() => {
  fetchUsers();
  // Close dropdown saat klik area luar
  window.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown-area")) openDropdown.value = null;
  });
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <h3 class="text-xl font-[1000] italic uppercase tracking-tighter text-white">
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
          class="bg-[#0d0d0d] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black uppercase outline-none focus:border-yellow-500 w-full md:w-64 text-white"
        />
      </div>
    </div>

    <div class="bg-[#0d0d0d] border border-white/5 rounded-[32px] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left min-w-[800px]">
          <thead class="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5">
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
              class="hover:bg-white/[0.01] transition-all group"
            >
              <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-900 border border-white/10 flex items-center justify-center shrink-0">
                    <img v-if="user.avatar_url" :src="user.avatar_url" class="w-full h-full object-cover" />
                    <span v-else class="text-[10px] font-black text-yellow-500 italic">
                      {{ user.username?.[0]?.toUpperCase() }}
                    </span>
                  </div>
                  <div>
                    <p class="text-xs font-black italic uppercase text-white">@{{ user.username }}</p>
                    <p class="text-[8px] text-gray-600 font-bold uppercase italic tracking-tighter">
                      {{ user.full_name || "N/A" }}
                    </p>
                  </div>
                </div>
              </td>
              
              <td class="px-8 py-6">
                <span :class="user.reputation < 50 ? 'text-red-500' : 'text-yellow-500'" class="text-[10px] font-black italic uppercase tracking-widest">
                  {{ user.reputation || 0 }} PTS
                </span>
              </td>

              <td class="px-8 py-6">
                <span
                  :class="user.status === 'banned' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'"
                  class="px-3 py-1 rounded-full text-[8px] font-black uppercase italic border"
                >
                  {{ user.status === 'banned' ? 'BANNED' : 'ACTIVE' }}
                </span>
              </td>

              <td class="px-8 py-6 text-right relative dropdown-area">
                <button
                  @click.stop="toggleDropdown(user.id)"
                  class="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white"
                >
                  <EllipsisVerticalIcon class="w-5 h-5" />
                </button>

                <div 
                  v-if="openDropdown === user.id" 
                  class="absolute right-8 mt-2 w-44 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden py-1"
                >
                  <button 
                    @click="resetPassword(user.email)"
                    class="w-full px-4 py-3 text-left text-[9px] font-black italic uppercase flex items-center gap-3 hover:bg-white/5 text-gray-400 hover:text-blue-400 transition-all"
                  >
                    <KeyIcon class="w-4 h-4" /> Reset Password
                  </button>

                  <button 
                    @click="toggleBanUser(user)"
                    :class="user.status === 'banned' ? 'text-green-500' : 'text-red-500'"
                    class="w-full px-4 py-3 text-left text-[9px] font-black italic uppercase flex items-center gap-3 hover:bg-white/5 transition-all"
                  >
                    <NoSymbolIcon class="w-4 h-4" /> 
                    {{ user.status === 'banned' ? 'UNBAN ACCOUNT' : 'BAN ACCOUNT' }}
                  </button>

                  <div class="h-px bg-white/5 mx-2 my-1"></div>

                  <button 
                    @click="deleteUser(user.id)"
                    class="w-full px-4 py-3 text-left text-[9px] font-black italic uppercase flex items-center gap-3 hover:bg-red-600 text-white transition-all"
                  >
                    <TrashIcon class="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredUsers.length === 0" class="py-20 text-center">
        <p class="text-[8px] font-black text-gray-700 uppercase tracking-[0.5em] italic">
          Frequency Mismatch: User Not Found
        </p>
      </div>
    </div>
  </div>
</template>
