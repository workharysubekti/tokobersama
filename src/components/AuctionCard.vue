<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify.js";

const props = defineProps(["product"]);
const timeLeft = ref("");
const bidHistory = ref([]);

// Fungsi buat naruh penawaran (Bid)
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

    // PROSES 1: Update harga di tabel products (sama kayak sebelumnya)
    const { error: productError } = await supabase
      .from("products")
      .update({ current_bid: amount })
      .eq("id", props.product.id);

    if (productError) {
      notify.error("Gagal!", "Sistem menolak bid kamu.");
      return;
    }

    // PROSES 2: Catat history di tabel bids (Ini yang baru!)
    const { error: historyError } = await supabase.from("bids").insert([
      {
        product_id: props.product.id,
        user_id: user.id,
        amount: amount,
      },
    ]);

    if (!historyError) {
      notify.success("GACOR!", "Bid kamu berhasil dicatat!");
    }
  }
};

// Timer Logic tetap sama
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

let timer;
onMounted(() => {
  calculateTime();
  timer = setInterval(calculateTime, 1000);
});
onUnmounted(() => clearInterval(timer));

// Fungsi ambil history bid terbaru
const fetchBidHistory = async () => {
  const { data, error } = await supabase
    .from("bids")
    .select(
      `
      amount,
      created_at,
      profiles (username)
    `,
    )
    .eq("product_id", props.product.id)
    .order("created_at", { ascending: false })
    .limit(3); // Tampilkan 3 penawar terakhir saja biar nggak penuh

  if (data) bidHistory.value = data;
};

onMounted(() => {
  fetchBidHistory();

  // REALTIME buat history: Kalau ada yang ngebid, list-nya langsung update
  supabase
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
</script>

<template>
  <div
    class="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-yellow-500 transition-all group"
  >
    <div class="relative h-64 overflow-hidden">
      <img
        :src="product.image_url"
        loading="lazy"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div
        class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded"
      >
        {{ timeLeft }}
      </div>
    </div>

    <div class="p-4">
      <h3 class="font-bold text-lg truncate">{{ product.name }}</h3>
      <div class="mt-4 flex justify-between items-end">
        <div>
          <p class="text-gray-500 text-xs uppercase tracking-widest">
            Current Bid
          </p>
          <p class="text-yellow-500 font-bold text-xl">
            Rp {{ product.current_bid.toLocaleString() }}
          </p>
        </div>
        <button
          @click="placeBid"
          class="bg-white text-black px-4 py-2 text-xs font-bold uppercase hover:bg-yellow-500"
        >
          Bid Now
        </button>
        <div class="mt-4 pt-4 border-t border-gray-800">
          <p
            class="text-[10px] text-gray-500 uppercase tracking-widest mb-2 text-center italic"
          >
            Recent Bids
          </p>

          <div v-if="bidHistory.length > 0" class="space-y-2">
            <div
              v-for="(bid, index) in bidHistory"
              :key="index"
              class="flex justify-between items-center text-[11px]"
            >
              <span class="text-gray-400 font-mono"
                >@{{ bid.profiles?.username.split("@")[0] }}</span
              >
              <span
                :class="
                  index === 0 ? 'text-yellow-500 font-bold' : 'text-gray-500'
                "
              >
                Rp {{ bid.amount.toLocaleString() }}
              </span>
            </div>
          </div>

          <div v-else class="text-center text-[10px] text-gray-700 py-2 italic">
            Belum ada penawaran...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
