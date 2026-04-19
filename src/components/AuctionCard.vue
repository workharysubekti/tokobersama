<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";

const props = defineProps(["product"]);
const timeLeft = ref("");

// Fungsi buat naruh penawaran (Bid)
const placeBid = async () => {
  const bidAmount = prompt(
    `Masukkan jumlah Bid (Minimal Rp ${props.product.current_bid + 50000})`,
  );

  if (bidAmount) {
    const amount = parseInt(bidAmount);

    // Validasi sederhana: Harus lebih tinggi dari bid sekarang
    if (amount <= props.product.current_bid) {
      alert("Bid harus lebih tinggi dari harga sekarang!");
      return;
    }

    // UPDATE DATABASE
    const { error } = await supabase
      .from("products")
      .update({ current_bid: amount })
      .eq("id", props.product.id);

    if (error) {
      alert("Gagal ngebid: " + error.message);
    } else {
      alert("BERHASIL! Penawaranmu diterima.");
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
</script>

<template>
  <div
    class="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-yellow-500 transition-all group"
  >
    <div class="relative h-64 overflow-hidden">
      <img
        :src="product.image_url"
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
      </div>
    </div>
  </div>
</template>
