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
  ChatBubbleLeftRightIcon,
  QrCodeIcon,
  LockClosedIcon,
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
const activeBidTab = ref("ranking");

// --- STATE REFORMASI (ANT-SNIPER & WAR ZONE) ---
const isIntense = ref(false);
const hasNotifiedIntense = ref(false);
const showBannedModal = ref(false);

// --- STATE LOGIKA OUTBID & ESCROW ---
const isOutbid = ref(false);
const transaction = ref(null);
const showPaymentModal = ref(false);
const adminFee = 5000;
const isSubmittingAction = ref(false);

// --- FIX: SERVER TIME OFFSET (BIAR GAK BEDA JAM ANTAR DEVICE) ---
const serverOffset = ref(0);

// --- REFORMASI LOGIKA RANKING (UNIQUE) ---
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

// --- LOGIKA SETTLEMENT ---
const isWinner = computed(() => {
  return (
    timeLeft.value === "ENDED" &&
    recentBids.value.length > 0 &&
    props.userProfile?.id === recentBids.value[0].user_id
  );
});

const isSeller = computed(() => {
  return props.userProfile?.id === product.value?.owner_id;
});

const totalToPay = computed(() => {
  const winningBid = recentBids.value[0]?.amount || 0;
  return winningBid + adminFee;
});

// --- LOGIKA RANK & LIMIT ---
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

// WATCHER POSISI BID (OUTBID ALERT)
watch(recentBids, (newVal, oldVal) => {
  if (oldVal && oldVal.length > 0 && newVal.length > 0 && props.userProfile) {
    const wasTop = oldVal[0].user_id === props.userProfile.id;
    const isNowOutbid = newVal[0].user_id !== props.userProfile.id;
    if (wasTop && isNowOutbid && timeLeft.value !== "ENDED") {
      isOutbid.value = true;
    }
  }
  if (newVal.length > 0 && newVal[0].user_id === props.userProfile?.id) {
    isOutbid.value = false;
  }
});

// --- LOGIKA MULTI-IMAGE (SUCI) ---
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
  if (allImages.value.length > 1)
    activeImgIndex.value = (activeImgIndex.value + 1) % allImages.value.length;
};
const prevImage = () => {
  if (allImages.value.length > 1)
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
  const dist = touchStartX.value - touchEndX.value;
  if (dist > 50) nextImage();
  if (dist < -50) prevImage();
};

// --- LOGIKA REPORT & FETCH ---
const showReportModal = ref(false);
const isSubmittingReport = ref(false);
const reportForm = ref({ category: "Palsu / Kw", details: "" });
const reportCategories = [
  "Palsu / KW",
  "Penipuan Harga",
  "Foto Tidak Sesuai",
  "Kategori Salah",
  "SARA/Pornografi",
  "Lainnya",
];

