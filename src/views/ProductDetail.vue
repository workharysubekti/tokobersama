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
  UserIcon,
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
// FIX: Inisialisasi Tab Ranking agar langsung aktif tanpa dipencet
const activeBidTab = ref("ranking");

// --- STATE BARU REFORMASI ---
const isIntense = ref(false); // Mode 2 menit terakhir
const hasNotifiedIntense = ref(false);
const showBannedModal = ref(false);

// -- STATE TRANSAKSI ---
const transaction = ref(null);
const showPaymentModal = ref(false);
const showProofModal = ref(false);
const adminFee = 5000;
const isSubmittingAction = ref(false);

// 1. Cek Apakah User adalah Pemenang
const isWinner = computed(() => {
  return (
    timeLeft.value === "ENDED" &&
    recentBids.value.length > 0 &&
    props.userProfile?.id === recentBids.value[0].user_id
  );
});

// 2. Cek Apakah User adalah Penjual
const isSeller = computed(() => {
  return props.userProfile?.id === product.value?.owner_id;
});

// 3. Hitung Total yang Harus Dibayar Buyer
const totalToPay = computed(() => {
  const winningBid = recentBids.value[0]?.amount || 0;
  return winningBid + adminFee;
});

// 4. Fungsi Ambil Data Transaksi (Panggil di onMounted)
const fetchTransaction = async () => {
  if (timeLeft.value !== "ENDED") return;
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("product_id", route.params.id)
    .maybeSingle();

  if (data) {
    transaction.value = data;
  } else if (isWinner.value) {
    // Jika lelang selesai, winner login, tapi record transaksi belum ada, BUAT OTOMATIS
    const { data: newTx } = await supabase
      .from("transactions")
      .insert({
        product_id: product.value.id,
        buyer_id: props.userProfile.id,
        seller_id: product.value.owner_id,
        amount_bid: recentBids.value[0].amount,
        total_amount: totalToPay.value,
      })
      .select()
      .single();
    transaction.value = newTx;
  }
};

// 5. Fungsi Konfirmasi Pembayaran (Winner)
const confirmPayment = async (method) => {
  isSubmittingAction.value = true;
  const { error } = await supabase
    .from("transactions")
    .update({
      status: "escrow_holding",
      payment_method: method,
    })
    .eq("id", transaction.value.id);

  if (!error) {
    transaction.value.status = "escrow_holding";
    notify.success("Pembayaran Berhasil", "Dana ditahan di Escrow TokBer.");
    showPaymentModal.value = false;
  }
  isSubmittingAction.value = false;
};

// --- REFORMASI LOGIKA RANKING (UNIQUE BIDDERS) ---
const rankedBids = computed(() => {
  if (!recentBids.value || recentBids.value.length === 0) return [];
  const seenUsers = new Set();
  const uniqueBidders = [];

  for (const bid of recentBids.value) {
    if (!seenUsers.has(bid.user_id)) {
      seenUsers.add(bid.user_id);
      uniqueBidders.push(bid);
    }
  }
  return uniqueBidders.slice(0, 8);
});

// --- LOGIKA RANK & LIMIT (REFORMASI) ---
const userRank = computed(() => {
  if (props.userProfile?.is_admin === true) {
    return {
      name: "OWNER",
      limit: Infinity,
      color:
        "text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)] font-black",
    };
  }
  const rep = props.userProfile?.reputation || 0;
  if (rep >= 600)
    return { name: "LEGEND", limit: Infinity, color: "text-purple-500" };
  if (rep >= 400)
    return { name: "EXPERT", limit: 100000000, color: "text-red-500" };
  if (rep >= 200)
    return { name: "INTERMEDIATE", limit: 20000000, color: "text-blue-500" };
  return { name: "NEWBIE", limit: 5000000, color: "text-green-500" };
});

// --- LOGIKA MULTI-IMAGE STACK (SUCI) ---
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

const handleTouchStart = (e) => {
  touchStartX.value = e.screenX || e.touches[0].clientX;
};
const handleTouchEnd = (e) => {
  touchEndX.value = e.screenX || e.changedTouches[0].clientX;
  handleSwipe();
};
const handleSwipe = () => {
  const swipeDistance = touchStartX.value - touchEndX.value;
  if (swipeDistance > 50) nextImage();
  if (swipeDistance < -50) prevImage();
};

