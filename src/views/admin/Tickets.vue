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
} from "@heroicons/vue/24/outline";

const allReports = ref([]);
const loading = ref(true);

// --- PEMISAH DATA (COMPUTED) ---
const assetReports = computed(() => allReports.value.filter(r => r.product_id));
const accountReports = computed(() => allReports.value.filter(r => !r.product_id && r.target_user_id));

// --- AMBIL DATA LAPORAN ---
const fetchReports = async () => {
  loading.value = true;
  try {
    // Join dengan alias agar reporter dan target user tidak bentrok
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

// --- TINDAKAN 1: MARK AS REVIEWED (Tandai Aman) ---
const markReviewed = async (id) => {
  try {
    const { error } = await supabase
      .from("reports")
      .update({ status: "reviewed" })
      .eq("id", id);

    if (error) throw error;
    notify.success("Cleared", "Laporan telah ditandai aman.");
    fetchReports();
  } catch (err) {
    notify.error("Failed", err.message);
  }
};

// --- TINDAKAN 2: TAKE DOWN ASSET (Banned Produk + Potong Reputasi Owner) ---
const takeDownProduct = async (reportId, productId, ownerId) => {
  if (!ownerId) return notify.error("Error", "Owner ID tidak ditemukan!");
  const confirmBanned = confirm("Take down aset ini? Reputasi owner akan dipotong 50 poin.");
  if (!confirmBanned) return;

  try {
    // 1. Banned Produk
    await supabase.from("products").update({ status: "banned" }).eq("id", productId);

    // 2. Potong Reputasi Owner
    await supabase.rpc("decrease_reputation", { user_id: ownerId, amount: 50 });

    // 3. Update Laporan
    await supabase.from("reports").update({ status: "action_taken" }).eq("id", reportId);

    notify.success("Justice Served", "Asset Banned & Owner Penalized.");
    fetchReports();
  } catch (err) {
    notify.error("Execution Failed", err.message);
  }
};

// --- TINDAKAN 3: PUNISH USER (Potong Reputasi Langsung dari Report Profil) ---
const punishUser = async (reportId, targetUserId) => {
  if (!targetUserId) return notify.error("Error", "Target User tidak ditemukan!");
  const confirmPunish = confirm("Potong reputasi user ini sebesar 50 poin karena melanggar aturan profil?");
  if (!confirmPunish) return;

  try {
    // 1. Potong Reputasi Target
    await supabase.rpc("decrease_reputation", { user_id: targetUserId, amount: 50 });

    // 2. Update Laporan
    await supabase.from("reports").update({ status: "action_taken" }).eq("id", reportId);

    notify.success("Account Penalized", "Reputasi user berhasil dipotong.");
    fetchReports();
  } catch (err) {
    notify.error("Execution Failed", err.message);
  }
};

onMounted(() => {
  fetchReports();
});
</script>

<template>
  <div class="min-h-screen bg-black p-6 md:p-10 text-white uppercase italic font-black">
    <div class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <div class="flex items-center gap-4 mb-2">
          <ShieldExclamationIcon class="w-10 h-10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]" />
          <h1 class="text-4xl md:text-5xl tracking-tighter">Investigation <span class="text-red-500 text-shadow-red">Room</span></h1>
        </div>
        <p class="text-[10px] tracking-[0.4em] text-gray-500">System Moderation & Asset Enforcement</p>
      </div>

      <div class="flex gap-4">
        <div class="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
          <p class="text-[8px] text-gray-600 mb-1">Total Reports</p>
          <p class="text-xl text-white">{{ allReports.length }}</p>
        </div>
        <div class="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl">
          <p class="text-[8px] text-red-500 mb-1">Pending</p>
          <p class="text-xl text-red-500">{{ allReports.filter(r => r.status === 'pending').length }}</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-32 flex flex-col items-center">
      <div class="w-12 h-12 border-2 border-white/10 border-t-red-500 rounded-full animate-spin"></div>
      <p class="text-[8px] text-gray-600 mt-6 tracking-[0.5em]">Decrypting Data...</p>
    </div>

    <div v-else class="space-y-16">
      
      <section>
        <h2 class="text-xl mb-6 flex items-center gap-3">
          <span class="w-2 h-8 bg-yellow-500"></span> Asset Investigations
        </h2>
        <div class="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-xl">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-white/5 bg-white/[0.03]">
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Target Asset</th>
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Reporter</th>
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Case Details</th>
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="report in assetReports" :key="report.id" class="group hover:bg-white/[0.02] transition-colors">
                <td class="p-6">
                  <div class="flex items-center gap-4">
                    <img v-if="report.product?.image_url" :src="report.product.image_url" class="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                    <div>
                      <p class="text-sm tracking-tight mb-1">{{ report.product?.name || 'Unknown' }}</p>
                      <p class="text-[8px] text-gray-600 font-bold">REF: #{{ report.product_id }}</p>
                    </div>
                  </div>
                </td>
                <td class="p-6">
                  <p class="text-[10px] text-yellow-500">@{{ report.reporter?.username }}</p>
                  <p class="text-[8px] text-gray-600">{{ new Date(report.created_at).toLocaleDateString() }}</p>
                </td>
                <td class="p-6">
                  <p class="text-[9px] text-red-500 mb-1">{{ report.reason_category }}</p>
                  <p class="text-[11px] text-gray-400 normal-case font-bold italic">{{ report.reason }}</p>
                </td>
                <td class="p-6 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <a :href="`/product/${report.product_id}`" target="_blank" class="p-3 bg-white/5 rounded-xl border border-white/5"><EyeIcon class="w-4 h-4 text-gray-400" /></a>
                    <button v-if="report.status === 'pending'" @click="markReviewed(report.id)" class="p-3 bg-green-500/10 rounded-xl border border-green-500/20" title="Safe"><CheckBadgeIcon class="w-4 h-4 text-green-500" /></button>
                    <button v-if="report.product?.status !== 'banned'" @click="takeDownProduct(report.id, report.product_id, report.product.owner_id)" class="p-3 bg-red-600/10 rounded-xl border border-red-600/20" title="Banned"><TrashIcon class="w-4 h-4 text-red-600" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="assetReports.length === 0" class="p-12 text-center text-[10px] text-gray-600">NO ASSET REPORTS FILED</p>
        </div>
      </section>

      <section>
        <h2 class="text-xl mb-6 flex items-center gap-3">
          <span class="w-2 h-8 bg-red-600"></span> Account Investigations
        </h2>
        <div class="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-xl">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-white/5 bg-white/[0.03]">
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Target Account</th>
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Reporter</th>
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase">Violation</th>
                <th class="p-6 text-[10px] text-gray-500 tracking-widest uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="report in accountReports" :key="report.id" class="group hover:bg-white/[0.02] transition-colors">
                <td class="p-6">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center border border-white/10 overflow-hidden">
                      <img v-if="report.target?.avatar_url" :src="report.target.avatar_url" class="w-full h-full object-cover" />
                      <UserCircleIcon v-else class="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                      <p class="text-sm tracking-tight text-white">@{{ report.target?.username }}</p>
                      <p class="text-[8px] text-gray-600">{{ report.target_user_id }}</p>
                    </div>
                  </div>
                </td>
                <td class="p-6">
                  <p class="text-[10px] text-yellow-500">@{{ report.reporter?.username }}</p>
                </td>
                <td class="p-6">
                  <p class="text-[9px] text-red-500 mb-1">{{ report.reason_category }}</p>
                  <p class="text-[11px] text-gray-400 normal-case font-bold italic">{{ report.reason }}</p>
                </td>
                <td class="p-6 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button v-if="report.status === 'pending'" @click="markReviewed(report.id)" class="p-3 bg-green-500/10 rounded-xl border border-green-500/20"><CheckBadgeIcon class="w-4 h-4 text-green-500" /></button>
                    <button v-if="report.status === 'pending'" @click="punishUser(report.id, report.target_user_id)" class="p-3 bg-red-600/10 rounded-xl border border-red-600/20" title="Punish"><UserMinusIcon class="w-4 h-4 text-red-600" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="accountReports.length === 0" class="p-12 text-center text-[10px] text-gray-600">NO ACCOUNT REPORTS FILED</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.text-shadow-red {
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
}
</style>
