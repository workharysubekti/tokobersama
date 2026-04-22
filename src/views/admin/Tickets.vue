<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabase";
import { formatPrice } from "../../utils/format";
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/outline";

const tickets = ref([]);
const loading = ref(true);

const fetchTickets = async () => {
  const { data } = await supabase
    .from("support_tickets")
    .select("*, profiles(username)")
    .order("created_at", { ascending: false });
  tickets.value = data || [];
  loading.value = false;
};

const resolveTicket = async (id, note) => {
  const { error } = await supabase
    .from("support_tickets")
    .update({ status: "resolved", admin_note: note })
    .eq("id", id);
  if (!error) fetchTickets();
};

onMounted(fetchTickets);
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-xl font-[1000] italic uppercase tracking-tighter">
      Support <span class="text-yellow-500">Tickets</span>
    </h3>

    <div class="grid grid-cols-1 gap-4">
      <div
        v-for="ticket in tickets"
        :key="ticket.id"
        class="bg-[#0d0d0d] border border-white/5 p-6 rounded-[32px] hover:border-yellow-500/20 transition-all group"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <span
              :class="
                ticket.status === 'open'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-green-500/20 text-green-500'
              "
              class="px-3 py-1 rounded-full text-[8px] font-black uppercase italic tracking-widest"
            >
              {{ ticket.status }}
            </span>
            <p
              class="text-[10px] font-black text-gray-500 uppercase tracking-widest italic"
            >
              From:
              <span class="text-white">@{{ ticket.profiles?.username }}</span>
            </p>
          </div>
          <p class="text-[8px] text-gray-700 font-bold uppercase italic">
            {{ new Date(ticket.created_at).toLocaleString() }}
          </p>
        </div>

        <h4 class="text-md font-black italic uppercase mb-2">
          {{ ticket.subject }}
        </h4>
        <p
          class="text-[11px] text-gray-400 italic normal-case leading-relaxed mb-6"
        >
          {{ ticket.description }}
        </p>

        <div v-if="ticket.status === 'open'" class="flex gap-2">
          <input
            type="text"
            placeholder="WRITE RESOLUTION NOTE..."
            class="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-[10px] outline-none focus:border-yellow-500"
            @keyup.enter="(e) => resolveTicket(ticket.id, e.target.value)"
          />
          <button
            class="bg-yellow-500 text-black px-6 rounded-2xl font-black italic uppercase text-[10px] hover:scale-95 transition-all"
          >
            Resolve
          </button>
        </div>
        <div
          v-else
          class="bg-white/[0.02] p-4 rounded-2xl border border-white/5"
        >
          <p
            class="text-[8px] font-black text-yellow-500 uppercase italic mb-1 tracking-[0.2em]"
          >
            Admin Resolution:
          </p>
          <p class="text-[10px] text-gray-500 italic normal-case italic">
            {{ ticket.admin_note }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
