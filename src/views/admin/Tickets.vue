<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabase.js";
import { notify } from "../../utils/notify.js";
import {
  ShieldExclamationIcon,
  EyeIcon,
  CheckBadgeIcon,
  TrashIcon,
  UserCircleIcon,
  UserMinusIcon,
  ChatBubbleLeftEllipsisIcon,
  ArchiveBoxIcon,
  UsersIcon
} from "@heroicons/vue/24/outline";

const allReports = ref([]);
const loading = ref(true);
const activeTab = ref("assets"); // State untuk pindah kiri-kanan

// --- PEMISAH DATA (COMPUTED) ---
const assetReports = computed(() => allReports.value.filter(r => r.product_id));
const accountReports = computed(() => allReports.value.filter(r => !r.product_id && r.target_user_id));

// --- AMBIL DATA LAPORAN ---
const fetchReports = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
  .from("reports")
  .select(`
    *,
    reporter:profiles!reporter_id(username, full_name, avatar_url),
    target:profiles!target_user_id(username, full_name, avatar_url),
    product:products(id, name, image_url, status, owner_id)
  `)
  .order("created_at", { ascending: false });
    
    if (error) throw error;
    allReports.value = data;
  } catch (err) {
    console.error("Fetch Error:", err);
    notify.error("System Error", "Gagal mengambil data investigasi.");
  } finally {
    loading.value = false;
  }
};

// --- TINDAKAN 1: MARK AS REVIEWED ---
const markReviewed = async (id) => {
  try {
    const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", id);
    if (error) throw error;
    notify.success("Cleared", "Laporan ditandai aman.");
    fetchReports();
  } catch (err) {
    notify.error("Failed", err.message);
  }
};

// --- TINDAKAN 2: TAKE DOWN ASSET ---
const takeDownProduct = async (reportId, productId, ownerId) => {
  if (!ownerId) return notify.error("Error", "Owner ID Missing!");
  const confirmBanned = confirm("Take down aset ini? Reputasi owner akan dipotong 50 poin.");
  if (!confirmBanned) return;

  try {
    await supabase.from("products").update({ status: "banned" }).eq("id", productId);
    await supabase.rpc("decrease_reputation", { user_id: ownerId, amount: 50 });
    await supabase.from("reports").update({ status: "action_taken" }).eq("id", reportId);
    notify.success("Justice Served", "Asset Banned.");
    fetchReports();
  } catch (err) { notify.error("Failed", err.message); }
};

// --- TINDAKAN 3: PUNISH USER ---
const punishUser = async (reportId, targetUserId) => {
  if (!targetUserId) return notify.error("Error", "Target Missing!");
  const confirmPunish = confirm("Potong 50 poin reputasi user ini?");
  if (!confirmPunish) return;

  try {
    await supabase.rpc("decrease_reputation", { user_id: targetUserId, amount: 50 });
    await supabase.from("reports").update({ status: "action_taken" }).eq("id", reportId);
    notify.success("Account Penalized", "Reputasi dipotong.");
    fetchReports();
  } catch (err) { notify.error("Failed", err.message); }
};

onMounted(() => { fetchReports(); });
</script>

