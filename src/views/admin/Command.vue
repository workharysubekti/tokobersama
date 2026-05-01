<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabase.js";
import { notify } from "../../utils/notify.js";
import {
  TicketIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
  XMarkIcon,
  PhotoIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/vue/24/outline";

const allTickets = ref([]);
const loading = ref(true);
const activeTab = ref("premium_request");
const selectedTicket = ref(null); // State untuk tiket yang sedang dibuka

const filteredTickets = computed(() =>
  allTickets.value.filter((t) => t.category === activeTab.value),
);

const fetchTickets = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(`*, profiles(username, full_name, avatar_url, reputation)`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    allTickets.value = data;

    // Auto-select tiket pertama kalau ada
    if (data.length > 0 && !selectedTicket.value) {
      selectedTicket.value =
        data.find((t) => t.category === activeTab.value) || data[0];
    }
  } catch (err) {
    notify.error("Database Error", "Gagal mengambil data tiket.");
  } finally {
    loading.value = false;
  }
};

const updateTicketStatus = async (newStatus) => {
  if (!selectedTicket.value) return;
  const note = prompt(
    "Berikan tanggapan untuk user:",
    selectedTicket.value.admin_note || "",
  );
  if (note === null) return;

  try {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: newStatus, admin_note: note })
      .eq("id", selectedTicket.value.id);

    if (error) throw error;
    notify.success("Updated", `Tiket ${newStatus}`);
    await fetchTickets();
    // Update local state agar UI sinkron
    selectedTicket.value = allTickets.value.find(
      (t) => t.id === selectedTicket.value.id,
    );
  } catch (err) {
    notify.error("Update Failed", err.message);
  }
};

onMounted(fetchTickets);
</script>

