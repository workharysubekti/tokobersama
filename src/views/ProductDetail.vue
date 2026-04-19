<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import {
  ClockIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TrophyIcon,
  FireIcon,
  BanknotesIcon,
} from "@heroicons/vue/24/outline";

const recentBids = ref([]);
const route = useRoute();
const router = useRouter();
const product = ref(null);
const loading = ref(true);
const bidAmount = ref(0);
const isSubmitting = ref(false);
const timeLeft = ref("");

let timerInterval = null;

//Recent Bids Logic
const fetchBids = async () => {
  try {
    const { id } = route.params;
    const { data, error } = await supabase
      .from("bids") // Pastikan Mas punya tabel 'bids'
      .select("*, profiles(username, reputation_score)") // Join dengan tabel profile
      .eq("product_id", id)
      .order("amount", { ascending: false })
      .limit(5); // Ambil 5 penawar tertinggi terakhir

    if (error) throw error;
    recentBids.value = data;
  } catch (error) {
    console.error("Gagal ambil history bid:", error.message);
  }
};

//Timer Real Time
const calculateTimeLeft = () => {
  if (!product.value?.end_time) {
    timeLeft.value = "OPEN ENDED";
    return;
  }

  const targetDate = new Date(product.value.end_time).getTime();
  const now = new Date().getTime();
  const difference = targetDate - now;

  if (difference <= 0) {
    timeLeft.value = "AUCTION ENDED";
    if (timerInterval) clearInterval(timerInterval);
    return;
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  // Format tampilan: misal 02d 04h 20m 15s
  timeLeft.value = `${days > 0 ? days + "d " : ""}${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
};

// Props dari App.vue
const props = defineProps({
  userProfile: Object,
});

const fetchProductDetail = async () => {
  try {
    loading.value = true;
    const { id } = route.params;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    product.value = data;
    // Set default bid 10rb lebih tinggi dari harga sekarang
    bidAmount.value = (data.current_bid || 0) + 10000;

    //Jalankan Timer
    calculateTimeLeft();
    timerInterval = setInterval(calculateTimeLeft, 1000);
  } catch (error) {
    console.error("Gagal ambil detail:", error.message);
  } finally {
    loading.value = false;
  }
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

const placeBid = async () => {
  if (!props.userProfile) {
    alert("Login dulu Mas kalau mau nge-bid!");
    router.push("/login");
    return;
  }

  if (bidAmount.value <= product.value.current_bid) {
    alert("Angka bid harus lebih tinggi dari harga sekarang!");
    return;
  }

  try {
    isSubmitting.value = true;
    const { error: updateError } = await supabase
      .from("products")
      .update({ current_bid: bidAmount.value })
      .eq("id", product.value.id);

    if (updateError) throw updateError;

    //Insert data ke tabel history bids
    const { error: bidError } = await supabase.from("bids").insert([
      {
        product_id: product.value.id,
        user_id: props.userProfile.id,
        amount: bidAmount.value,
      },
    ]);

    if (bidError) throw bidError;

    // Refresh data
    product.value.current_bid = bidAmount.value;
    alert("GOKIL! Bid berhasil masuk.");
  } catch (e) {
    alert(e.message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchProductDetail();
  fetchBids();
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div
    class="min-h-screen bg-[#0a0a0a] pt-24 pb-32 px-4 sm:px-10 overflow-hidden relative"
  >
    <div
      class="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 blur-[150px] -z-10"
    ></div>
    <div
      class="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[120px] -z-10"
    ></div>

    <div class="max-w-7xl mx-auto mb-8">
      <button
        @click="router.back()"
        class="group flex items-center space-x-2 text-gray-500 hover:text-yellow-500 transition-all"
      >
        <div
          class="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-yellow-500/50"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </div>
        <span class="text-[10px] font-black uppercase tracking-[0.3em] italic"
          >Back to Vault</span
        >
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-32">
      <div
        class="w-16 h-16 border-4 border-yellow-500/10 border-t-yellow-500 rounded-full animate-spin"
      ></div>
      <p
        class="mt-6 text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] animate-pulse"
      >
        Scanning Bio-Data...
      </p>
    </div>

    <div v-else-if="product" class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div class="lg:col-span-7 space-y-6">
          <div
            class="relative group rounded-[40px] overflow-hidden border border-white/10 bg-[#16191e] shadow-2xl"
          >
            <img
              :src="product.image_url"
              class="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-1000"
            />
            <div
              class="absolute top-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl"
            >
              <p
                class="text-[10px] font-black text-yellow-500 uppercase italic tracking-widest"
              >
                {{ product.category }}
              </p>
            </div>
            <div
              class="absolute top-6 right-6 flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-2xl animate-pulse"
            >
              <FireIcon class="w-4 h-4" />
              <p class="text-[10px] font-black uppercase italic">Hot Item</p>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 space-y-6">
          <div
            class="bg-[#16191e] border border-white/5 rounded-[40px] p-8 relative overflow-hidden shadow-2xl"
          >
            <div
              class="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[40px]"
            ></div>

            <div class="mb-8">
              <h1
                class="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-4"
              >
                {{ product.name }}
              </h1>
              <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-2 text-gray-500">
                  <ClockIcon class="w-4 h-4" />
                  <span
                    class="text-[14px] font-bold uppercase tracking-widest font-bold text-yellow-400"
                    >Sisa Waktu: {{ timeLeft }}</span
                  >
                </div>
              </div>
            </div>

            <div class="bg-black/40 border border-white/5 rounded-3xl p-6 mb-8">
              <p
                class="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-2"
              >
                Current Highest Bid
              </p>
              <h2
                class="text-4xl font-black text-yellow-500 italic tracking-tighter"
              >
                {{ formatPrice(product.current_bid) }}
              </h2>
            </div>

            <div class="space-y-4">
              <div class="relative group">
                <div
                  class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-yellow-500"
                >
                  <BanknotesIcon class="w-6 h-6" />
                </div>
                <input
                  v-model.number="bidAmount"
                  type="number"
                  class="w-full bg-black/60 border border-white/10 rounded-2xl py-5 pl-14 pr-4 text-white font-black text-xl focus:outline-none focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Masukkan angka bid..."
                />
              </div>

              <button
                @click="placeBid"
                :disabled="isSubmitting"
                class="w-full bg-yellow-500 hover:bg-white text-black py-5 rounded-2xl font-[900] text-sm uppercase italic tracking-[0.3em] shadow-[0_10px_30px_rgba(234,179,8,0.2)] active:scale-95 transition-all disabled:opacity-50"
              >
                {{ isSubmitting ? "Verifying..." : "PLACE YOUR BID" }}
              </button>
            </div>

            <div class="mt-8 grid grid-cols-2 gap-4">
              <div class="p-4 bg-white/5 rounded-2xl border border-white/5">
                <ShieldCheckIcon class="w-5 h-5 text-blue-500 mb-2" />
                <p
                  class="text-[9px] font-black text-gray-400 uppercase leading-tight"
                >
                  Verified Collector
                </p>
              </div>
              <div class="p-4 bg-white/5 rounded-2xl border border-white/5">
                <TrophyIcon class="w-5 h-5 text-yellow-500 mb-2" />
                <p
                  class="text-[9px] font-black text-gray-400 uppercase leading-tight"
                >
                  Authenticity Guaranteed
                </p>
              </div>
            </div>
          </div>

          <div class="bg-[#16191e] border border-white/5 rounded-[40px] p-8">
            <h3
              class="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-4 italic"
            >
              // Product Dossier
            </h3>
            <p class="text-gray-400 text-sm leading-relaxed font-medium">
              Item <strong>{{ product.name }}</strong> merupakan koleksi langka
              dalam kategori {{ product.category }}. Diproses dengan standar
              verifikasi tinggi. Pastikan Mas sudah membaca syarat lelang
              sebelum menaruh angka Bid. Kesempatan menang hanya datang sekali,
              amankan sekarang!
            </p>
          </div>
        </div>
      </div>

      <div class="bg-[#16191e] border border-white/5 rounded-[40px] p-8 mt-6">
        <div class="flex items-center justify-between mb-6">
          <h3
            class="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] italic"
          >
            // Recent Bidders
          </h3>
          <div class="flex items-center space-x-1">
            <div
              class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
            ></div>
            <span
              class="text-[8px] font-black text-gray-500 uppercase tracking-widest text-green-500"
              >Live</span
            >
          </div>
        </div>

        <div class="space-y-4">
          <div v-if="recentBids.length === 0" class="text-center py-4">
            <p
              class="text-[10px] text-gray-600 uppercase font-bold italic tracking-widest"
            >
              Belum ada penawar. Jadilah yang pertama!
            </p>
          </div>

          <div
            v-for="(bid, index) in recentBids"
            :key="bid.id"
            class="flex items-center justify-between p-4 rounded-2xl border transition-all"
            :class="
              index === 0
                ? 'bg-yellow-500/5 border-yellow-500/20'
                : 'bg-black/20 border-white/5'
            "
          >
            <div class="flex items-center space-x-3">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center font-black italic text-xs"
                :class="
                  index === 0
                    ? 'bg-yellow-500 text-black'
                    : 'bg-white/5 text-gray-500'
                "
              >
                #{{ index + 1 }}
              </div>
              <div>
                <p
                  class="text-[11px] font-black text-white uppercase italic tracking-tight"
                >
                  {{ bid.profiles?.username?.split("@")[0] || "Anonymous" }}
                </p>
                <p
                  class="text-[8px] text-gray-500 uppercase font-bold tracking-widest"
                >
                  Rep: {{ bid.profiles?.reputation_score || 0 }}
                </p>
              </div>
            </div>

            <div class="text-right">
              <p
                class="text-xs font-black italic"
                :class="index === 0 ? 'text-yellow-500' : 'text-gray-400'"
              >
                {{ formatPrice(bid.amount) }}
              </p>
              <p class="text-[7px] text-gray-600 font-bold uppercase">
                {{ new Date(bid.created_at).toLocaleTimeString() }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-32">
      <h2
        class="text-2xl font-black text-white italic uppercase tracking-tighter"
      >
        Bio-Data Corrupted
      </h2>
      <p class="text-gray-500 text-xs mt-2 uppercase tracking-widest">
        Produk tidak ditemukan dalam database.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Hilangkan arrow di input number */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