<template>
  <div class="min-h-screen bg-black p-6 md:p-10 text-white uppercase italic font-black">
    
    <div class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <div class="flex items-center gap-4 mb-2">
          <ShieldExclamationIcon class="w-10 h-10 text-red-500" />
          <h1 class="text-4xl md:text-5xl tracking-tighter">Investigation <span class="text-red-500">Room</span></h1>
        </div>
        <p class="text-[10px] tracking-[0.4em] text-gray-500">Moderation Control Center</p>
      </div>

      <div class="flex bg-white/5 p-1 rounded-2xl border border-white/10">
        <button 
          @click="activeTab = 'assets'"
          :class="activeTab === 'assets' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'"
          class="px-8 py-3 rounded-xl text-[10px] tracking-widest transition-all flex items-center gap-2"
        >
          <ArchiveBoxIcon class="w-4 h-4" /> ASSETS ({{ assetReports.length }})
        </button>
        <button 
          @click="activeTab = 'accounts'"
          :class="activeTab === 'accounts' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-white'"
          class="px-8 py-3 rounded-xl text-[10px] tracking-widest transition-all flex items-center gap-2"
        >
          <UsersIcon class="w-4 h-4" /> ACCOUNTS ({{ accountReports.length }})
        </button>
      </div>
    </div>

    <div v-if="!loading" class="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-white/5 bg-white/[0.03]">
              <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">
                {{ activeTab === 'assets' ? 'Reported Asset' : 'Target Account' }}
              </th>
              <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Reporter Info</th>
              <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Case Details</th>
              <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase text-right">Enforcement</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-white/5">
            <template v-if="activeTab === 'assets'">
              <tr v-for="report in assetReports" :key="report.id" class="group hover:bg-white/[0.01] transition-colors">
                <td class="p-6">
                  <div class="flex items-center gap-4">
                    <img v-if="report.product?.image_url" :src="report.product.image_url" class="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                    <div>
                      <p class="text-sm tracking-tight mb-1">{{ report.product?.name || 'Deleted Asset' }}</p>
                      <p class="text-[8px] text-gray-600 font-bold uppercase">REF: #{{ report.product_id }}</p>
                    </div>
                  </div>
                </td>
                <td class="p-6">
                  <p class="text-[10px] text-yellow-500">@{{ report.reporter?.username }}</p>
                  <p class="text-[8px] text-gray-600">{{ new Date(report.created_at).toLocaleDateString() }}</p>
                </td>
                <td class="p-6">
                  <p class="text-[9px] text-red-500 mb-1 tracking-widest">{{ report.reason_category }}</p>
                  <p class="text-[11px] text-gray-400 normal-case italic font-bold leading-relaxed">{{ report.reason }}</p>
                </td>
                <td class="p-6 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <a :href="`/product/${report.product_id}`" target="_blank" class="p-3 bg-white/5 rounded-xl border border-white/10"><EyeIcon class="w-4 h-4 text-gray-400" /></a>
                    <button v-if="report.status === 'pending'" @click="markReviewed(report.id)" class="p-3 bg-green-500/10 rounded-xl border border-green-500/20 shadow-lg shadow-green-500/5"><CheckBadgeIcon class="w-4 h-4 text-green-500" /></button>
                    <button v-if="report.product?.status !== 'banned'" @click="takeDownProduct(report.id, report.product_id, report.product.owner_id)" class="p-3 bg-red-600/10 rounded-xl border border-red-600/20"><TrashIcon class="w-4 h-4 text-red-600" /></button>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr v-for="report in accountReports" :key="report.id" class="group hover:bg-white/[0.01] transition-colors">
                <td class="p-6">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-gray-900 border border-white/10 flex items-center justify-center overflow-hidden">
                      <img v-if="report.target?.avatar_url" :src="report.target.avatar_url" class="w-full h-full object-cover" />
                      <UserCircleIcon v-else class="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                      <p class="text-sm tracking-tight mb-1">@{{ report.target?.username }}</p>
                      <p class="text-[8px] text-gray-600 font-bold uppercase">ID: {{ report.target_user_id?.slice(0, 8) }}...</p>
                    </div>
                  </div>
                </td>
                <td class="p-6">
                  <p class="text-[10px] text-yellow-500">@{{ report.reporter?.username }}</p>
                </td>
                <td class="p-6">
                  <p class="text-[9px] text-red-500 mb-1 tracking-widest">{{ report.reason_category }}</p>
                  <p class="text-[11px] text-gray-400 normal-case italic font-bold leading-relaxed">{{ report.reason }}</p>
                </td>
                <td class="p-6 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button v-if="report.status === 'pending'" @click="markReviewed(report.id)" class="p-3 bg-green-500/10 rounded-xl border border-green-500/20"><CheckBadgeIcon class="w-4 h-4 text-green-500" /></button>
                    <button v-if="report.status === 'pending'" @click="punishUser(report.id, report.target_user_id)" class="p-3 bg-red-600/10 rounded-xl border border-red-600/20 shadow-lg shadow-red-600/5"><UserMinusIcon class="w-4 h-4 text-red-600" /></button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="(activeTab === 'assets' && assetReports.length === 0) || (activeTab === 'accounts' && accountReports.length === 0)" class="py-32 text-center">
        <p class="text-[10px] text-gray-600 tracking-[0.5em] italic">NO HOSTILE TRANSMISSIONS DETECTED IN THIS FREQUENCY</p>
      </div>
    </div>

    <div v-else class="py-32 flex flex-col items-center">
      <div class="w-12 h-12 border-2 border-white/10 border-t-red-500 rounded-full animate-spin"></div>
      <p class="text-[8px] text-gray-600 mt-6 tracking-[0.5em] uppercase italic">Decrypting Intelligence...</p>
    </div>
  </div>
</template>

<style scoped>
.text-shadow-red {
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
}
</style>