<template>
  <div
    class="h-screen bg-black text-white font-black italic uppercase flex flex-col overflow-hidden"
  >
    <!-- TOP NAV / TABS -->
    <header
      class="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-black/50 backdrop-blur-xl z-30"
    >
      <div class="flex items-center gap-3">
        <TicketIcon class="w-8 h-8 text-yellow-500" />
        <h1 class="text-2xl tracking-tighter">
          Command <span class="text-yellow-500">Hub</span>
        </h1>
      </div>

      <div class="flex bg-white/5 p-1 rounded-2xl border border-white/10">
        <button
          v-for="tab in ['premium_request', 'collab', 'report']"
          :key="tab"
          @click="activeTab = tab"
          :class="
            activeTab === tab ? 'bg-yellow-500 text-black' : 'text-gray-500'
          "
          class="px-5 py-2 rounded-xl text-[9px] tracking-widest transition-all"
        >
          {{ tab.replace("_", " ") }}
        </button>
      </div>
    </header>

    <!-- MAIN SPLIT VIEW -->
    <main class="flex-1 flex overflow-hidden">
      <!-- LEFT: INBOX LIST (35% Width) -->
      <section
        class="w-full md:w-[35%] border-r border-white/5 overflow-y-auto custom-scrollbar bg-white/[0.01]"
      >
        <div v-if="loading" class="p-6 space-y-4">
          <div
            v-for="i in 5"
            :key="i"
            class="h-20 bg-white/5 rounded-2xl animate-pulse"
          ></div>
        </div>

        <div
          v-else-if="filteredTickets.length === 0"
          class="p-20 text-center opacity-20 text-[10px]"
        >
          NO INCOMING TRANSMISSIONS
        </div>

        <div v-else class="divide-y divide-white/5">
          <div
            v-for="ticket in filteredTickets"
            :key="ticket.id"
            @click="selectedTicket = ticket"
            :class="
              selectedTicket?.id === ticket.id
                ? 'bg-yellow-500/10 border-l-4 border-yellow-500'
                : 'hover:bg-white/[0.03] border-l-4 border-transparent'
            "
            class="p-5 cursor-pointer transition-all flex gap-4"
          >
            <div
              class="w-10 h-10 rounded-xl bg-gray-900 overflow-hidden flex-shrink-0 border border-white/10"
            >
              <img
                v-if="ticket.profiles?.avatar_url"
                :src="ticket.profiles.avatar_url"
                class="w-full h-full object-cover"
              />
              <UserCircleIcon v-else class="w-full h-full text-gray-800" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start mb-1">
                <p class="text-[10px] text-yellow-500 truncate">
                  @{{ ticket.profiles?.username }}
                </p>
                <span class="text-[8px] text-gray-600">{{
                  new Date(ticket.created_at).toLocaleDateString()
                }}</span>
              </div>
              <p class="text-xs text-white truncate">{{ ticket.subject }}</p>
              <p
                class="text-[9px] text-gray-500 line-clamp-1 normal-case italic"
              >
                {{ ticket.description }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT: DETAIL VIEW (65% Width) -->
      <section
        class="hidden md:flex flex-1 flex-col bg-[#050505] overflow-y-auto"
      >
        <div v-if="selectedTicket" class="p-10 space-y-8 max-w-4xl">
          <!-- DETAIL HEADER -->
          <div
            class="flex justify-between items-start border-b border-white/5 pb-8"
          >
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span
                  class="bg-white/5 px-3 py-1 rounded-full text-[9px] border border-white/10"
                  >{{ selectedTicket.category }}</span
                >
                <span
                  :class="
                    selectedTicket.status === 'open'
                      ? 'text-zinc-500'
                      : 'text-green-500'
                  "
                  class="text-[9px]"
                  >● {{ selectedTicket.status }}</span
                >
              </div>
              <h2 class="text-3xl tracking-tighter leading-tight">
                {{ selectedTicket.subject }}
              </h2>
              <div class="flex items-center gap-2 text-gray-500 text-[10px]">
                <p>
                  From:
                  <span class="text-white"
                    >@{{ selectedTicket.profiles?.username }}</span
                  >
                  ({{ selectedTicket.profiles?.full_name }})
                </p>
                <span>•</span>
                <p>
                  Reputation:
                  <span class="text-yellow-500">{{
                    selectedTicket.profiles?.reputation
                  }}</span>
                </p>
              </div>
            </div>

            <!-- ACTIONS -->
            <div class="flex gap-2">
              <button
                @click="updateTicketStatus('on-progress')"
                class="p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl hover:bg-blue-600/20"
              >
                <ClockIcon class="w-5 h-5 text-blue-500" />
              </button>
              <button
                @click="updateTicketStatus('resolved')"
                class="p-3 bg-green-500/10 border border-green-500/20 rounded-xl hover:bg-green-600/20"
              >
                <CheckCircleIcon class="w-5 h-5 text-green-500" />
              </button>
            </div>
          </div>

          <!-- MESSAGE CONTENT -->
          <div class="space-y-6">
            <div
              class="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5"
            >
              <p
                class="text-sm md:text-base normal-case italic font-medium leading-relaxed text-gray-300"
              >
                {{ selectedTicket.description }}
              </p>
            </div>

            <!-- IMAGE ATTACHMENT -->
            <div v-if="selectedTicket.image_url" class="space-y-3">
              <p
                class="text-[10px] text-gray-600 tracking-widest flex items-center gap-2"
              >
                <PhotoIcon class="w-4 h-4" /> ATTACHMENT EVIDENCE
              </p>
              <div
                class="relative group max-w-lg rounded-3xl overflow-hidden border-2 border-white/10"
              >
                <img
                  :src="selectedTicket.image_url"
                  class="w-full object-contain bg-zinc-900"
                />
                <a
                  :href="selectedTicket.image_url"
                  target="_blank"
                  class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                >
                  <ArrowTopRightOnSquareIcon class="w-6 h-6" /> VIEW FULL SIZE
                </a>
              </div>
            </div>

            <!-- ADMIN RESPONSE DISPLAY -->
            <div
              v-if="selectedTicket.admin_note"
              class="bg-yellow-500/5 border border-yellow-500/10 p-6 rounded-3xl"
            >
              <p class="text-[9px] text-yellow-500 mb-2">
                LAST ADMIN RESPONSE:
              </p>
              <p class="text-xs text-gray-300 italic normal-case">
                {{ selectedTicket.admin_note }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex-1 flex flex-col items-center justify-center opacity-10"
        >
          <TicketIcon class="w-20 h-20 mb-4" />
          <p class="text-xs tracking-[0.5em]">
            SELECT A TRANSMISSION TO VIEW DETAILS
          </p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
</style>