// --- LOGIKA REPORT (SUCI) ---
const showReportModal = ref(false);
const isSubmittingReport = ref(false);
const reportForm = ref({ category: "Palsu / Kw", details: "" });
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
    const { error } = await supabase.from("reports").insert({
      product_id: product.value.id,
      reporter_id: props.userProfile.id,
      target_user_id: product.value.owner_id,
      reason_category: reportForm.value.category,
      reason: reportForm.value.details,
      status: "pending",
    });
    if (error) throw error;
    notify.success("Laporan Masuk", "Admin akan segera meninjau aset ini.");
    showReportModal.value = false;
    reportForm.value.details = "";
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
    .select("*, profiles(username, full_name, avatar_url, reputation)")
    .eq("product_id", route.params.id)
    .order("amount", { ascending: false })
    .limit(50); // Ambil 10 bid terakhir

  if (data) {
    recentBids.value = data;
    if (data.length > 0 && product.value) {
      product.value.current_bid = data[0].amount;
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
        "*, profiles!owner_id(username, full_name, avatar_url, reputation)",
      )
      .eq("id", route.params.id)
      .maybeSingle();
    if (error || !data) return router.push("/");
    product.value = data;
    await fetchBids();
    if (recentBids.value.length > 0) {
      bidAmount.value = Number(recentBids.value[0].amount) + 10000;
    } else {
      bidAmount.value = Number(data.starting_bid) + 10000;
    }
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

  if (diff > 0 && diff <= 121000) {
    isIntense.value = true;
    if (!hasNotifiedIntense.value) {
      notify.error("WAR ZONE!", "Lelang sisa 2 menit lagi! Gaskeun!");
      hasNotifiedIntense.value = true;
    }
  } else {
    if (diff > 121000) {
      isIntense.value = false;
      hasNotifiedIntense.value = false;
    }
  }

  if (diff <= 0) {
    timeLeft.value = "ENDED";
    isIntense.value = false;
    return;
  }
  // Hitung angka (HH:MM:SS)
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  // Update variabel timeLeft yang di-render di HTML
  timeLeft.value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const placeBid = async () => {
  // 1. AUTH GUARD
  if (!props.userProfile) {
    return notify.error("Auth Required", "Login dulu bosku!");
  }

  // 2. SELF-BID GUARD (REFORMASI)
  // Mencegah user ngebid di atas namanya sendiri agar lelang tetap kompetitif
  // Perkecualian: System Owner (Admin) bebas ngebid kapan saja untuk testing
  if (props.userProfile?.is_admin !== true) {
    const isCurrentWinner =
      recentBids.value.length > 0 &&
      recentBids.value[0].user_id === props.userProfile.id;
    if (isCurrentWinner) {
      return notify.error(
        "Top Position",
        "Tawaranmu masih yang tertinggi. Tunggu rival lain!",
      );
    }
  }

  // 3. REPUTASI & RANK GUARD (SUCI)
  const rep = props.userProfile?.reputation || 0;
  if (rep < 50 && props.userProfile?.is_admin !== true) {
    return notify.error("Reputasi Rendah", "Minimal 50 poin buat ngebid, Mas.");
  }

  if (bidAmount.value > userRank.value.limit) {
    return notify.error(
      "Limit Rank",
      `Rank ${userRank.value.name} maksimal bid ${formatPrice(userRank.value.limit)}`,
    );
  }

  // 4. TIME & STATUS GUARD
  if (isSubmitting.value || !product.value) return;
  const now = new Date().getTime();
  let end = new Date(product.value.end_time).getTime();

  if (now >= end || timeLeft.value === "ENDED") {
    return notify.error("Lelang Berakhir", "Transmisi ditutup.");
  }

  // 5. PRICE VALIDATION
  const latestTopPrice =
    recentBids.value[0]?.amount || product.value.starting_bid || 0;
  if (bidAmount.value <= latestTopPrice) {
    notify.error(
      "Bid Low",
      `Harga sudah naik ke ${formatPrice(latestTopPrice)}`,
    );
    bidAmount.value = Number(latestTopPrice) + 10000;
    return;
  }

  try {
    isSubmitting.value = true;

    // 6. ANTI-SNIPER LOGIC (REFORMASI 60 DETIK)
    const diff = end - now;
    let newEndTime = product.value.end_time;
    if (diff <= 60000) {
      const extension = 2 * 60 * 1000; // Tambah 2 menit
      newEndTime = new Date(end + extension).toISOString();
      notify.success("ANTI-SNIPER!", "Waktu lelang diperpanjang 2 menit!");
    }

    // 7. DATABASE TRANSMISSION
    // Kirim data bid baru
    const { error: bidErr } = await supabase.from("bids").insert({
      product_id: product.value.id,
      user_id: props.userProfile.id,
      amount: bidAmount.value,
    });
    if (bidErr) throw bidErr;

    // Update status produk (Winner & Harga Terbaru)
    await supabase
      .from("products")
      .update({
        current_bid: bidAmount.value,
        winner_id: props.userProfile.id,
        end_time: newEndTime,
      })
      .eq("id", product.value.id);

    // 8. LOCAL STATE SYNC
    product.value.current_bid = bidAmount.value;
    product.value.end_time = newEndTime;
    bidAmount.value = Number(bidAmount.value) + 10000;

    notify.success("GACOR!", "Tawaran transmisi berhasil dikirim.");
  } catch (err) {
    notify.error("System Error", err.message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchProductDetail();
  timerInterval = setInterval(() => {
    updateTimer();
    if (timeLfet.value === "ENDED" && !transaction.value) fetchTransaction();
  }, 1000);

  const checkBannedElement = setInterval(() => {
    if (showBannedModal.value) {
      const modal = document.getElementById("banned-guard-overlay");
      if (!modal || modal.offsetParent === null) {
        window.location.href = "/";
      }
    }
  }, 1000);

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
          if (payload.new.status === "banned") {
            showBannedModal.value = true;
            return;
          }
          if (product.value) {
            product.value.status = payload.new.status;
            product.value.winner_id = payload.new.winner_id;
            product.value.current_bid = payload.new.current_bid;
            product.value.end_time = payload.new.end_time;
            const oldTime = new Date(payload.old.end_time).getTime();
            const newTime = new Date(payload.new.end_time).getTime();

            if (newTime > oldTime) {
              notify.success(
                "TIME EXTENDED!",
                "Seseorang ngebid di menit terakhir, waktu ditambah!",
              );
              // Reset notif intense supaya yang nonton juga dapet alert merah lagi nanti
              hasNotifiedIntense.value = false;
            }
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
  <div v-if="product" class="bg-black min-h-screen text-white pb-32">
    <div
      v-if="showBannedModal"
      id="banned-guard-overlay"
      class="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center p-8 text-center"
    >
      <div
        class="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/40"
      >
        <ExclamationTriangleIcon class="w-12 h-12 text-red-500" />
      </div>
      <h1 class="text-4xl font-[1000] italic uppercase text-white mb-4">
        ASSET TERMINATED
      </h1>
      <p class="text-gray-400 italic text-sm mb-10 max-w-md">
        Barang ini telah di-banned oleh sistem keamanan TokBer karena melanggar
        aturan komunitas atau laporan penipuan.
      </p>
      <button
        @click="router.push('/')"
        class="bg-white text-black px-10 py-4 rounded-2xl font-black italic uppercase text-xs active:scale-90 transition-all"
      >
        Back to Home
      </button>
    </div>

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

    <div v-if="!loading" class="pt-20 px-5 max-w-7xl mx-auto">
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
                class="absolute bottom-6 right-6 z-[50] bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black italic shadow-xl"
              >
                {{ activeImgIndex + 1 }} / {{ allImages.length }}
              </div>

              <div
                class="absolute bottom-6 left-6 z-[50] backdrop-blur-md px-5 py-2.5 rounded-2xl border flex items-center gap-3 transition-all duration-500"
                :class="
                  isIntense
                    ? 'bg-red-600 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110'
                    : 'bg-black/60 border-white/10'
                "
              >
                <ClockIcon
                  class="w-5 h-5"
                  :class="
                    isIntense
                      ? 'text-white animate-spin'
                      : 'text-yellow-500 animate-pulse'
                  "
                />
                <span
                  class="text-xs font-[1000] italic tracking-[0.2em] uppercase text-white"
                  >{{ timeLeft }}</span
                >
              </div>
            </div>
          </div>

          <div class="hidden lg:block space-y-6">
            <div class="px-2">
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="w-2 h-2 bg-yellow-500 rounded-full animate-ping"
                ></div>
                <h2
                  class="text-sm font-[1000] italic uppercase tracking-[0.3em] text-white"
                >
                  Live <span class="text-yellow-500">Rank</span> Transmission
                </h2>
              </div>
              <div
                class="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl w-full max-w-xs mb-6"
              >
                <button
                  @click="activeBidTab = 'ranking'"
                  :class="
                    activeBidTab === 'ranking'
                      ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                      : 'text-gray-500 hover:text-white'
                  "
                  class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all duration-300 cursor-pointer"
                >
                  <TrophyIcon class="w-3.5 h-3.5" /> Ranking
                </button>
                <button
                  @click="activeBidTab = 'history'"
                  :class="
                    activeBidTab === 'history'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-gray-500 hover:text-white'
                  "
                  class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all duration-300 cursor-pointer"
                >
                  <ArrowPathIcon class="w-3.5 h-3.5" /> History
                </button>
              </div>
            </div>

            <div class="min-h-[300px]">
              <div v-if="activeBidTab === 'ranking'" class="space-y-4">
                <div
                  v-for="(bid, index) in rankedBids"
                  :key="'rank-' + bid.id"
                  class="flex items-center justify-between p-5 rounded-[28px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
                  :class="
                    index === 0
                      ? 'border-yellow-500/30 bg-yellow-500/5 ring-1 ring-yellow-500/20 shadow-[0_10px_40px_rgba(234,179,8,0.1)]'
                      : ''
                  "
                >
                  <div class="flex items-center gap-5">
                    <div
                      class="w-8 text-center font-[1000] italic text-xl"
                      :class="index < 3 ? 'text-yellow-500' : 'text-gray-700'"
                    >
                      #{{ index + 1 }}
                    </div>
                    <div
                      @click="router.push(`/user/${bid.profiles?.username}`)"
                      class="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 cursor-pointer active:scale-90 transition-transform"
                    >
                      <img
                        v-if="bid.profiles?.avatar_url"
                        :src="bid.profiles.avatar_url"
                        class="w-full h-full object-cover"
                      />
                      <div
                        v-else
                        class="w-full h-full bg-gray-800 flex items-center justify-center"
                      >
                        <UserIcon class="w-6 h-6 text-gray-500" />
                      </div>
                    </div>
                    <div
                      @click="router.push(`/user/${bid.profiles?.username}`)"
                      class="cursor-pointer"
                    >
                      <p
                        class="text-sm font-black italic uppercase group-hover:text-yellow-500 transition-colors"
                      >
                        @{{ bid.profiles?.username }}
                      </p>
                      <p
                        class="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-0.5"
                      >
                        {{ bid.profiles?.reputation || 0 }} REP PTS
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p
                      class="text-xl font-[1000] italic"
                      :class="index === 0 ? 'text-yellow-500' : 'text-white'"
                    >
                      {{ formatPrice(bid.amount) }}
                    </p>
                    <p
                      class="text-[8px] text-gray-700 font-bold uppercase italic"
                    >
                      Highest Bid
                    </p>
                  </div>
                </div>
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="bid in recentBids"
                  :key="'hist-' + bid.id"
                  class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-black/40 hover:bg-white/[0.03] transition-all"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="w-2 h-2 rounded-full bg-yellow-500/40 animate-pulse"
                    ></div>
                    <div>
                      <p
                        class="text-[10px] font-black italic uppercase text-white"
                      >
                        @{{ bid.profiles?.username }}
                        <span class="text-gray-600 font-normal"
                          >Transmitted a bid</span
                        >
                      </p>
                      <p
                        class="text-[8px] text-gray-700 font-bold uppercase mt-0.5 tracking-tighter"
                      >
                        {{ new Date(bid.created_at).toLocaleTimeString() }}
                      </p>
                    </div>
                  </div>
                  <div
                    class="text-right font-black italic text-gray-400 text-sm"
                  >
                    {{ formatPrice(bid.amount) }}
                  </div>
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
                <ExclamationTriangleIcon
                  class="w-3.5 h-3.5 text-red-500"
                /><span
                  class="text-[8px] font-black text-red-500 uppercase italic"
                  >Report</span
                >
              </button>
            </div>
            <h2
              class="text-4xl lg:text-7xl font-[1000] italic uppercase tracking-tighter leading-[0.8]"
            >
              {{ product.name }}
            </h2>
            <div
              @click="router.push(`/user/${product.profiles?.username}`)"
              class="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-[30px] cursor-pointer hover:border-yellow-500/30 transition-all w-fit group"
            >
              <div
                class="w-12 h-12 rounded-2xl overflow-hidden border border-white/10"
              >
                <img
                  v-if="product.profiles?.avatar_url"
                  :src="product.profiles.avatar_url"
                  class="w-full h-full object-cover"
                />
                <UserCircleIcon v-else class="w-full h-full text-gray-700" />
              </div>
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <p
                    class="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] italic"
                  >
                    Contractor
                  </p>
                  <span
                    class="text-[7px] font-black px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 italic"
                    >REP: {{ product.profiles?.reputation }}</span
                  >
                </div>
                <p
                  class="text-sm font-black italic group-hover:text-yellow-500 transition-colors uppercase leading-none"
                >
                  @{{ product.profiles?.username }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-[#0a0a0a] border border-white/10 rounded-[45px] p-8 shadow-2xl relative overflow-hidden"
          >
            <div class="flex items-center justify-between mb-4">
              <p
                class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic"
              >
                Transmission Bid Price
              </p>
              <div class="flex items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full bg-red-600 animate-pulse"
                ></div>
                <span
                  class="text-[8px] font-black text-red-500 uppercase tracking-widest italic"
                  >Live Mode</span
                >
              </div>
            </div>
            <h3
              class="text-4xl lg:text-7xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]"
            >
              {{ formatPrice(product.current_bid || product.starting_bid) }}
            </h3>
            <div class="space-y-6">
              <div
                v-if="props.userProfile"
                class="flex items-center justify-between px-2"
              >
                <p class="text-[9px] font-black text-gray-600 uppercase italic">
                  Your Rank Status:
                </p>
                <span
                  class="text-[9px] font-[1000] uppercase italic"
                  :class="userRank.color"
                  >{{ userRank.name }} (Limit:
                  {{ formatPrice(userRank.limit) }})</span
                >
              </div>
              <transition
                enter-active-class="animate-bounce"
                v-if="timeLeft === 'ENDED' && recentBids.length > 0"
              >
                <div
                  class="mt-4 p-4 bg-yellow-500 rounded-2xl flex items-center justify-between shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                >
                  <div class="flex items-center gap-3">
                    <TrophyIcon class="w-6 h-6 text-black" />
                    <div>
                      <p
                        class="text-[8px] font-black text-black/60 uppercase leading-none"
                      >
                        Final Winner
                      </p>
                      <p
                        class="text-xs font-[1000] text-black uppercase italic"
                      >
                        @{{ recentBids[0].profiles?.username }}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p
                      class="text-[8px] font-black text-black/60 uppercase leading-none"
                    >
                      Hammer Price
                    </p>
                    <p class="text-sm font-[1000] text-black italic">
                      {{ formatPrice(recentBids[0].amount) }}
                    </p>
                  </div>
                </div>
              </transition>
              <div class="relative group">
                <span
                  class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-sm italic tracking-tighter"
                  >IDR</span
                >
                <div class="flex gap-3 mb-4 overflow-x-auto no-scrollbar pb-2">
                  <button
                    v-for="plus in [10000, 50000, 100000, 500000]"
                    :key="plus"
                    @click="
                      bidAmount =
                        (product.current_bid || product.starting_bid) + plus
                    "
                    class="flex-shrink-0 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black italic text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all active:scale-90"
                  >
                    +{{ plus / 1000 }}K
                  </button>
                </div>
                <input
                  v-model.number="bidAmount"
                  type="number"
                  class="w-full bg-black border-2 border-white/10 rounded-3xl py-7 pl-20 pr-6 text-3xl font-[1000] italic focus:border-yellow-500 transition-all text-white outline-none"
                />
              </div>
              <div
                v-if="timeLeft === 'ENDED' && (isWinner || isSeller)"
                class="mt-10 space-y-6"
              >
                <div
                  class="bg-[#0a0a0a] border-2 border-yellow-500/20 rounded-[45px] p-8 lg:p-10 shadow-2xl relative overflow-hidden"
                >
                  <div class="flex items-center justify-between mb-8">
                    <div>
                      <p
                        class="text-[9px] font-black text-yellow-500 uppercase italic tracking-[0.4em] mb-1"
                      >
                        Escrow Protocol
                      </p>
                      <h2
                        class="text-2xl font-[1000] italic uppercase text-white"
                      >
                        {{ isWinner ? "Secure Payment" : "Order Tracking" }}
                      </h2>
                    </div>
                    <div
                      class="px-5 py-2 bg-yellow-500 text-black rounded-2xl font-black italic text-[10px] uppercase"
                    >
                      Status: {{ transaction?.status.replace("_", " ") }}
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div
                      class="p-6 bg-white/5 rounded-3xl border border-white/5"
                    >
                      <p
                        class="text-[8px] font-black text-gray-500 uppercase mb-2 italic"
                      >
                        Aset Price
                      </p>
                      <p class="text-xl font-[1000] italic text-white">
                        {{ formatPrice(recentBids[0].amount) }}
                      </p>
                    </div>
                    <div
                      class="p-6 bg-white/5 rounded-3xl border border-white/5"
                    >
                      <p
                        class="text-[8px] font-black text-yellow-500 uppercase mb-2 italic"
                      >
                        Admin Fee (Escrow)
                      </p>
                      <p class="text-xl font-[1000] italic text-yellow-500">
                        {{ formatPrice(adminFee) }}
                      </p>
                    </div>
                  </div>

                  <div
                    v-if="isWinner && transaction?.status === 'pending_payment'"
                    class="space-y-4"
                  >
                    <div
                      class="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl mb-6"
                    >
                      <p
                        class="text-[10px] font-bold text-yellow-500 italic leading-relaxed"
                      >
                        Silakan transfer sebesar
                        <span class="font-black underline">{{
                          formatPrice(totalToPay)
                        }}</span>
                        ke Rekening Escrow TokBer untuk mengamankan aset ini.
                      </p>
                    </div>
                    <button
                      @click="showPaymentModal = true"
                      class="w-full bg-yellow-500 text-black py-6 rounded-[25px] font-black italic uppercase tracking-widest hover:scale-[1.02] transition-all"
                    >
                      Pilih Metode Pembayaran
                    </button>
                  </div>

                  <div
                    v-if="transaction?.status === 'escrow_holding'"
                    class="text-center py-6"
                  >
                    <div
                      class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/40"
                    >
                      <ShieldCheckIcon class="w-8 h-8 text-blue-500" />
                    </div>
                    <h4 class="text-white font-black italic uppercase">
                      Dana Diamankan TokBer
                    </h4>
                    <p class="text-[10px] text-gray-500 uppercase italic mt-2">
                      {{
                        isSeller
                          ? "Segera kirim barang dan input resi."
                          : "Menunggu penjual mengirimkan barang."
                      }}
                    </p>
                    <div v-if="isSeller" class="mt-6 flex gap-3">
                      <input
                        type="text"
                        placeholder="Masukkan Nomor Resi"
                        class="flex-1 bg-black border border-white/10 rounded-2xl px-5 text-xs italic font-bold outline-none focus:border-blue-500"
                      />
                      <button
                        class="bg-blue-600 px-6 py-4 rounded-2xl font-black italic text-[10px] uppercase"
                      >
                        Update
                      </button>
                    </div>
                  </div>

                  <button
                    @click="router.push(`/chat/${product.id}`)"
                    class="w-full mt-6 bg-white/5 border border-white/10 text-white py-5 rounded-[25px] font-black italic uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                  >
                    <ChatBubbleLeftRightIcon class="w-5 h-5" />
                    Live Discussion (Seller & Winner)
                  </button>
                </div>
              </div>

              <div
                v-if="showPaymentModal"
                class="fixed inset-0 z-[400] flex items-center justify-center px-6"
              >
                <div
                  class="absolute inset-0 bg-black/95 backdrop-blur-xl"
                  @click="showPaymentModal = false"
                ></div>
                <div
                  class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[45px] p-10"
                >
                  <h3
                    class="text-xl font-[1000] italic uppercase text-white mb-8 text-center"
                  >
                    Payment <span class="text-yellow-500">Escrow</span>
                  </h3>

                  <div class="space-y-4">
                    <button
                      @click="confirmPayment('QRIS')"
                      class="w-full flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-yellow-500/50 transition-all"
                    >
                      <span
                        class="text-xs font-black italic text-white uppercase"
                        >QRIS / ALL E-WALLET</span
                      >
                      <QrCodeIcon class="w-6 h-6 text-yellow-500" />
                    </button>
                    <button
                      @click="confirmPayment('BANK_TRANSFER')"
                      class="w-full flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-blue-500/50 transition-all"
                    >
                      <span
                        class="text-xs font-black italic text-white uppercase"
                        >MANUAL BANK TRANSFER</span
                      >
                      <BanknotesIcon class="w-6 h-6 text-blue-500" />
                    </button>
                  </div>

                  <p
                    class="text-[8px] text-gray-600 font-bold uppercase italic text-center mt-10"
                  >
                    Dengan membayar, dana Anda akan ditahan oleh TokBer sampai
                    barang diterima.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white/[0.02] border border-white/5 rounded-[32px] p-7">
            <div class="flex items-center justify-between mb-5">
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

          <div class="lg:hidden space-y-6 pt-10 border-t border-white/5 mt-10">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"
              ></div>
              <h3
                class="text-[10px] font-[1000] italic uppercase tracking-[0.2em] text-white"
              >
                Live <span class="text-yellow-500">Transmission</span> Feed
              </h3>
            </div>
            <div
              class="flex p-1 bg-white/5 border border-white/10 rounded-xl w-full mb-6"
            >
              <button
                @click="activeBidTab = 'ranking'"
                :class="
                  activeBidTab === 'ranking'
                    ? 'bg-yellow-500 text-black shadow-lg'
                    : 'text-gray-500'
                "
                class="flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase italic transition-all"
              >
                Ranking
              </button>
              <button
                @click="activeBidTab = 'history'"
                :class="
                  activeBidTab === 'history'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-500'
                "
                class="flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase italic transition-all"
              >
                History
              </button>
            </div>
            <div class="min-h-[200px]">
              <div v-if="activeBidTab === 'ranking'" class="space-y-3">
                <div
                  v-for="(bid, index) in rankedBids.slice(0, 5)"
                  :key="'mb-rank-' + bid.id"
                  class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]"
                  :class="
                    index === 0 ? 'border-yellow-500/20 bg-yellow-500/5' : ''
                  "
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="font-[1000] italic text-sm w-4"
                      :class="index < 3 ? 'text-yellow-500' : 'text-gray-700'"
                      >#{{ index + 1 }}</span
                    >
                    <div
                      @click="router.push(`/user/${bid.profiles?.username}`)"
                      class="w-10 h-10 rounded-xl overflow-hidden border border-white/10"
                    >
                      <img
                        v-if="bid.profiles?.avatar_url"
                        :src="bid.profiles.avatar_url"
                        class="w-full h-full object-cover"
                      />
                      <div
                        v-else
                        class="w-full h-full bg-gray-800 flex items-center justify-center"
                      >
                        <UserIcon class="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    <p
                      @click="router.push(`/user/${bid.profiles?.username}`)"
                      class="text-xs font-black italic uppercase"
                    >
                      @{{ bid.profiles?.username }}
                    </p>
                  </div>
                  <p
                    class="text-sm font-[1000] italic"
                    :class="index === 0 ? 'text-yellow-500' : 'text-white'"
                  >
                    {{ formatPrice(bid.amount) }}
                  </p>
                </div>
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="bid in recentBids.slice(0, 8)"
                  :key="'mb-hist-' + bid.id"
                  class="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/40"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-1.5 h-1.5 rounded-full bg-yellow-500/30 animate-pulse"
                    ></div>
                    <p
                      class="text-[9px] font-black italic uppercase text-gray-300"
                    >
                      @{{ bid.profiles?.username }}
                    </p>
                  </div>
                  <p class="text-[10px] font-black italic text-gray-500">
                    {{ formatPrice(bid.amount) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-8 lg:p-10 shadow-2xl overflow-hidden"
      >
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
        </div>
        <div class="space-y-6">
          <div>
            <label
              class="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-3 italic"
              >Reason Category</label
            ><select
              v-model="reportForm.category"
              class="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-500 appearance-none cursor-pointer"
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
            ><textarea
              v-model="reportForm.details"
              rows="4"
              placeholder="Alasan pelaporan..."
              class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs font-bold text-white outline-none focus:border-red-500 resize-none normal-case italic"
            ></textarea>
          </div>
          <div class="flex gap-3">
            <button
              @click="showReportModal = false"
              class="flex-1 bg-white/5 text-gray-500 py-5 rounded-[24px] font-[1000] italic uppercase text-[10px]"
            >
              Cancel</button
            ><button
              @click="submitReport"
              :disabled="isSubmittingReport"
              class="flex-[2] bg-red-600 text-white py-5 rounded-[24px] font-[1000] italic uppercase tracking-[0.1em] text-[10px]"
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
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
