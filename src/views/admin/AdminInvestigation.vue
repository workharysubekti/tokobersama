<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabase.js";
import { notify } from "../../utils/notify.js";
import {
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  TrashIcon,
  EyeIcon,
  ShieldExclamationIcon,
} from "@heroicons/vue/24/outline";

const reports = ref([]);
const loading = ref(true);

// 1. Ambil Data Laporan (Join dengan Profile & Product)
const fetchReports = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        reporter:profiles!reporter_id(username, full_name),
        product:products!product_id(id, name, image_url, status)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    reports.value = data;
  } catch (err) {
    notify.error("Gagal Ambil Data", err.message);
  } finally {
    loading.value = false;
  }
};

// 2. Tindakan: Tandai Laporan Selesai (Reviewed)
const markAsReviewed = async (id) => {
  try {
    const { error } = await supabase
      .from("reports")
      .update({ status: "reviewed" })
      .eq("id", id);

    if (error) throw error;
    notify.success("Updated", "Laporan ditandai sebagai reviewed.");
    fetchReports();
  } catch (err) {
    notify.error("Gagal", err.message);
  }
};

// 3. Tindakan: Take Down Produk (Banned)
const takeDownProduct = async (reportId, productId) => {
  if (
    !confirm("Yakin mau banned produk ini? Barang ini akan hilang dari publik.")
  )
    return;

  try {
    // Update Status Produk jadi 'banned' atau 'archived'
    const { error: prodErr } = await supabase
      .from("products")
      .update({ status: "banned" })
      .eq("id", productId);

    if (prodErr) throw prodErr;

    // Update Status Laporan
    await supabase
      .from("reports")
      .update({ status: "action_taken" })
      .eq("id", reportId);

    notify.success("Banned!", "Produk berhasil di-take down.");
    fetchReports();
  } catch (err) {
    notify.error("Gagal Eksekusi", err.message);
  }
};

onMounted(() => {
  fetchReports();
});
</script>

<template>
  <div class="p-8 bg-black min-h-screen text-white">
    <div class="mb-12">
      <div class="flex items-center gap-4 mb-2">
        <ShieldExclamationIcon class="w-8 h-8 text-red-500" />
        <h1 class="text-4xl font-[1000] italic uppercase tracking-tighter">
          Investigation Room
        </h1>
      </div>
      <p
        class="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic"
      >
        Tokber Security & Moderation Center
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <div class="bg-white/[0.02] border border-white/5 p-6 rounded-[32px]">
        <p
          class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1"
        >
          Total Reports
        </p>
        <p class="text-3xl font-[1000] italic text-white">
          {{ reports.length }}
        </p>
      </div>
      <div class="bg-red-500/5 border border-red-500/10 p-6 rounded-[32px]">
        <p
          class="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1"
        >
          Pending Investigation
        </p>
        <p class="text-3xl font-[1000] italic text-red-500">
          {{ reports.filter((r) => r.status === "pending").length }}
        </p>
      </div>
    </div>

    <div
      class="bg-[#080808] border border-white/5 rounded-[40px] overflow-hidden"
    >
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/5 bg-white/[0.02]">
            <th
              class="p-6 text-[10px] font-black uppercase italic text-gray-500"
            >
              Target Asset
            </th>
            <th
              class="p-6 text-[10px] font-black uppercase italic text-gray-500"
            >
              Reporter
            </th>
            <th
              class="p-6 text-[10px] font-black uppercase italic text-gray-500"
            >
              Violation
            </th>
            <th
              class="p-6 text-[10px] font-black uppercase italic text-gray-500"
            >
              Status
            </th>
            <th
              class="p-6 text-[10px] font-black uppercase italic text-gray-500 text-right"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr
            v-for="report in reports"
            :key="report.id"
            class="hover:bg-white/[0.01] transition-all group"
          >
            <td class="p-6">
              <div class="flex items-center gap-4">
                <img
                  :src="report.product?.image_url"
                  class="w-12 h-12 rounded-xl object-cover border border-white/10"
                />
                <div>
                  <p class="text-sm font-black italic uppercase text-white">
                    {{ report.product?.name }}
                  </p>
                  <p class="text-[8px] text-gray-600 font-bold tracking-widest">
                    ID: {{ report.product_id }}
                  </p>
                </div>
              </div>
            </td>
            <td class="p-6">
              <p class="text-xs font-black italic text-yellow-500 uppercase">
                @{{ report.reporter?.username }}
              </p>
              <p class="text-[8px] text-gray-600 font-bold uppercase">
                {{ report.reporter?.full_name }}
              </p>
            </td>
            <td class="p-6">
              <span
                class="text-[9px] px-3 py-1 bg-red-500/10 text-red-500 rounded-full font-black uppercase italic border border-red-500/20 mb-2 inline-block"
              >
                {{ report.reason_category }}
              </span>
              <p class="text-[11px] text-gray-400 italic leading-snug max-w-xs">
                {{ report.reason }}
              </p>
            </td>
            <td class="p-6">
              <div class="flex items-center gap-2">
                <div
                  class="w-1.5 h-1.5 rounded-full"
                  :class="
                    report.status === 'pending'
                      ? 'bg-orange-500 animate-pulse'
                      : 'bg-green-500'
                  "
                ></div>
                <span
                  class="text-[10px] font-black uppercase italic tracking-widest"
                  :class="
                    report.status === 'pending'
                      ? 'text-orange-500'
                      : 'text-green-500'
                  "
                >
                  {{ report.status }}
                </span>
              </div>
            </td>
            <td class="p-6">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="$router.push(`/product/${report.product_id}`)"
                  class="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <EyeIcon class="w-4 h-4 text-gray-400" />
                </button>
                <button
                  v-if="report.status === 'pending'"
                  @click="markAsReviewed(report.id)"
                  class="p-3 bg-green-500/10 rounded-xl hover:bg-green-500/20 transition-all"
                >
                  <CheckBadgeIcon class="w-4 h-4 text-green-500" />
                </button>
                <button
                  v-if="report.product?.status !== 'banned'"
                  @click="takeDownProduct(report.id, report.product_id)"
                  class="p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all"
                >
                  <TrashIcon class="w-4 h-4 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="reports.length === 0" class="p-20 text-center">
        <p
          class="text-xs font-black italic text-gray-600 uppercase tracking-[0.5em]"
        >
          No Violation Detected
        </p>
      </div>
    </div>
  </div>
</template>
