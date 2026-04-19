<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify.js";

const props = defineProps(["product"]);
const timeLeft = ref("");
const bidHistory = ref([]);

// --- LOGIKA FUNGSI (TIDAK BERUBAH) ---
const placeBid = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notify.error("Akses Ditolak", "Login dulu ya buat ikutan lelang!");
    return;
  }

  const { value: bidAmount } = await notify.confirmBid(
    props.product.current_bid,
  );

  if (bidAmount) {
    const amount = parseInt(bidAmount);
    const { error: productError } = await supabase
      .from("products")
      .update({ current_bid: amount })
      .eq("id", props.product.id);

    if (productError) {
      notify.error("Gagal!", "Sistem menolak bid kamu.");
      return;
    }

    const { error: historyError } = await supabase
      .from("bids")
      .insert([
        { product_id: props.product.id, user_id: user.id, amount: amount },
      ]);

    if (!historyError) {
      notify.success("GACOR!", "Bid kamu berhasil dicatat!");
    }
  }
};

const calculateTime = () => {
  const diff = new Date(props.product.end_time) - new Date();
  if (diff <= 0) {
    timeLeft.value = "LELANG BERAKHIR";
    return;
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  timeLeft.value = `${hours}j ${minutes}m ${seconds}d`;
};

let historySubscription = null;

onMounted(() => {
  fetchBidHistory();
  setInterval(calculateTime, 1000);

  historySubscription = supabase
    .channel(`history-${props.product.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bids",
        filter: `product_id=eq.${props.product.id}`,
      },
      () => {
        fetchBidHistory();
      },
    )
    .subscribe();
});

onUnmounted(() => {
  if (historySubscription) {
    supabase.removeChannel(historySubscription);
  }
});

const fetchBidHistory = async () => {
  const { data } = await supabase
    .from("bids")
    .select(`amount, created_at, profiles (username)`)
    .eq("product_id", props.product.id)
    .order("created_at", { ascending: false })
    .limit(2); // Cukup 2 di mobile agar lega

  if (data) bidHistory.value = data;
};

const formatPrice = (price) => {
  return price ? price.toLocaleString("id-ID") : "0";
};
</script>

<template>
  <div
    class="bg-[#16191e] border border-white/5 rounded-[30px] overflow-hidden hover:border-yellow-500/30 transition-all shadow-xl group"
  >
    <div class="relative h-60 overflow-hidden">
      <img
        :src="product.image_url"
        loading="lazy"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      />
      <div
        class="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full border border-white/10 italic"
      >
        {{ timeLeft }}
      </div>
    </div>

    <div class="p-5 space-y-5">
      <h3
        class="font-black text-xl text-white italic truncate tracking-tighter uppercase"
      >
        {{ product.name }}
      </h3>

      <div class="flex justify-between items-end">
        <div class="space-y-1">
          <p
            class="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold"
          >
            Current Bid
          </p>
          <p
            class="text-yellow-500 font-black text-2xl italic tracking-tighter leading-none"
          >
            IDR {{ formatPrice(product.current_bid) }}
          </p>
        </div>
        <div class="text-right pb-1">
          <p
            class="text-gray-600 text-[9px] uppercase font-bold tracking-widest"
          >
            Live Auction
          </p>
        </div>
      </div>

      <div class="pt-4 border-t border-white/5">
        <p
          class="text-[9px] text-gray-600 uppercase tracking-[0.2em] mb-3 font-bold italic"
        >
          Recent Activity
        </p>

        <div v-if="bidHistory.length > 0" class="space-y-2">
          <div
            v-for="(bid, index) in bidHistory"
            :key="index"
            class="flex justify-between items-center text-[11px]"
          >
            <span class="text-gray-400 font-mono italic"
              >@{{ bid.profiles?.username.split("@")[0] }}</span
            >
            <span
              :class="
                index === 0
                  ? 'text-yellow-500 font-black'
                  : 'text-gray-500 font-bold'
              "
            >
              IDR {{ formatPrice(bid.amount) }}
            </span>
          </div>
        </div>
        <div
          v-else
          class="text-[10px] text-gray-700 py-1 italic uppercase tracking-widest"
        >
          No bids yet...
        </div>
      </div>

      <div class="pt-1">
        <button
          @click="placeBid"
          class="relative w-full group/btn overflow-hidden transition-all active:scale-95"
        >
          <div
            class="absolute inset-0 bg-yellow-500 blur-lg opacity-0 group-hover/btn:opacity-20 transition-opacity"
          ></div>

          <div
            class="relative flex items-center justify-between bg-gradient-to-r from-yellow-500 to-yellow-600 p-1 rounded-xl"
          >
            <span
              class="flex-1 text-center py-2.5 text-black font-black uppercase italic tracking-tighter text-sm"
            >
              Place Bid Now
            </span>
            <div class="bg-black p-2 rounded-lg ml-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shine {
  from {
    left: -100%;
  }
  to {
    left: 100%;
  }
}

.group\/btn:hover::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transform: skewX(-25deg);
  animation: shine 0.8s infinite;
}
</style>
