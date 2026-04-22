<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabase";
import { formatPrice } from "../../utils/format";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/vue/24/solid";

const incomeLogs = ref([]);
const loading = ref(true);

const fetchIncome = async () => {
  const { data } = await supabase
    .from("income_logs")
    .select("*, products(name)")
    .order("created_at", { ascending: false });
  incomeLogs.value = data || [];
  loading.value = false;
};

const markAsPaid = async (id) => {
  const { error } = await supabase
    .from("income_logs")
    .update({ status: "completed" })
    .eq("id", id);
  if (!error) fetchIncome();
};

onMounted(fetchIncome);
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-xl font-[1000] italic uppercase tracking-tighter">
      Finance <span class="text-yellow-500">Logs</span>
    </h3>

    <div
      class="bg-[#0d0d0d] border border-white/5 rounded-[32px] overflow-hidden"
    >
      <table class="w-full text-left">
        <thead
          class="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5"
        >
          <tr>
            <th class="px-8 py-4">Transaction Source</th>
            <th class="px-8 py-4">Type</th>
            <th class="px-8 py-4">Amount</th>
            <th class="px-8 py-4">Status</th>
            <th class="px-8 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr v-for="log in incomeLogs" :key="log.id">
            <td class="px-8 py-6 text-xs font-black italic uppercase">
              {{ log.products?.name || "Deleted Product" }}
            </td>
            <td class="px-8 py-6">
              <span
                class="text-[9px] text-gray-500 font-bold uppercase italic tracking-widest"
                >{{ log.fee_type }}</span
              >
            </td>
            <td class="px-8 py-6 text-sm font-black italic text-green-500">
              {{ formatPrice(log.amount) }}
            </td>
            <td class="px-8 py-6">
              <div class="flex items-center gap-2">
                <div
                  :class="
                    log.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                  "
                  class="w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor]"
                ></div>
                <span class="text-[8px] font-black uppercase italic">{{
                  log.status
                }}</span>
              </div>
            </td>
            <td class="px-8 py-6 text-right">
              <button
                v-if="log.status === 'pending'"
                @click="markAsPaid(log.id)"
                class="text-yellow-500 hover:text-white p-2"
              >
                <CheckCircleIcon class="w-5 h-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