const submitReport = async () => {
  if (!props.userProfile) return notify.error("Auth Required", "Login dulu!");
  try {
    isSubmittingReport.value = true;
    await supabase
      .from("reports")
      .insert({
        product_id: product.value.id,
        reporter_id: props.userProfile.id,
        target_user_id: product.value.owner_id,
        reason_category: reportForm.value.category,
        reason: reportForm.value.details,
        status: "pending",
      });
    notify.success("Laporan Masuk", "Admin akan meninjau.");
    showReportModal.value = false;
  } catch (err) {
    notify.error("Gagal", err.message);
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
    .limit(50);
  if (data) {
    recentBids.value = data;
    if (data.length > 0 && product.value)
      product.value.current_bid = data[0].amount;
  }
};

const fetchTransaction = async () => {
  if (timeLeft.value !== "ENDED") return;
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("product_id", route.params.id)
    .maybeSingle();
  if (data) transaction.value = data;
  else if (isWinner.value) {
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

const confirmPayment = async (method) => {
  isSubmittingAction.value = true;
  const { error } = await supabase
    .from("transactions")
    .update({ status: "escrow_holding", payment_method: method })
    .eq("id", transaction.value.id);
  if (!error) {
    transaction.value.status = "escrow_holding";
    notify.success("Berhasil", "Dana di Escrow.");
    showPaymentModal.value = false;
  }
  isSubmittingAction.value = false;
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
    bidAmount.value =
      recentBids.value.length > 0
        ? Number(recentBids.value[0].amount) + 10000
        : Number(data.starting_bid) + 10000;
  } finally {
    loading.value = false;
  }
};

// --- FIX: LOGIKA TIMER ANTI-SNIPER DENGAN SERVER SINKRONISASI ---
const updateTimer = () => {
  if (!product.value?.end_time) return;

  const end = new Date(product.value.end_time).getTime();
  // Gunakan offset untuk menyamakan jam dengan server
  const now = Date.now() + serverOffset.value;
  const diff = end - now;

  if (diff > 0 && diff <= 121000) {
    isIntense.value = true;
    if (!hasNotifiedIntense.value) {
      notify.error("WAR ZONE!", "Sisa 2 menit!");
      hasNotifiedIntense.value = true;
    }
  } else {
    if (diff > 121000) {
      isIntense.value = false;
      hasNotifiedIntense.value = false;
    }
  }

  // REFORMASI: Jangan permanenkan ENDED jika jam server belum lewat
  if (diff <= 0) {
    timeLeft.value = "ENDED";
    isIntense.value = false;
    return;
  }

  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  timeLeft.value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const placeBid = async () => {
  if (!props.userProfile) return notify.error("Auth Required", "Login dulu!");

  if (props.userProfile?.is_admin !== true) {
    const isCurrentWinner =
      recentBids.value.length > 0 &&
      recentBids.value[0].user_id === props.userProfile.id;
    if (isCurrentWinner)
      return notify.error("Top Position", "Tawaranmu masih tertinggi!");
  }

  const rep = props.userProfile?.reputation || 0;
  if (rep < 50 && props.userProfile?.is_admin !== true)
    return notify.error("Reputasi Rendah", "Minimal 50 poin!");
  if (bidAmount.value > userRank.value.limit)
    return notify.error(
      "Limit Rank",
      `Maksimal ${formatPrice(userRank.value.limit)}`,
    );

  if (isSubmitting.value || !product.value) return;

  // Ambil waktu server terbaru saat ngebid
  const now = Date.now() + serverOffset.value;
  const end = new Date(product.value.end_time).getTime();
  const diff = end - now;

  // Anti-glitch: Pastikan lelang beneran masih jalan berdasarkan jam tersinkronisasi
  if (diff <= 0) return notify.error("Lelang Berakhir", "Transmisi ditutup.");

  const topPrice =
    recentBids.value[0]?.amount || product.value.starting_bid || 0;
  if (bidAmount.value <= topPrice) {
    notify.error("Bid Low", `Harga naik ke ${formatPrice(topPrice)}`);
    bidAmount.value = Number(topPrice) + 10000;
    return;
  }

  try {
    isSubmitting.value = true;
    let newEndTime = product.value.end_time;

    // --- REFORMASI ANTI-SNIPER 60 DETIK KEBAWAH (BIAR GAK GLITCH) ---
    if (diff <= 60000 && diff > 0) {
      // Paksa reset ke 2 menit (120000ms) dari detik SEKARANG
      const resetTime = new Date(now + 120000);
      newEndTime = resetTime.toISOString();
      notify.success("ANTI-SNIPER!", "Waktu di-reset ke 2 menit lagi!");
    }

    const { error: bidErr } = await supabase.from("bids").insert({
      product_id: product.value.id,
      user_id: props.userProfile.id,
      amount: bidAmount.value,
    });
    if (bidErr) throw bidErr;

    // UPDATE DATABASE (Ini sumber sinkronisasi ke device lain)
    await supabase
      .from("products")
      .update({
        current_bid: bidAmount.value,
        winner_id: props.userProfile.id,
        end_time: newEndTime,
      })
      .eq("id", product.value.id);

    // Sync Lokal untuk instant feedback
    product.value.end_time = newEndTime;
    product.value.current_bid = bidAmount.value;
    bidAmount.value = Number(bidAmount.value) + 10000;
    notify.success("GACOR!", "Bid terkirim.");
  } catch (err) {
    notify.error("System Error", err.message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  // Sync Jam Server Pertama Kali
  const startFetch = Date.now();
  const { data: serverTime } = await supabase
    .from("products")
    .select("created_at")
    .limit(1)
    .single();
  if (serverTime) {
    serverOffset.value = new Date(serverTime.created_at).getTime() - startFetch;
  }

  fetchProductDetail();
  timerInterval = setInterval(() => {
    updateTimer();
    if (timeLeft.value === "ENDED" && !transaction.value) fetchTransaction();
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
          fetchBids(); // Refresh daftar bidder
          // Paksa sinkronisasi harga terbaru agar teman Mas bisa ngebid lagi
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
            // REFORMASI: Sync End Time secara brutal agar Anti-Sniper kerasa di semua device
            product.value.status = payload.new.status;
            product.value.winner_id = payload.new.winner_id;
            product.value.current_bid = payload.new.current_bid;

            const dbEndTime = new Date(payload.new.end_time).getTime();
            const localEndTime = new Date(product.value.end_time).getTime();

            if (dbEndTime > localEndTime) {
              product.value.end_time = payload.new.end_time;
              notify.success("TIME EXTENDED!", "Waktu bertambah!");
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
      <ExclamationTriangleIcon class="w-24 h-24 text-red-500 mb-6" />
      <h1 class="text-4xl font-[1000] italic uppercase mb-4">
        ASSET TERMINATED
      </h1>
      <button
        @click="router.push('/')"
        class="bg-white text-black px-10 py-4 rounded-2xl font-black italic uppercase text-xs"
      >
        Back Home
      </button>
    </div>

    <div
      class="fixed top-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between"
    >
      <button @click="router.back()" class="p-2">
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div class="text-center">
        <p
          class="text-[8px] font-black uppercase text-yellow-500 tracking-[0.4em] italic"
        >
          Transmission
        </p>
        <h1 class="text-[10px] font-black uppercase tracking-widest italic">
          Live Auction Feed
        </h1>
      </div>
      <div class="w-10"></div>
    </div>

    <div
      class="lg:hidden fixed top-[64px] inset-x-0 z-[90] px-5 py-3 pointer-events-none"
    >
      <div
        :class="
          isIntense
            ? 'bg-red-600 border-red-500 shadow-red-500/20'
            : 'bg-yellow-500 border-yellow-400 shadow-yellow-500/20'
        "
        class="pointer-events-auto rounded-2xl border-2 shadow-2xl flex items-center justify-between px-6 py-2.5 transition-all duration-500"
      >
        <div class="flex items-center gap-2">
          <ClockIcon class="w-4 h-4 text-black animate-pulse" />
          <span class="text-[8px] font-black uppercase italic text-black"
            >Ends In</span
          >
        </div>
        <span class="text-lg font-[1000] italic text-black tracking-tighter">{{
          timeLeft
        }}</span>
      </div>
    </div>

    <div v-if="!loading" class="pt-20 px-5 max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div class="lg:col-span-7 space-y-10">
          <div
            class="relative w-full aspect-square lg:aspect-video mt-4"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
          >
            <div class="relative w-full h-full" @click="nextImage">
              <div
                v-for="(img, index) in allImages"
                :key="index"
                class="absolute inset-0 w-full h-full transition-all duration-500"
                :style="{
                  zIndex: index === activeImgIndex ? 40 : 30 - index,
                  opacity: index < activeImgIndex ? 0 : 1,
                  transform:
                    index > activeImgIndex
                      ? `translateX(${(index - activeImgIndex) * 15}px) scale(${1 - (index - activeImgIndex) * 0.05})`
                      : index < activeImgIndex
                        ? 'translateX(-100%)'
                        : 'translateX(0)',
                }"
              >
                <div
                  class="w-full h-full rounded-[30px] border border-white/10 overflow-hidden bg-[#080808]"
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
                class="absolute bottom-6 right-6 z-[50] bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black italic shadow-xl"
              >
                {{ activeImgIndex + 1 }} / {{ allImages.length }}
              </div>
              <div
                class="hidden lg:flex absolute bottom-6 left-6 z-[50] backdrop-blur-md px-5 py-2.5 rounded-2xl border items-center gap-3"
                :class="
                  isIntense
                    ? 'bg-red-600 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                    : 'bg-black/60 border-white/10'
                "
              >
                <ClockIcon
                  class="w-5 h-5 text-white"
                  :class="isIntense ? 'animate-spin' : 'animate-pulse'"
                />
                <span class="text-xs font-[1000] italic text-white">{{
                  timeLeft
                }}</span>
              </div>
            </div>
          </div>

          <div class="hidden lg:block space-y-6">
            <div
              class="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit mb-6"
            >
              <button
                @click="activeBidTab = 'ranking'"
                :class="
                  activeBidTab === 'ranking'
                    ? 'bg-yellow-500 text-black'
                    : 'text-gray-500'
                "
                class="px-6 py-3 rounded-xl text-[10px] font-black uppercase italic cursor-pointer"
              >
                Ranking
              </button>
              <button
                @click="activeBidTab = 'history'"
                :class="
                  activeBidTab === 'history'
                    ? 'bg-white text-black'
                    : 'text-gray-500'
                "
                class="px-6 py-3 rounded-xl text-[10px] font-black uppercase italic cursor-pointer"
              >
                History
              </button>
            </div>
            <div v-if="activeBidTab === 'ranking'" class="space-y-4">
              <div
                v-for="(bid, index) in rankedBids"
                :key="bid.id"
                class="flex items-center justify-between p-5 rounded-[28px] border border-white/5 bg-white/[0.02]"
                :class="
                  index === 0
                    ? 'border-yellow-500/30 bg-yellow-500/5 ring-1 ring-yellow-500/20'
                    : ''
                "
              >
                <div class="flex items-center gap-5">
                  <span
                    class="font-[1000] italic text-xl"
                    :class="index < 3 ? 'text-yellow-500' : 'text-gray-700'"
                    >#{{ index + 1 }}</span
                  >
                  <img
                    :src="bid.profiles?.avatar_url"
                    class="w-12 h-12 rounded-2xl object-cover border-2 border-white/10"
                  />
                  <div>
                    <p class="text-sm font-black italic uppercase">
                      @{{ bid.profiles?.username }}
                    </p>
                    <p class="text-[8px] text-gray-600 font-bold uppercase">
                      {{ bid.profiles?.reputation }} REP PTS
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
                </div>
              </div>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="bid in recentBids"
                :key="bid.id"
                class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-black/40"
              >
                <p class="text-[10px] font-black italic text-white uppercase">
                  @{{ bid.profiles?.username }}
                  <span class="text-gray-600 font-normal"
                    >Transmitted a bid</span
                  >
                </p>
                <p class="font-black italic text-gray-400 text-sm">
                  {{ formatPrice(bid.amount) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 space-y-8">
          <div class="space-y-6">
            <h2
              class="text-4xl lg:text-7xl font-[1000] italic uppercase tracking-tighter leading-[0.8]"
            >
              {{ product.name }}
            </h2>
            <div
              @click="router.push(`/user/${product.profiles?.username}`)"
              class="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-[30px] w-fit cursor-pointer"
            >
              <img
                :src="product.profiles?.avatar_url"
                class="w-12 h-12 rounded-2xl border border-white/10"
              />
              <div>
                <p
                  class="text-[7px] font-black text-gray-500 uppercase tracking-widest italic"
                >
                  Contractor
                </p>
                <p class="text-sm font-black italic uppercase">
                  @{{ product.profiles?.username }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-[#0a0a0a] border border-white/10 rounded-[45px] p-8 shadow-2xl relative overflow-hidden"
          >
            <p
              class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic mb-4"
            >
              Current Price
            </p>
            <h3
              class="text-4xl lg:text-7xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]"
            >
              {{ formatPrice(product.current_bid || product.starting_bid) }}
            </h3>

            <div class="space-y-6">
              <div v-if="timeLeft !== 'ENDED'" class="space-y-6">
                <transition
                  enter-active-class="animate-bounce"
                  v-if="recentBids.length > 0"
                >
                  <div
                    class="p-4 bg-yellow-500 rounded-2xl flex items-center justify-between shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                  >
                    <div class="flex items-center gap-3">
                      <TrophyIcon class="w-6 h-6 text-black" />
                      <div>
                        <p
                          class="text-[8px] font-black text-black/60 uppercase leading-none"
                        >
                          Current position #1
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
                        Price
                      </p>
                      <p class="text-sm font-[1000] text-black italic">
                        {{ formatPrice(recentBids[0].amount) }}
                      </p>
                    </div>
                  </div>
                </transition>

                <div
                  v-if="props.userProfile"
                  class="flex justify-between px-2 text-[9px] font-black uppercase italic"
                >
                  <span class="text-gray-600">Your Rank:</span
                  ><span :class="userRank.color"
                    >{{ userRank.name }} (Limit:
                    {{ formatPrice(userRank.limit) }})</span
                  >
                </div>

                <div class="relative">
                  <div
                    class="flex gap-3 mb-4 overflow-x-auto no-scrollbar pb-2"
                  >
                    <button
                      v-for="plus in [10000, 50000, 100000, 500000]"
                      :key="plus"
                      @click="
                        bidAmount =
                          (product.current_bid || product.starting_bid) + plus
                      "
                      class="flex-shrink-0 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black italic text-yellow-500 active:scale-90"
                    >
                      +{{ plus / 1000 }}K
                    </button>
                  </div>
                  <input
                    v-model.number="bidAmount"
                    type="number"
                    class="w-full bg-black border-2 border-white/10 rounded-3xl py-7 px-6 text-3xl font-[1000] italic focus:border-yellow-500 outline-none"
                  />
                </div>

                <button
                  @click="placeBid"
                  :disabled="isSubmitting"
                  :class="
                    isOutbid
                      ? 'bg-red-600 shadow-red-500/40 animate-pulse scale-[1.02]'
                      : 'bg-yellow-500 shadow-yellow-500/20'
                  "
                  class="w-full text-black py-7 rounded-[35px] font-[1000] italic uppercase tracking-widest active:scale-95 flex flex-col items-center justify-center gap-1 disabled:opacity-50 transition-all"
                >
                  <div class="flex items-center gap-3">
                    <ArrowPathIcon
                      v-if="isSubmitting"
                      class="w-7 h-7 animate-spin"
                    />
                    <BanknotesIcon v-else class="w-7 h-7 stroke-[2.5px]" />
                    <span class="text-xl">{{
                      isOutbid ? "RECLAIM POSITION!" : "Execute Bid"
                    }}</span>
                  </div>
                  <span
                    v-if="isIntense"
                    class="text-[8px] font-black tracking-[0.2em] animate-pulse"
                    >{{
                      isOutbid
                        ? "!! SOMEONE TOOK YOUR ASSET !!"
                        : "!! FINAL CALL - ANTI SNIPER ACTIVE !!"
                    }}</span
                  >
                </button>
              </div>

              <div v-else class="space-y-6">
                <div
                  v-if="isWinner"
                  class="bg-green-500/10 border-2 border-green-500/30 rounded-[45px] p-8 shadow-2xl relative overflow-hidden"
                >
                  <TrophyIcon
                    class="absolute -right-4 -top-4 opacity-10 rotate-12 w-40 h-40 text-green-500"
                  />
                  <h2 class="text-2xl font-[1000] italic uppercase mb-6">
                    You Won!
                  </h2>
                  <div
                    class="bg-black/40 p-6 rounded-3xl border border-white/5 mb-6 flex justify-between items-center"
                  >
                    <span
                      class="text-[10px] font-bold uppercase italic text-gray-500"
                      >Escrow Total</span
                    ><span class="text-white font-black italic">{{
                      formatPrice(totalToPay)
                    }}</span>
                  </div>
                  <button
                    v-if="
                      !transaction || transaction.status === 'pending_payment'
                    "
                    @click="showPaymentModal = true"
                    class="w-full bg-green-500 text-black py-5 rounded-[25px] font-black italic uppercase text-xs flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
                  >
                    <ShieldCheckIcon class="w-5 h-5" /> Pay to Escrow
                  </button>
                  <div
                    v-else
                    class="bg-green-500/20 text-green-500 p-4 rounded-2xl text-center text-[10px] font-black uppercase italic"
                  >
                    Dana Diamankan Escrow
                  </div>
                  <button
                    @click="router.push(`/chat/${product.id}`)"
                    class="w-full mt-4 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black italic text-[10px] flex items-center justify-center gap-3"
                  >
                    <ChatBubbleLeftRightIcon class="w-5 h-5" /> Live Chat with
                    Seller
                  </button>
                </div>
                <div
                  v-else-if="isSeller"
                  class="bg-blue-600/10 border-2 border-blue-500/30 rounded-[45px] p-8 shadow-2xl"
                >
                  <h2
                    class="text-2xl font-[1000] italic uppercase text-white mb-6"
                  >
                    Asset Sold
                  </h2>
                  <div
                    class="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl mb-6 text-center text-[10px] font-bold text-blue-400 italic"
                  >
                    Dana aman di TokBer sampai pengiriman dikonfirmasi.
                  </div>
                  <button
                    @click="router.push(`/chat/${product.id}`)"
                    class="w-full bg-white/5 border border-white/10 text-white py-5 rounded-[25px] font-black italic text-[10px] flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
                  >
                    <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-500" />
                    Chat with Winner
                  </button>
                </div>
                <div
                  v-else
                  class="bg-white/5 border border-white/10 p-10 rounded-[45px] text-center relative overflow-hidden group"
                >
                  <LockClosedIcon
                    class="absolute -right-4 -top-4 opacity-5 -rotate-12 w-32 h-32 text-white"
                  />
                  <h4
                    class="text-xl font-[1000] italic text-gray-500 uppercase tracking-tighter"
                  >
                    Transmission Closed
                  </h4>
                  <p
                    class="text-[9px] font-black text-gray-700 uppercase italic mt-2"
                  >
                    Sold at: {{ formatPrice(recentBids[0]?.amount) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white/[0.02] border border-white/5 rounded-[32px] p-7">
            <p
              class="text-[10px] font-black text-yellow-500 uppercase italic tracking-widest mb-4"
            >
              Asset Dossier
            </p>
            <p
              class="text-gray-400 text-sm italic leading-relaxed text-justify"
            >
              {{ product.description }}
            </p>
          </div>

          <div class="lg:hidden space-y-6 pt-10 border-t border-white/5">
            <div
              class="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-6"
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
                Ranking</button
              ><button
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
            <div v-if="activeBidTab === 'ranking'" class="space-y-3">
              <div
                v-for="(bid, index) in rankedBids.slice(0, 5)"
                :key="bid.id"
                class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]"
                :class="
                  index === 0 ? 'border-yellow-500/20 bg-yellow-500/5' : ''
                "
              >
                <div class="flex items-center gap-3">
                  <span class="font-[1000] italic text-sm text-yellow-500 w-4"
                    >#{{ index + 1 }}</span
                  ><img
                    :src="bid.profiles?.avatar_url"
                    class="w-10 h-10 rounded-xl overflow-hidden border border-white/10"
                  />
                  <p class="text-xs font-black italic uppercase">
                    @{{ bid.profiles?.username }}
                  </p>
                </div>
                <p class="text-sm font-[1000] italic text-white">
                  {{ formatPrice(bid.amount) }}
                </p>
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
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-10 shadow-2xl text-center"
      >
        <ExclamationTriangleIcon class="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 class="text-xl font-[1000] italic uppercase text-white mb-8">
          Report Asset
        </h3>
        <select
          v-model="reportForm.category"
          class="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-bold text-white mb-4 outline-none focus:border-red-500"
        >
          <option
            v-for="cat in reportCategories"
            :key="cat"
            :value="cat"
            class="bg-gray-900"
          >
            {{ cat }}
          </option></select
        ><textarea
          v-model="reportForm.details"
          rows="4"
          placeholder="Alasan..."
          class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs font-bold text-white outline-none focus:border-red-500 resize-none mb-6 italic"
        ></textarea>
        <div class="flex gap-3">
          <button
            @click="showReportModal = false"
            class="flex-1 bg-white/5 text-gray-500 py-5 rounded-2xl font-black text-[10px]"
          >
            CANCEL</button
          ><button
            @click="submitReport"
            :disabled="isSubmittingReport"
            class="flex-[2] bg-red-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase"
          >
            CONFIRM REPORT
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showPaymentModal"
      class="fixed inset-0 z-[500] flex items-center justify-center p-6"
    >
      <div
        class="absolute inset-0 bg-black/95 backdrop-blur-xl"
        @click="showPaymentModal = false"
      ></div>
      <div
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[45px] p-10 text-center"
      >
        <h3 class="text-2xl font-[1000] italic uppercase text-white mb-8">
          Escrow <span class="text-yellow-500">Payment</span>
        </h3>
        <button
          @click="confirmPayment('QRIS')"
          class="w-full p-6 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between mb-4 hover:border-yellow-500/50 group"
        >
          <span class="text-xs font-black italic uppercase"
            >QRIS / ALL E-WALLET</span
          ><QrCodeIcon class="w-6 h-6 text-yellow-500" /></button
        ><button
          @click="confirmPayment('BANK_TRANSFER')"
          class="w-full p-6 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between hover:border-blue-500/50 group"
        >
          <span class="text-xs font-black italic uppercase text-white"
            >BANK TRANSFER (ESCROW)</span
          ><BanknotesIcon class="w-6 h-6 text-blue-500" /></button
        ><button
          @click="showPaymentModal = false"
          class="mt-8 text-[9px] font-black text-gray-600 uppercase italic underline underline-offset-4"
        >
          Cancel Process
        </button>
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
