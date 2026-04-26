<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify.js";
import {
  ClockIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TrophyIcon,
  FireIcon,
  BanknotesIcon,
  ArrowPathIcon,
  UserCircleIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const route = useRoute();
const router = useRouter();

const product = ref(null);
const recentBids = ref([]);
const loading = ref(true);
const bidAmount = ref(0);
const isSubmitting = ref(false);
const timeLeft = ref("");

// --- LOGIKA MULTI-IMAGE STACK & SLIDE JARI ---
const activeImgIndex = ref(0);
const touchStartX = ref(0);
const touchEndX = ref(0);

const allImages = computed(() => {
  if (!product.value) return [];
  const images = [];
  if (product.value.image_url) images.push(product.value.image_url);
  const extra = product.value.additional_images;
  if (extra) {
    if (Array.isArray(extra)) images.push(...extra);
    else if (typeof extra === "string") {
      try {
        const parsed = JSON.parse(extra);
        if (Array.isArray(parsed)) images.push(...parsed);
        else images.push(extra);
      } catch (e) {
        images.push(extra);
      }
    }
  }
  return images.filter((url) => url && url.trim() !== "");
});

const nextImage = () => {
  if (allImages.value.length <= 1) return;
  activeImgIndex.value = (activeImgIndex.value + 1) % allImages.value.length;
};

const prevImage = () => {
  if (allImages.value.length <= 1) return;
  activeImgIndex.value =
    (activeImgIndex.value - 1 + allImages.value.length) %
    allImages.value.length;
};

// Logika Swipe Jari
const handleTouchStart = (e) => {
  touchStartX.value = e.screenX || e.touches[0].clientX;
};
const handleTouchEnd = (e) => {
  touchEndX.value = e.screenX || e.changedTouches[0].clientX;
  handleSwipe();
};
const handleSwipe = () => {
  const swipeDistance = touchStartX.value - touchEndX.value;
  if (swipeDistance > 50) nextImage(); // Swipe Kiri ke Kanan
  if (swipeDistance < -50) prevImage(); // Swipe Kanan ke Kiri
};

// --- LOGIKA REPORT (FIXED) ---
const showReportModal = ref(false);
const isSubmittingReport = ref(false);
const reportForm = ref({
  category: "Palsu / Kw",
  details: "",
});

const reportCategories = [
  "Palsu / KW",
  "Penipuan Harga",
  "Foto Tidak Sesuai",
  "Kategori Salah",
  "Mengandung Unsur SARA/Pornografi",
  "Lainnya",
];

const submitReport = async () => {
  if (!props.userProfile) return notify.error("Auth Required", "Login dulu!");
  if (reportForm.value.details.length < 5)
    return notify.error("Data Kurang", "Berikan alasan minimal 5 karakter.");

  try {
    isSubmittingReport.value = true;

    // UPDATE: Menambahkan target_user_id agar muncul di Admin Dashboard
    const { error } = await supabase.from("reports").insert({
      product_id: product.value.id,
      reporter_id: props.userProfile.id,
      target_user_id: product.value.owner_id, // SINKRONISASI PEMILIK BARANG
      reason_category: reportForm.value.category,
      reason: reportForm.value.details,
      status: "pending",
    });

    if (error) throw error;

    notify.success("Laporan Masuk", "Admin akan segera meninjau aset ini.");
    showReportModal.value = false;
    reportForm.value.details = ""; // Reset form
  } catch (err) {
    notify.error("Gagal Mengirim", err.message);
  } finally {
    isSubmittingReport.value = false;
  }
};

let timerInterval = null;
let bidSubscription = null;

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price || 0);
};

const fetchBids = async () => {
  if (!route.params.id) return;
  const { data } = await supabase
    .from("bids")
    .select("*, profiles(username, full_name, reputation_score)")
    .eq("product_id", route.params.id)
    .order("amount", { ascending: false })
    .limit(8);

  if (data) {
    recentBids.value = data;
    if (data.length > 0 && product.value) {
      product.value.current_bid = data[0].amount;
      if (bidAmount.value <= data[0].amount) {
        bidAmount.value = Number(data[0].amount) + 10000;
      }
    }
  }
};

const fetchProductDetail = async () => {
  if (!route.params.id) return;
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "*, profiles!owner_id(username, full_name, avatar_url, reputation_score)",
      )
      .eq("id", route.params.id)
      .maybeSingle();
    if (error || !data) return router.push("/");
    product.value = data;
    const { data: topBidData } = await supabase
      .from("bids")
      .select("amount")
      .eq("product_id", route.params.id)
      .order("amount", { ascending: false })
      .limit(1)
      .maybeSingle();
    const highestPrice = topBidData
      ? topBidData.amount
      : data.current_bid || data.starting_bid || 0;
    product.value.current_bid = highestPrice;
    bidAmount.value = Number(highestPrice) + 10000;
    await fetchBids();
  } catch (err) {
    console.error("Fetch Error:", err);
  } finally {
    loading.value = false;
  }
};

