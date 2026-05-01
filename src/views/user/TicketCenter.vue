<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabase.js";
import {
  TicketIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowUpCircleIcon,
  BanknotesIcon,
  QrCodeIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/24/outline";

const tickets = ref([]);
const userProducts = ref([]);
const loading = ref(true);

// State Form & Payment
const selectedProduct = ref("");
const premiumNote = ref("");
const showPaymentModal = ref(false);
const isSubmitting = ref(false);
const ELITE_PRICE = 50000;

const fetchData = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Ambil history dari tabel support_tickets
  const { data: ticketData } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  tickets.value = ticketData || [];

  // 2. Ambil produk aktif milik user
  const { data: productData } = await supabase
    .from("products")
    .select("id, name")
    .eq("owner_id", user.id)
    .eq("status", "active");

  userProducts.value = productData || [];
  loading.value = false;
};

const initiateUpgrade = () => {
  if (!selectedProduct.value) return alert("Pilih barang yang mau di-upgrade!");
  showPaymentModal.value = true;
};

const confirmPaymentAndSubmit = async () => {
  isSubmitting.value = true;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert menggunakan skema support_tickets Mas Hary
  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    category: "premium_request",
    subject: `UPGRADE TO ELITE: ${selectedProduct.value}`,
    description: `${premiumNote.value} | PAID: Rp ${ELITE_PRICE.toLocaleString()}`,
    status: "open", // Sesuai check constraint tabel Mas
  });

  if (!error) {
    alert("Pembayaran Berhasil Diverifikasi!");
    showPaymentModal.value = false;
    selectedProduct.value = "";
    premiumNote.value = "";
    fetchData();
  }
  isSubmitting.value = false;
};

onMounted(fetchData);

// Mapping status sesuai constraint tabel Mas Hary
const getStatusClass = (status) => {
  if (status === "open") return "bg-zinc-800 text-zinc-400 border-zinc-700";
  if (status === "on-progress")
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  if (status === "resolved")
    return "bg-green-500/10 text-green-500 border-green-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
};
</script>

