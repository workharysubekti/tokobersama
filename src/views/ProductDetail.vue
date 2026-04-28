<script setup>
import { ref, onMounted, computed, onUnmounted, watch, nextTick } from "vue";
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
import { getRankDetails } from "../utils/rankUtils.js";

// --- PROPS & ROUTING ---
const props = defineProps({
  userProfile: Object,
});
const route = useRoute();
const router = useRouter();

// --- DATA STATES ---
const product = ref(null);
const recentBids = ref([]);
const loading = ref(true);
const bidAmount = ref(0);
const isSubmitting = ref(false);
const timeLeft = ref("");
const activeBidTab = ref("ranking");

// --- SILENT WAR INTEGRATION STATES ---
const serverOffset = ref(0); // Offset jam server
const showExtensionBadge = ref(false); // Indikator waktu bertambah

// --- AUCTION BEHAVIOR STATES ---
const isIntense = ref(false);
const hasNotifiedIntense = ref(false);
const showBannedModal = ref(false);

// --- OUTBID & ESCROW STATES ---
const isOutbid = ref(false);
const transaction = ref(null);
const showPaymentModal = ref(false);
const adminFee = 5000;
const isSubmittingAction = ref(false);

// --- SYNC & THROTTLE STATES ---
const isCooldown = ref(false);

// --- FUNGSI SYNC JAM (SILENT WAR) ---
const syncServerTime = async () => {
  try {
    const start = Date.now();
    const { data } = await supabase.rpc("get_server_time");
    const serverTime = data ? new Date(data).getTime() : Date.now();
    const end = Date.now();
    const latency = (end - start) / 2;
    serverOffset.value = serverTime - (end - latency);
  } catch (e) {
    serverOffset.value = 0;
  }
};

// --- LOGIKA RANKING (UNIQUE BIDDERS) ---
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
    product.value?.status === "closed" &&
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

// --- LOGIKA USER RANK & LIMIT (SINKRON DENGAN RANKUTILS) ---
const userRank = computed(() => {
  // Langsung panggil utility, berikan reputasi dan status admin
  const details = getRankDetails(
    props.userProfile?.reputation || 0,
    props.userProfile?.is_admin === true,
  );

  // Kita sesuaikan sedikit return-nya agar template Mas tidak error
  // dan menambahkan efek glow untuk lencana OWNER
  return {
    ...details,
    // Jika OWNER, tambahkan kelas drop-shadow premium
    extraClass:
      details.name === "OWNER"
        ? "font-[1000] drop-shadow-[0_0_10px_#EF4444aa]"
        : "font-black",
  };
});

// --- WATCHER OUTBID (SILENT INTEGRATION) ---
watch(recentBids, (newVal, oldVal) => {
  if (oldVal && oldVal.length > 0 && newVal.length > 0 && props.userProfile) {
    const wasTop = oldVal[0].user_id === props.userProfile.id;
    const isNowOutbid = newVal[0].user_id !== props.userProfile.id;
    if (wasTop && isNowOutbid && product.value?.status !== "closed") {
      isOutbid.value = true;
      // SILENT VIBRATION
      if (window.navigator.vibrate) window.navigator.vibrate(200);
    }
  }
  if (newVal.length > 0 && newVal[0].user_id === props.userProfile?.id) {
    isOutbid.value = false;
  }
});

// --- LOGIKA MULTI-IMAGE STACK ---
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
  const swipeDistance = touchStartX.value - touchEndX.value;
  if (swipeDistance > 50) nextImage();
  if (swipeDistance < -50) prevImage();
};

// --- LOGIKA REPORT ---
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
    return notify.error("Data Kurang", "Minimal 5 karakter.");
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
    notify.success("Laporan Terkirim", "Moderator akan meninjau aset ini.");
    showReportModal.value = false;
    reportForm.value.details = "";
  } catch (err) {
    notify.error("Gagal Melapor", err.message);
  } finally {
    isSubmittingReport.value = false;
  }
};

// --- UTILS & FETCHING ---
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
  if (product.value?.status !== "closed") return;
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
    notify.success("Berhasil", "Dana ditahan di Escrow.");
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