const updateTimer = () => {
  if (!product.value?.end_time) return;
  const end = new Date(product.value.end_time).getTime();
  const now = new Date().getTime();
  const diff = end - now;
  if (diff <= 0) {
    timeLeft.value = "ENDED";
    return;
  }
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  timeLeft.value =
    d > 0
      ? `${d}D ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const placeBid = async () => {
  if (!props.userProfile)
    return notify.error("Auth Required", "Login dulu bosku!");
  if (isSubmitting.value || !product.value) return;
  const now = new Date().getTime();
  const end = new Date(product.value.end_time).getTime();
  if (now >= end || timeLeft.value === "ENDED")
    return notify.error("Lelang Berakhir", "Transmisi ditutup.");
  const latestTopPrice =
    product.value.current_bid || product.value.starting_bid || 0;
  if (bidAmount.value <= latestTopPrice) {
    notify.error("Bid Low", `Harga naik ke ${formatPrice(latestTopPrice)}`);
    bidAmount.value = Number(latestTopPrice) + 10000;
    return;
  }
  try {
    isSubmitting.value = true;
    const { error: bidErr } = await supabase.from("bids").insert({
      product_id: product.value.id,
      user_id: props.userProfile.id,
      amount: bidAmount.value,
    });
    if (bidErr) throw bidErr;
    await supabase
      .from("products")
      .update({ current_bid: bidAmount.value, winner_id: props.userProfile.id })
      .eq("id", product.value.id);
    product.value.current_bid = bidAmount.value;
    bidAmount.value = Number(bidAmount.value) + 10000;
    notify.success("Gacor!", "Penawaran berhasil dikirim.");
  } catch (err) {
    notify.error("Error", err.message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchProductDetail();
  timerInterval = setInterval(updateTimer, 1000);
  if (route.params.id) {
    bidSubscription = supabase
      .channel(`live-auction-${route.params.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `product_id=eq.${route.params.id}`,
        },
        (payload) => {
          fetchBids();
          if (
            product.value &&
            payload.new.amount > (product.value.current_bid || 0)
          ) {
            product.value.current_bid = payload.new.amount;
            if (bidAmount.value <= payload.new.amount)
              bidAmount.value = Number(payload.new.amount) + 10000;
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `id=eq.${route.params.id}`,
        },
        (payload) => {
          //Barikade Banned
          if (payload.new.status === "banned") {
            //1. Inform User
            alert(
              "Maaf, barang ini telah di-banned karena melanggar aturan TokBer",
            );
            //2. Redirect ke home
            router.push("/");
            return;
          }

          if (product.value) {
            product.value.status = payload.new.status;
            product.value.winner_id = payload.new.winner_id;
          }
        },
      )
      .subscribe();
  }
});

onUnmounted(() => {
  clearInterval(timerInterval);
  if (bidSubscription) supabase.removeChannel(bidSubscription);
});
</script>