<template>
  <div
    class="min-h-screen bg-transparent text-white p-6 pt-12 pb-32 max-w-7xl mx-auto space-y-12"
  >
    <!-- HEADER -->
    <header class="space-y-2">
      <h1
        class="text-4xl md:text-6xl font-[1000] italic uppercase tracking-tighter leading-none"
      >
        TICKET <span class="text-yellow-500">ARENA</span>
      </h1>
      <p
        class="text-[10px] md:text-xs font-black italic uppercase text-gray-500 tracking-[0.4em]"
      >
        Arena Oversight & Status Monitoring
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <!-- SISI KIRI: HISTORY TICKET (VIEW UTAMA) -->
      <section class="lg:col-span-2 space-y-6">
        <div class="flex items-center gap-3 border-b-2 border-white/5 pb-4">
          <TicketIcon class="w-6 h-6 text-yellow-500" />
          <h2 class="text-xl font-black italic uppercase">Request History</h2>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-4">
          <div
            v-for="i in 3"
            :key="i"
            class="h-28 bg-white/5 rounded-[2.5rem] animate-pulse"
          ></div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="tickets.length === 0"
          class="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem]"
        >
          <p
            class="text-xs font-bold italic uppercase text-gray-600 tracking-widest"
          >
            Belum ada aktivitas ticket di arena ini.
          </p>
        </div>

        <!-- Ticket List -->
        <div v-else class="space-y-4">
          <div
            v-for="ticket in tickets"
            :key="ticket.id"
            class="group p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col md:flex-row justify-between gap-6 transition-all hover:bg-white/[0.05]"
          >
            <div class="space-y-3 flex-1">
              <div class="flex items-center gap-3">
                <span
                  class="px-3 py-1 rounded-full text-[8px] font-black uppercase italic border"
                  :class="getStatusClass(ticket.status)"
                >
                  {{ ticket.status }}
                </span>
                <span
                  class="text-[9px] font-black text-gray-600 uppercase italic"
                  >{{ new Date(ticket.created_at).toLocaleDateString() }}</span
                >
              </div>
              <h3
                class="text-sm md:text-base font-black italic uppercase text-white group-hover:text-yellow-500 transition-colors"
              >
                {{ ticket.subject }}
              </h3>
              <p
                class="text-[11px] md:text-xs text-gray-500 font-bold italic uppercase leading-relaxed"
              >
                {{ ticket.description }}
              </p>

              <!-- Admin Note (Sangat Penting buat Feedback) -->
              <div
                v-if="ticket.admin_note"
                class="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl"
              >
                <p
                  class="text-[9px] font-black text-yellow-500 uppercase italic mb-1"
                >
                  Response from Command Center:
                </p>
                <p
                  class="text-[10px] font-bold text-gray-300 italic uppercase leading-tight"
                >
                  {{ ticket.admin_note }}
                </p>
              </div>
            </div>

            <div class="flex items-start md:justify-end md:w-32">
              <span
                class="text-[9px] font-black text-white/20 uppercase italic tracking-widest"
                >{{ ticket.category }}</span
              >
            </div>
          </div>
        </div>
      </section>

      <!-- SISI KANAN: UPGRADE FORM -->
      <aside class="space-y-6">
        <div
          class="bg-yellow-500 p-10 rounded-[3rem] text-black space-y-8 shadow-2xl shadow-yellow-500/10"
        >
          <div class="space-y-2">
            <h2
              class="text-2xl font-[1000] italic uppercase leading-none flex items-center gap-2"
            >
              <ArrowUpCircleIcon class="w-7 h-7" /> Elite Selection
            </h2>
            <p
              class="text-[11px] font-black uppercase leading-tight opacity-80 italic"
            >
              Aktivasi instan: Rp {{ ELITE_PRICE.toLocaleString() }}
            </p>
          </div>

          <div class="space-y-5">
            <div class="space-y-2">
              <label class="text-[10px] font-[1000] uppercase italic ml-2"
                >Pilih Item Arena</label
              >
              <select
                v-model="selectedProduct"
                class="w-full bg-black/10 border-2 border-black/20 p-5 rounded-2xl text-xs font-bold italic uppercase outline-none focus:border-black"
              >
                <option value="" disabled>-- Select Item --</option>
                <option v-for="p in userProducts" :key="p.id" :value="p.name">
                  {{ p.name }}
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-[1000] uppercase italic ml-2"
                >Justifikasi Upgrade</label
              >
              <textarea
                v-model="premiumNote"
                rows="3"
                class="w-full bg-black/10 border-2 border-black/20 p-5 rounded-2xl text-xs font-bold italic uppercase outline-none focus:border-black resize-none"
                placeholder="Kenapa harus Elite?"
              ></textarea>
            </div>

            <button
              @click="initiateUpgrade"
              class="w-full bg-black text-white py-5 rounded-2xl font-[1000] italic uppercase text-xs flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20"
            >
              <BanknotesIcon class="w-5 h-5" />
              UPGRADE SEKARANG
            </button>
          </div>
        </div>

        <!-- INFO BOX -->
        <div
          class="p-8 bg-white/[0.02] border border-white/10 rounded-[2.5rem] space-y-4"
        >
          <h4
            class="text-xs font-black uppercase text-yellow-500 italic tracking-widest"
          >
            Premium Protocols
          </h4>
          <ul
            class="text-[10px] font-bold uppercase italic text-gray-500 space-y-3"
          >
            <li class="flex items-start gap-3">
              <CheckCircleIcon class="w-4 h-4 text-yellow-500 flex-shrink-0" />
              Prioritas Utama di Arena
            </li>
            <li class="flex items-start gap-3">
              <CheckCircleIcon class="w-4 h-4 text-yellow-500 flex-shrink-0" />
              Verifikasi Elite Badge
            </li>
            <li class="flex items-start gap-3">
              <CheckCircleIcon class="w-4 h-4 text-yellow-500 flex-shrink-0" />
              Eksposur Maksimal ke Kolektor
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- PAYMENT MODAL (REMAIN THE SAME) -->
    <div
      v-if="showPaymentModal"
      class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
    >
      <div
        class="bg-white w-full max-w-md rounded-[3rem] overflow-hidden text-black shadow-2xl"
      >
        <div class="p-10 text-center space-y-8">
          <div class="flex justify-between items-center border-b pb-6">
            <span
              class="text-xs font-[1000] uppercase italic tracking-widest text-gray-400"
              >Arena Payment</span
            >
            <button
              @click="showPaymentModal = false"
              class="hover:rotate-90 transition-transform"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>
          <div class="space-y-2">
            <p
              class="text-xs font-black uppercase text-gray-500 tracking-widest"
            >
              Amount Due
            </p>
            <h3 class="text-4xl font-[1000] italic uppercase tracking-tighter">
              Rp {{ ELITE_PRICE.toLocaleString() }}
            </h3>
          </div>
          <div
            class="bg-zinc-100 p-8 rounded-[2rem] border-4 border-dashed border-zinc-200 flex flex-col items-center gap-6"
          >
            <QrCodeIcon class="w-40 h-40 text-zinc-300" />
            <p
              class="text-[10px] font-black uppercase text-zinc-400 tracking-widest"
            >
              Scan QRIS • Livin • Dana • GoPay
            </p>
          </div>
          <button
            @click="confirmPaymentAndSubmit"
            :disabled="isSubmitting"
            class="w-full bg-yellow-500 py-6 rounded-2xl font-[1000] italic uppercase text-sm shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-3 hover:bg-yellow-400 transition-all"
          >
            <CheckCircleIcon class="w-6 h-6" />
            {{ isSubmitting ? "PROCESSING..." : "CONFIRM PAYMENT" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
