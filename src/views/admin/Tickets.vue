<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabase.js";
import { notify } from "../../utils/notify.js";
import {
  ShieldExclamationIcon,
  EyeIcon,
  CheckBadgeIcon,
  TrashIcon,
  UserCircleIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/vue/24/outline";

const reports = ref([]);
const loading = ref(true);

// --- AMBIL DATA LAPORAN ---
const fetchReports = async () => {
  loading.value = true;
  try {
    // Kita hapus bagian !reporter_id dan !product_id biar auto-detect
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
  *,
  profiles(username, full_name, avatar_url),
  products(id, name, image_url, status, user_id) // <-- Tambahkan user_id di sini
`,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Sesuaikan mapping data jika Supabase mengembalikan array atau object tunggal
    reports.value = data.map((item) => ({
      ...item,
      reporter: item.profiles, // mapping manual biar template gak rusak
      product: item.products,
    }));
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

// --- TINDAKAN 2: TAKE DOWN (Banned Asset) ---
const takeDown = async (reportId, productId, sellerId) => {
  if (!sellerId) return notify.error("Error", "ID Seller tidak ditemukan!");

  const confirmBanned = confirm(
    "Take down aset ini? Reputasi seller akan dipotong 50 poin.",
  );
  if (!confirmBanned) return;

  try {
    // 1. Banned Produk
    await supabase
      .from("products")
      .update({ status: "banned" })
      .eq("id", productId);

    // 2. Potong Reputasi (Panggil fungsi SQL tadi)
    const { error: repErr } = await supabase.rpc("decrease_reputation", {
      user_id: sellerId,
      amount: 50,
    });

    if (repErr) throw repErr;

    // 3. Update Status Laporan
    await supabase
      .from("reports")
      .update({ status: "action_taken" })
      .eq("id", reportId);

    notify.success("Justice Served", "Aset di-banned & Poin dipotong.");
    fetchReports();
  } catch (err) {
    console.error("Gagal eksekusi hukuman:", err);
    notify.error("Execution Failed", err.message);
  }
};

onMounted(() => {
  fetchReports();
});
</script>

<template>
  <div
    class="min-h-screen bg-black p-6 md:p-10 text-white uppercase italic font-black"
  >
    <div
      class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
    >
      <div>
        <div class="flex items-center gap-4 mb-2">
          <ShieldExclamationIcon
            class="w-10 h-10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          />
          <h1 class="text-4xl md:text-5xl tracking-tighter">
            Investigation <span class="text-red-500 text-shadow-red">Room</span>
          </h1>
        </div>
        <p class="text-[10px] tracking-[0.4em] text-gray-500">
          System Moderation & Asset Enforcement
        </p>
      </div>

      <div class="flex gap-4">
        <div class="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
          <p class="text-[8px] text-gray-600 mb-1">Total Reports</p>
          <p class="text-xl text-white">{{ reports.length }}</p>
        </div>
        <div
          class="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl"
        >
          <p class="text-[8px] text-red-500 mb-1">Pending Cases</p>
          <p class="text-xl text-red-500">
            {{ reports.filter((r) => r.status === "pending").length }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="!loading"
      class="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-xl"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-white/5 bg-white/[0.03]">
              <th class="p-6 text-[10px] text-gray-500 tracking-widest">
                Reported Asset
              </th>
              <th class="p-6 text-[10px] text-gray-500 tracking-widest">
                Reporter Info
              </th>
              <th class="p-6 text-[10px] text-gray-500 tracking-widest">
                Violation Type
              </th>
              <th
                class="p-6 text-[10px] text-gray-500 tracking-widest text-right"
              >
                Enforcement
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              v-for="report in reports"
              :key="report.id"
              class="group hover:bg-white/[0.02] transition-colors"
            >
              <td class="p-6">
                <div class="flex items-center gap-4">
                  <div
                    class="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-gray-900"
                  >
                    <img
                      v-if="report.product?.image_url"
                      :src="report.product.image_url"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p class="text-sm tracking-tight mb-1">
                      {{ report.product?.name || "Deleted Asset" }}
                    </p>
                    <p class="text-[8px] text-gray-600 font-bold">
                      Ref: #{{ report.product_id }}
                    </p>
                  </div>
                </div>
              </td>

              <td class="p-6">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-white/10"
                  >
                    <img
                      v-if="report.reporter?.avatar_url"
                      :src="report.reporter.avatar_url"
                      class="w-full h-full object-cover"
                    />
                    <UserCircleIcon v-else class="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p class="text-[10px] text-yellow-500">
                      @{{ report.reporter?.username }}
                    </p>
                    <p class="text-[8px] text-gray-600 font-bold uppercase">
                      {{ new Date(report.created_at).toLocaleDateString() }}
                    </p>
                  </div>
                </div>
              </td>

              <td class="p-6">
                <div class="max-w-xs">
                  <div class="flex items-center gap-2 mb-2">
                    <div
                      class="w-1.5 h-1.5 rounded-full"
                      :class="
                        report.status === 'pending'
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-gray-600'
                      "
                    ></div>
                    <span class="text-[9px] text-red-500 tracking-widest">{{
                      report.reason_category || "UNSPECIFIED"
                    }}</span>
                  </div>
                  <p
                    class="text-[11px] text-gray-400 normal-case leading-relaxed font-bold italic"
                  >
                    {{ report.reason }}
                  </p>
                </div>
              </td>

              <td class="p-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <a
                    :href="`/product/${report.product_id}`"
                    target="_blank"
                    class="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5"
                  >
                    <EyeIcon class="w-4 h-4 text-gray-400" />
                  </a>

                  <button
                    v-if="report.status === 'pending'"
                    @click="markReviewed(report.id)"
                    class="p-3 bg-green-500/10 rounded-xl hover:bg-green-500/20 transition-all border border-green-500/20"
                    title="Mark as Safe"
                  >
                    <CheckBadgeIcon class="w-4 h-4 text-green-500" />
                  </button>

                  <button
                    v-if="report.product?.status !== 'banned'"
                    @click="
                      takeDown(
                        report.id,
                        report.product_id,
                        report.product.user_id,
                      )
                    "
                    class="p-3 bg-red-600/10 rounded-xl hover:bg-red-600/20 transition-all border border-red-600/20"
                  >
                    <TrashIcon class="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="reports.length === 0" class="py-32 text-center">
        <p class="text-[10px] text-gray-600 tracking-[0.5em]">
          No Hostile Transmission Detected
        </p>
      </div>
    </div>

    <div v-else class="py-32 flex flex-col items-center">
      <div
        class="w-12 h-12 border-2 border-white/10 border-t-red-500 rounded-full animate-spin"
      ></div>
      <p class="text-[8px] text-gray-600 mt-6 tracking-[0.5em]">
        Decrypting Data...
      </p>
    </div>
  </div>
</template>

<style scoped>
.text-shadow-red {
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
}
</style>