<template>
  <div class="bg-black min-h-screen text-white pb-32">
    <div
      class="fixed top-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between"
    >
      <button
        @click="router.back()"
        class="p-2 hover:bg-white/10 rounded-xl transition-all"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div class="text-center">
        <p
          class="text-[8px] font-black uppercase text-yellow-500 tracking-[0.4em] italic mb-0.5"
        >
          Transmission
        </p>
        <h1 class="text-[10px] font-black uppercase tracking-widest italic">
          Live Auction Feed
        </h1>
      </div>
      <div class="w-10"></div>
    </div>

    <div v-if="!loading && product" class="pt-20 px-5 max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div class="lg:col-span-7 space-y-10">
          <div
            class="relative w-full aspect-square lg:aspect-video mt-4 overflow-visible"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
          >
            <div class="relative w-full h-full" @click="nextImage">
              <div
                v-for="(img, index) in allImages"
                :key="index"
                class="absolute inset-0 w-full h-full transition-all duration-500 ease-in-out cursor-pointer"
                :style="{
                  zIndex: index === activeImgIndex ? 40 : 30 - index,
                  opacity: index < activeImgIndex ? 0 : 1,
                  transform:
                    index > activeImgIndex
                      ? `translateX(${(index - activeImgIndex) * 15}px) scale(${1 - (index - activeImgIndex) * 0.05})`
                      : index < activeImgIndex
                        ? 'translateX(-100%)'
                        : 'translateX(0) scale(1)',
                }"
              >
                <div
                  class="w-full h-full rounded-[30px] lg:rounded-[40px] border border-white/10 overflow-hidden shadow-2xl bg-[#080808]"
                >
                  <img
                    :src="img"
                    class="w-full h-full object-cover lg:object-contain"
                    :class="{ 'opacity-30': index > activeImgIndex }"
                  />
                  <div
                    class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"
                  ></div>
                </div>
              </div>

              <div
                v-if="allImages.length > 1"
                class="absolute bottom-6 right-6 z-[50] bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black italic shadow-xl active:scale-90 transition-all"
              >
                {{ activeImgIndex + 1 }} / {{ allImages.length }}
              </div>

              <div
                class="absolute bottom-6 left-6 z-[50] bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3"
              >
                <ClockIcon class="w-4 h-4 text-yellow-500 animate-pulse" />
                <span
                  class="text-xs font-[1000] italic tracking-widest uppercase"
                  >{{ timeLeft }}</span
                >
              </div>
            </div>
          </div>

          <div class="hidden lg:block space-y-6">
            <div class="flex items-center gap-3">
              <FireIcon class="w-5 h-5 text-orange-500" />
              <h3 class="text-sm font-[1000] italic uppercase tracking-widest">
                Live Transmission Feed
              </h3>
            </div>
            <div class="space-y-3">
              <div
                v-for="(bid, index) in recentBids"
                :key="bid.id"
                class="flex items-center justify-between p-5 rounded-3xl border border-white/5 bg-white/[0.02] transition-all"
                :class="
                  index === 0
                    ? 'border-yellow-500/30 bg-yellow-500/5 shadow-[0_10px_40px_rgba(234,179,8,0.05)]'
                    : ''
                "
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-10 h-10 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center font-black text-xs text-yellow-500 italic"
                  >
                    {{ bid.profiles?.username?.[0].toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-xs font-black italic uppercase">
                      @{{ bid.profiles?.username }}
                    </p>
                    <p
                      class="text-[8px] text-gray-600 font-bold uppercase tracking-widest"
                    >
                      Rep: {{ bid.profiles?.reputation_score || 0 }} PTS
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p
                    class="text-md font-[1000] italic"
                    :class="index === 0 ? 'text-yellow-500' : 'text-white'"
                  >
                    {{ formatPrice(bid.amount) }}
                  </p>
                  <p
                    class="text-[8px] text-gray-700 font-bold uppercase italic"
                  >
                    {{ new Date(bid.created_at).toLocaleTimeString() }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 space-y-8">
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ShieldCheckIcon class="w-4 h-4 text-blue-500" /><span
                  class="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] italic"
                  >Authentic Asset</span
                >
              </div>
              <button
                @click="showReportModal = true"
                class="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 active:scale-95 transition-all"
              >
                <ExclamationTriangleIcon class="w-3.5 h-3.5 text-red-500" />
                <span
                  class="text-[8px] font-black text-red-500 uppercase italic"
                  >Report</span
                >
              </button>
            </div>

            <h2
              class="text-4xl lg:text-6xl font-[1000] italic uppercase tracking-tighter leading-[0.85]"
            >
              {{ product.name }}
            </h2>

            <div
              @click="router.push(`/user/${product.profiles?.username}`)"
              class="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-3xl cursor-pointer hover:border-yellow-500/30 transition-all w-fit group"
            >
              <div
                class="w-10 h-10 rounded-full overflow-hidden border border-white/10"
              >
                <img
                  v-if="product.profiles?.avatar_url"
                  :src="product.profiles.avatar_url"
                  class="w-full h-full object-cover"
                /><UserCircleIcon v-else class="w-full h-full text-gray-700" />
              </div>
              <div>
                <p
                  class="text-[7px] font-black text-gray-600 uppercase tracking-[0.2em] mb-0.5 leading-none"
                >
                  Contractor
                </p>
                <p
                  class="text-xs font-black italic group-hover:text-yellow-500 transition-colors uppercase"
                >
                  {{
                    product.profiles?.full_name || product.profiles?.username
                  }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 shadow-2xl shadow-yellow-500/5 relative overflow-hidden"
          >
            <p
              class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3"
            >
              Top Current Bid
            </p>
            <h3
              class="text-3xl lg:text-6xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            >
              {{ formatPrice(product.current_bid || product.starting_bid) }}
            </h3>
            <div class="space-y-4">
              <div class="relative group">
                <span
                  class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs italic tracking-tighter"
                  >IDR</span
                ><input
                  v-model.number="bidAmount"
                  type="number"
                  class="w-full bg-black border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-2xl font-[1000] italic focus:border-yellow-500 transition-all text-white outline-none"
                />
              </div>
              <button
                @click="placeBid"
                :disabled="isSubmitting || timeLeft === 'ENDED'"
                class="w-full bg-yellow-500 text-black py-6 rounded-2xl font-[1000] italic uppercase tracking-widest active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <ArrowPathIcon
                  v-if="isSubmitting"
                  class="w-6 h-6 animate-spin"
                /><BanknotesIcon
                  v-else
                  class="w-6 h-6 stroke-[2.5px]"
                /><span>{{
                  timeLeft === "ENDED" ? "ENDED" : "Place Your Bid"
                }}</span>
              </button>
            </div>
          </div>

          <div class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6">
            <div class="flex items-center justify-between mb-4">
              <p
                class="text-[10px] font-black text-yellow-500 uppercase italic tracking-widest"
              >
                Asset Dossier
              </p>
              <div
                class="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5"
              >
                <TagIcon class="w-3 h-3 text-gray-500" /><span
                  class="text-[8px] font-black text-gray-400 uppercase italic"
                  >{{ product.category }}</span
                >
              </div>
            </div>
            <p
              class="text-gray-400 text-sm italic leading-relaxed text-justify"
            >
              {{ product.description }}
            </p>
          </div>

          <div class="lg:hidden space-y-4 pt-6">
            <div class="flex items-center gap-2 mb-4">
              <FireIcon class="w-4 h-4 text-orange-500" />
              <h3
                class="text-[10px] font-[1000] italic uppercase tracking-[0.2em]"
              >
                Live Bids
              </h3>
            </div>
            <div class="space-y-3">
              <div
                v-for="(bid, index) in recentBids.slice(0, 5)"
                :key="bid.id"
                class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01]"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-gray-900 border border-white/10 flex items-center justify-center font-black text-[10px] text-yellow-500 italic"
                  >
                    {{ bid.profiles?.username?.[0].toUpperCase() }}
                  </div>
                  <p class="text-xs font-black italic uppercase">
                    @{{ bid.profiles?.username }}
                  </p>
                </div>
                <p class="text-sm font-black italic text-yellow-500 uppercase">
                  {{ formatPrice(bid.amount) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="fixed inset-0 bg-black flex flex-col items-center justify-center"
    >
      <div
        class="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"
      ></div>
      <p
        class="text-[8px] font-black uppercase text-yellow-500 mt-6 tracking-[0.5em] italic animate-pulse"
      >
        Scanning Frequency...
      </p>
    </div>
    <div
      v-if="showReportModal"
      class="fixed inset-0 z-[200] flex items-center justify-center px-6"
    >
      <div
        class="absolute inset-0 bg-black/90 backdrop-blur-md"
        @click="showReportModal = false"
      ></div>

      <div
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-8 lg:p-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
      >
        <div
          class="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl"
        ></div>

        <div class="text-center mb-8">
          <div
            class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20"
          >
            <ExclamationTriangleIcon class="w-8 h-8 text-red-500" />
          </div>
          <h3
            class="text-xl font-[1000] italic uppercase tracking-tighter text-white"
          >
            Report Asset
          </h3>
          <p
            class="text-[9px] font-black text-gray-500 tracking-[0.3em] uppercase mt-1"
          >
            Maintenance Security System
          </p>
        </div>

        <div class="space-y-6">
          <div>
            <label
              class="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-3 italic"
              >Reason Category</label
            >
            <select
              v-model="reportForm.category"
              class="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
            >
              <option
                v-for="cat in reportCategories"
                :key="cat"
                :value="cat"
                class="bg-gray-900"
              >
                {{ cat }}
              </option>
            </select>
          </div>

          <div>
            <label
              class="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-3 italic"
              >Additional Details</label
            >
            <textarea
              v-model="reportForm.details"
              rows="4"
              placeholder="Jelaskan alasan pelaporan secara rinci..."
              class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs font-bold text-white outline-none focus:border-red-500 resize-none normal-case italic"
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button
              @click="showReportModal = false"
              class="flex-1 bg-white/5 text-gray-500 py-5 rounded-[24px] font-[1000] italic uppercase text-[10px] active:scale-95 transition-all"
            >
              Cancel
            </button>

            <button
              @click="submitReport"
              :disabled="isSubmittingReport"
              class="flex-[2] bg-red-600 text-white py-5 rounded-[24px] font-[1000] italic uppercase tracking-[0.1em] text-[10px] active:scale-95 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              {{ isSubmittingReport ? "TRANSMITTING..." : "CONFIRM REPORT" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>