// --- LOGIKA TIMER (SILENT & OFFSET INTEGRATED) ---
const updateTimer = () => {
  if (!product.value?.end_time) return;
  const end = new Date(product.value.end_time).getTime();
  const now = Date.now() + serverOffset.value; // SYNCED
  const diff = end - now;

  if (diff <= 0) {
    if (product.value.status === "active") {
      timeLeft.value = "VALIDATING...";
    } else {
      timeLeft.value = "ENDED";
    }
    isIntense.value = false;
    return;
  }

  if (diff > 0 && diff <= 120000) {
    isIntense.value = true;
  } else {
    if (diff > 120000) {
      isIntense.value = false;
      hasNotifiedIntense.value = false;
    }
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  if (d > 0) {
    timeLeft.value = `${d}d ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  } else {
    timeLeft.value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
};

// --- FUNGSI PLACE BID (SILENT RPC INTEGRATED) ---
const placeBid = async () => {
  if (!props.userProfile || isCooldown.value) return;

  if (product.value.status !== "active" || timeLeft.value === "VALIDATING...") {
    return notify.error("Lelang Berakhir", "Pintu transmisi sudah ditutup.");
  }

  if (props.userProfile?.is_admin !== true) {
    const isCurrentWinner =
      recentBids.value.length > 0 &&
      recentBids.value[0].user_id === props.userProfile.id;
    if (isCurrentWinner)
      return notify.error("Top Position", "Tawaranmu masih tertinggi!");
  }

  const rep = props.userProfile?.reputation || 0;
  if (rep < 50 && props.userProfile?.is_admin !== true)
    return notify.error("Reputasi Rendah", "Minimal 50 poin buat ngebid.");

  if (bidAmount.value > userRank.value.limit) {
    return notify.error(
      "Limit Rank",
      `Maksimal bid ${formatPrice(userRank.value.limit)}`,
    );
  }

  try {
    isSubmitting.value = true;
    const { data, error } = await supabase.rpc("execute_bid_v1", {
      p_product_id: product.value.id,
      p_user_id: props.userProfile.id,
      p_bid_amount: bidAmount.value,
    });

    if (error) {
      notify.error("Gagal", error.message);
      await fetchBids();
      return;
    }

    product.value.end_time = data.new_end_time;
    product.value.current_bid = data.new_bid;
    bidAmount.value = Number(data.new_bid) + 10000;

    nextTick(() => updateTimer());

    // SILENT SUCCESS: notify.success dihapus karena visual sudah mewakili
    isCooldown.value = true;
    setTimeout(() => {
      isCooldown.value = false;
    }, 1500);
  } catch (err) {
    notify.error("Error", err.message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await syncServerTime(); // Sync server time first
  await fetchProductDetail();
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
        () => {
          fetchBids();
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
            const oldEnd = new Date(product.value.end_time).getTime();
            const newEnd = new Date(payload.new.end_time).getTime();

            if (
              payload.new.status === "active" &&
              product.value.status === "closed"
            ) {
              transaction.value = null;
              notify.success("REBIRTH!", "Lelang diaktifkan kembali!");
            }
            product.value.status = payload.new.status;
            product.value.winner_id = payload.new.winner_id;
            product.value.current_bid = payload.new.current_bid;
            product.value.end_time = payload.new.end_time;

            const nextMinBid = Number(payload.new.current_bid) + 10000;
            if (bidAmount.value < nextMinBid) {
              bidAmount.value = nextMinBid;
            }

            nextTick(() => updateTimer());

            // SILENT EXTENSION BADGE INTEGRATION
            if (newEnd > oldEnd + 2000) {
              showExtensionBadge.value = true;
              setTimeout(() => {
                showExtensionBadge.value = false;
              }, 3000);
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
      <h1 class="text-4xl font-[1000] italic uppercase text-white mb-4">
        ASSET TERMINATED
      </h1>
      <button
        @click="router.push('/')"
        class="bg-white text-black px-10 py-4 rounded-2xl font-black italic text-xs uppercase"
      >
        Back Home
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

    <div
      class="lg:hidden fixed top-[64px] inset-x-0 z-[90] pointer-events-none px-5 py-3"
    >
      <div
        :class="
          isIntense
            ? 'bg-red-600 border-red-500 shadow-red-500/20'
            : timeLeft === 'VALIDATING...'
              ? 'bg-blue-600 border-blue-500'
              : 'bg-yellow-500 border-yellow-400'
        "
        class="pointer-events-auto rounded-2xl border-2 shadow-2xl flex flex-col items-center justify-center py-2 transition-all duration-500"
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
        <span
          v-if="showExtensionBadge"
          class="text-[7px] font-black text-black uppercase animate-pulse"
          >Anti-Sniper: Time Extended!</span
        >
      </div>
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
                class="hidden lg:flex absolute bottom-6 left-6 z-[50] backdrop-blur-md px-5 py-2.5 rounded-2xl border items-center gap-3 transition-all duration-500"
                :class="
                  isIntense
                    ? 'bg-red-600 border-red-500 shadow-xl scale-110'
                    : timeLeft === 'VALIDATING...'
                      ? 'bg-blue-600 border-blue-500'
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
                <span class="text-xs font-[1000] italic uppercase text-white">{{
                  timeLeft
                }}</span>
                <span
                  v-if="showExtensionBadge"
                  class="text-[8px] font-black text-yellow-500 animate-bounce"
                  >EXTENDED!</span
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
                  Live <span class="text-yellow-500">Feed</span> Transmission
                </h2>
              </div>
              <div
                class="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl w-full max-w-xs mb-6"
              >
                <button
                  @click="activeBidTab = 'ranking'"
                  :class="
                    activeBidTab === 'ranking'
                      ? 'bg-yellow-500 text-black shadow-lg'
                      : 'text-gray-500'
                  "
                  class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all cursor-pointer"
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
                  class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all cursor-pointer"
                >
                  History
                </button>
              </div>
            </div>

            <div class="min-h-[400px]">
              <div v-if="activeBidTab === 'ranking'" class="space-y-4">
                <div
                  v-for="(bid, index) in rankedBids"
                  :key="'rank-' + bid.id"
                  @click="router.push(`/user/${bid.profiles?.username}`)"
                  class="flex items-center justify-between p-5 rounded-[28px] border border-white/5 bg-white/[0.02] group cursor-pointer hover:border-yellow-500/30 transition-all shadow-xl"
                  :class="
                    index === 0
                      ? 'border-yellow-500/30 bg-yellow-500/5 ring-1 ring-yellow-500/20'
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
                      class="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0"
                    >
                      <img
                        v-if="
                          bid.profiles?.avatar_url &&
                          bid.profiles.avatar_url.trim() !== ''
                        "
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
                    <div>
                      <p
                        class="text-sm font-black italic uppercase group-hover:text-yellow-500 transition-colors"
                      >
                        @{{ bid.profiles?.username }}
                      </p>
                      <p
                        class="text-[8px] text-gray-600 font-bold uppercase tracking-widest"
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
                  </div>
                </div>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="bid in recentBids"
                  :key="'hist-' + bid.id"
                  class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-black/40"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="w-2 h-2 rounded-full bg-yellow-500/40 animate-pulse"
                    ></div>
                    <p
                      class="text-[10px] font-black italic uppercase text-white"
                    >
                      @{{ bid.profiles?.username }}
                      <span class="text-gray-600 font-normal italic"
                        >transmitted a bid</span
                      >
                    </p>
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
              class="text-4xl lg:text-5xl font-[1000] italic uppercase tracking-tighter leading-tight"
            >
              {{ product.name }}
            </h2>
            <div
              @click="router.push(`/user/${product.profiles?.username}`)"
              class="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-[30px] cursor-pointer w-fit group"
            >
              <div
                class="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0"
              >
                <img
                  v-if="
                    product.profiles?.avatar_url &&
                    product.profiles.avatar_url.trim() !== ''
                  "
                  :src="product.profiles.avatar_url"
                  class="w-full h-full object-cover"
                />
                <UserCircleIcon v-else class="w-full h-full text-gray-700" />
              </div>
              <p
                class="text-sm font-black italic group-hover:text-yellow-500 uppercase leading-none"
              >
                @{{ product.profiles?.username }}
              </p>
            </div>
          </div>

          <div
            class="bg-[#0a0a0a] border border-white/10 rounded-[45px] p-8 shadow-2xl relative"
          >
            <p
              class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 italic"
            >
              Transmission Bid Price
            </p>

            <h3
              class="text-3xl sm:text-5xl lg:text-5xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] break-all leading-none py-2"
            >
              {{ formatPrice(product.current_bid || product.starting_bid) }}
            </h3>

            <div class="space-y-6">
              <div v-if="product.status === 'active'" class="space-y-6">
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
                          Current Position #1
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
                  class="flex items-center justify-between px-2 text-[9px] font-black uppercase italic"
                >
                  <span class="text-gray-600">Your Rank Status:</span>
                  <span
                    :style="{ color: userRank.color }"
                    :class="userRank.extraClass"
                  >
                    {{ userRank.name }} (Limit:
                    {{ formatPrice(userRank.limit) }})
                  </span>
                </div>

                <div class="relative group">
                  <span
                    class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-sm italic tracking-tighter"
                    >IDR</span
                  >
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
                      class="flex-shrink-0 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black italic text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all active:scale-90 shadow-lg"
                    >
                      +{{ plus / 1000 }}K
                    </button>
                  </div>
                  <input
                    v-model.number="bidAmount"
                    type="number"
                    class="w-full bg-black border-2 border-white/10 rounded-3xl py-7 pl-20 pr-6 text-3xl font-[1000] italic focus:border-yellow-500 text-white outline-none shadow-2xl"
                  />
                </div>

                <button
                  @click="placeBid"
                  :disabled="
                    isSubmitting || isCooldown || timeLeft === 'VALIDATING...'
                  "
                  :class="
                    isOutbid && timeLeft !== 'VALIDATING...'
                      ? 'bg-red-600 shadow-red-500/40 animate-pulse scale-[1.02]'
                      : timeLeft === 'VALIDATING...'
                        ? 'bg-gray-700 cursor-not-allowed'
                        : 'bg-yellow-500 shadow-yellow-500/20'
                  "
                  class="w-full text-black py-7 rounded-[35px] font-[1000] italic uppercase active:scale-95 flex flex-col items-center justify-center gap-1 transition-all shadow-2xl"
                >
                  <div class="flex items-center gap-3">
                    <ArrowPathIcon
                      v-if="isSubmitting"
                      class="w-7 h-7 animate-spin"
                    />
                    <BanknotesIcon v-else class="w-7 h-7 stroke-[2.5px]" />
                    <span class="text-xl">
                      {{
                        timeLeft === "VALIDATING..."
                          ? "VALIDATING..."
                          : isCooldown
                            ? "SINKRONISASI..."
                            : isOutbid
                              ? "RECLAIM POSITION!"
                              : "Execute Bid"
                      }}
                    </span>
                  </div>
                  <span
                    v-if="isIntense && timeLeft !== 'VALIDATING...'"
                    class="text-[8px] font-black tracking-[0.2em] animate-pulse"
                    >!! FINAL CALL - ANTI SNIPER ACTIVE !!</span
                  >
                </button>
              </div>

              <div v-else class="space-y-6">
                <div
                  v-if="isWinner"
                  class="bg-green-500/10 border-2 border-green-500/30 rounded-[45px] p-8 shadow-2xl relative overflow-hidden text-center"
                >
                  <div class="absolute -right-4 -top-4 opacity-10 rotate-12">
                    <TrophyIcon class="w-40 h-40 text-green-500" />
                  </div>
                  <h2
                    class="text-2xl font-[1000] italic uppercase text-white mb-6"
                  >
                    Victory Achieved!
                  </h2>
                  <div
                    class="bg-black/40 p-6 rounded-3xl border border-white/5 mb-6 flex justify-between items-center"
                  >
                    <span
                      class="text-[10px] font-bold uppercase italic text-gray-500"
                      >Total Settlement</span
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
                </div>
                <div
                  v-else
                  class="bg-white/5 border border-white/10 p-10 rounded-[45px] text-center relative overflow-hidden group shadow-2xl"
                >
                  <div class="absolute -right-4 -top-4 opacity-5 -rotate-12">
                    <LockClosedIcon class="w-32 h-32 text-white" />
                  </div>
                  <h4
                    class="text-xl font-[1000] italic text-gray-500 uppercase tracking-tighter"
                  >
                    Transmission Closed
                  </h4>
                  <p
                    class="text-[9px] font-black text-gray-700 uppercase italic mt-2"
                  >
                    Sold Price: {{ formatPrice(recentBids[0]?.amount) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            class="bg-white/[0.02] border border-white/5 rounded-[32px] p-7 text-justify shadow-xl"
          >
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
            <p class="text-gray-400 text-sm italic leading-relaxed">
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
                  v-for="(bid, index) in rankedBids"
                  :key="'mb-rank-' + bid.id"
                  @click="router.push(`/user/${bid.profiles?.username}`)"
                  class="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer shadow-xl"
                  :class="
                    index === 0 ? 'border-yellow-500/20 bg-yellow-500/5' : ''
                  "
                >
                  <div class="flex items-center gap-3">
                    <span class="font-[1000] italic text-sm text-yellow-500 w-4"
                      >#{{ index + 1 }}</span
                    >
                    <div
                      class="w-10 h-10 rounded-xl overflow-hidden border border-white/10 flex-shrink-0"
                    >
                      <img
                        v-if="
                          bid.profiles?.avatar_url &&
                          bid.profiles.avatar_url.trim() !== ''
                        "
                        :src="bid.profiles.avatar_url"
                        class="w-full h-full object-cover"
                      />
                      <div
                        v-else
                        class="w-full h-full bg-gray-800 flex items-center justify-center"
                      >
                        <UserIcon class="w-6 h-6 text-gray-500 p-2" />
                      </div>
                    </div>
                    <p class="text-xs font-black italic uppercase">
                      @{{ bid.profiles?.username }}
                    </p>
                  </div>
                  <p class="text-sm font-[1000] italic">
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
                  <p
                    class="text-[9px] font-black italic uppercase text-gray-300"
                  >
                    @{{ bid.profiles?.username }}
                  </p>
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
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-10 shadow-2xl overflow-hidden text-center"
      >
        <ExclamationTriangleIcon
          class="w-16 h-16 text-red-500 mx-auto mb-4 border border-red-500/20 p-3 rounded-2xl"
        />
        <h3
          class="text-xl font-[1000] italic uppercase tracking-tighter text-white mb-8"
        >
          Report Asset
        </h3>
        <div class="space-y-6 text-left">
          <select
            v-model="reportForm.category"
            class="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-500 appearance-none shadow-xl cursor-pointer"
          >
            <option v-for="cat in reportCategories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
          <textarea
            v-model="reportForm.details"
            rows="4"
            placeholder="Detail alasan..."
            class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs text-white outline-none focus:border-red-500 italic resize-none shadow-xl"
          ></textarea>
          <div class="flex gap-3">
            <button
              @click="showReportModal = false"
              class="flex-1 bg-white/5 text-gray-500 py-5 rounded-2xl font-[1000] italic uppercase text-[10px]"
            >
              Cancel
            </button>
            <button
              @click="submitReport"
              :disabled="isSubmittingReport"
              class="flex-[2] bg-red-600 text-white py-5 rounded-2xl font-[1000] italic uppercase text-[10px]"
            >
              Confirm Report
            </button>
          </div>
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
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[45px] p-10 text-center shadow-2xl"
      >
        <h3 class="text-2xl font-[1000] italic uppercase text-white mb-8">
          Escrow <span class="text-yellow-500">Payment</span>
        </h3>
        <button
          @click="confirmPayment('QRIS')"
          class="w-full p-6 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between hover:border-yellow-500/50 transition-all group mb-4 shadow-xl"
        >
          <span class="text-xs font-black italic text-white uppercase"
            >QRIS / ALL E-WALLET</span
          >
          <QrCodeIcon class="w-6 h-6 text-yellow-500" />
        </button>
        <button
          @click="confirmPayment('BANK_TRANSFER')"
          class="w-full p-6 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between hover:border-blue-500/50 transition-all group shadow-xl"
        >
          <span class="text-xs font-black italic text-white uppercase"
            >BANK TRANSFER (ESCROW)</span
          >
          <BanknotesIcon class="w-6 h-6 text-blue-500" />
        </button>
        <button
          @click="showPaymentModal = false"
          class="mt-10 text-[9px] font-black text-gray-600 uppercase italic underline underline-offset-4"
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
