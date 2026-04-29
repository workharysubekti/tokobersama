<script setup>
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify.js";
import { formatPrice } from "../utils/format.js";

// 1. Import Pusat Icon
import { Icons } from "../utils/icons.js";
const {
  TrophyIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  LockClosedIcon,
  TagIcon,
  QrCodeIcon,
} = Icons;

// 2. Import Logic Composables
import { useAuctionTimer } from "../composables/auction/useAuctionTimer";
import { useAuctionData } from "../composables/auction/useAuctionData";
import { useBidding } from "../composables/auction/useBidding";
import { useReputation } from "../composables/useReputation";

// --- PROPS & ROUTING ---
const props = defineProps({ userProfile: Object });
const userProfileRef = computed(() => props.userProfile);
const route = useRoute();
const router = useRouter();
const productId = parseInt(route.params.id);
// Masukkan di bagian UI STATES ProductDetail.vue
const adminFee = 5000;

// --- CALL LOGIC (Panggil Pekerja) ---
const {
  product,
  recentBids,
  transaction,
  loading,
  rankedBids,
  isWinner,
  isSeller,
  allImages,
  fetchProductDetail,
} = useAuctionData(productId, userProfileRef);

const {
  timeLeft,
  isIntense,
  showExtensionBadge,
  syncServerTime,
  startTimer,
  updateTimer,
} = useAuctionTimer(product);

const {
  bidAmount,
  isSubmitting,
  isCooldown,
  isOutbid,
  userRank,
  requiredDeposit,
  needsDeposit,
  executeBidTransaction,
} = useBidding(product, recentBids, userProfileRef);

const { now, getTimer, executePenalty } = useReputation();

// --- UI STATES (Variabel buat Modal & Toggle UI) ---
// Ini harus ada di sini karena ini urusan tampilan/UI
const activeBidTab = ref("ranking");
const showBannedModal = ref(false);
const showReportModal = ref(false);
const showPaymentModal = ref(false);
const showDepositModal = ref(false);
const isBotActive = ref(true);
const loadingFallback = ref(false);
const activeImgIndex = ref(0);
const reportForm = ref({ category: "Palsu / Kw", details: "" }); // Tambah ini juga
const reportCategories = [
  "Palsu / KW",
  "Penipuan Harga",
  "Foto Tidak Sesuai",
  "Kategori Salah",
  "Mengandung Unsur SARA/Pornografi",
  "Lainnya",
];

// --- UI COMPUTED ---
const showFallbackUI = computed(() => {
  return (
    product.value?.status === "closed" &&
    props.userProfile?.id === product.value?.winner_id &&
    product.value?.fallback_stage > 1 &&
    product.value?.fallback_status === "pending"
  );
});

const totalToPay = computed(() => {
  const myBid = recentBids.value.find(
    (b) => b.user_id === props.userProfile?.id,
  );
  return (myBid ? myBid.amount : product.value?.current_bid || 0) + 5000;
});

// --- UI METHODS (Logic Pendek khusus tampilan) ---
const nextImage = () => {
  if (allImages.value.length > 1)
    activeImgIndex.value = (activeImgIndex.value + 1) % allImages.value.length;
};

const handlePlaceBid = async () => {
  if (needsDeposit.value) {
    showDepositModal.value = true;
  } else {
    await executeBidTransaction((isExtended) => {
      if (isExtended) {
        showExtensionBadge.value = true;
        setTimeout(() => {
          showExtensionBadge.value = false;
        }, 3000);
      }
      nextTick(() => updateTimer());
    });
  }
};

// --- WATCHER ROBOT PENALTI ---
watch(now, async () => {
  if (!isBotActive.value || !product.value || product.value.status !== "closed")
    return;
  if (getTimer(product.value) === "EXPIRED") {
    isBotActive.value = false;
    await executePenalty(product.value, fetchProductDetail);
  }
});

// --- LIFECYCLE ---
onMounted(async () => {
  await syncServerTime();
  await fetchProductDetail();
  startTimer();
});
</script>

<template>
  <div v-if="product" class="bg-black min-h-screen text-white pb-32">
    <div
      v-if="showFallbackUI"
      class="relative z-[60] mb-8 mt-16 md:mt-0 overflow-hidden rounded-[32px] border-2 border-yellow-500 bg-black shadow-[0_0_40px_rgba(234,179,8,0.2)]"
    >
      <div
        class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"
      ></div>

      <div class="p-6 md:p-8">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div
            class="flex-shrink-0 w-16 h-16 rounded-2xl bg-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]"
          >
            <TrophyIcon class="w-10 h-10 text-black" />
          </div>

          <div class="flex-1 text-center md:text-left">
            <h2
              class="text-xl md:text-2xl font-[1000] italic text-white uppercase tracking-tighter mb-1"
            >
              Kesempatan <span class="text-yellow-500">Fallback!</span>
            </h2>
            <p
              class="text-[10px] md:text-xs text-gray-400 font-bold italic uppercase tracking-widest leading-relaxed"
            >
              Pemenang sebelumnya kabur. Sebagai Rank #{{
                product.fallback_stage
              }}, barang ini sekarang milikmu.
              <br class="hidden md:block" />
              Keputusan Berakhir Dalam:
              <span class="text-red-500 font-[1000] text-sm md:text-base ml-1">
                {{ fallbackCountdownText }}
              </span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mt-8">
          <button
            @click="handleFallback('accepted')"
            :disabled="loadingFallback"
            class="group relative overflow-hidden py-4 rounded-2xl bg-yellow-500 text-black font-[1000] italic uppercase text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <span class="relative z-10 text-[11px] md:text-sm">Ambil Item</span>
            <div
              class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"
            ></div>
          </button>

          <button
            @click="handleFallback('released')"
            :disabled="loadingFallback"
            class="py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-[1000] italic uppercase text-[11px] md:text-sm transition-all hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 active:scale-95 disabled:opacity-50"
          >
            Lepaskan
          </button>
        </div>
      </div>

      <div
        class="bg-yellow-500/10 py-3 px-6 border-t border-white/5 text-center"
      >
        <p
          class="text-[9px] font-black italic text-yellow-500 uppercase tracking-[0.2em]"
        >
          *Konsekuensi Bid & Run: -{{ getPenaltyPoint(product.fallback_stage) }}
          Reputasi
        </p>
      </div>
    </div>
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
      class="lg:hidden fixed top-[64px] inset-x-0 z-[90] pointer-events-none px-6 py-2"
    >
      <div
        :class="
          isIntense
            ? 'bg-red-600 border-red-500 shadow-red-500/40'
            : timeLeft === 'VALIDATING...'
              ? 'bg-blue-600 border-blue-500'
              : 'bg-yellow-500 border-yellow-400 shadow-yellow-500/20'
        "
        class="pointer-events-auto rounded-full border shadow-lg flex items-center justify-between px-4 py-1.5 transition-all duration-500"
      >
        <div class="flex items-center gap-2">
          <ClockIcon class="w-3.5 h-3.5 text-black animate-pulse" />
          <span
            class="text-[9px] font-black uppercase italic text-black tracking-widest whitespace-nowrap"
          >
            Ends In
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span
            class="text-base font-[1000] italic text-black tracking-tighter leading-none"
          >
            {{ timeLeft }}
          </span>

          <span
            v-if="showExtensionBadge"
            class="bg-black text-[7px] text-white px-1.5 py-0.5 rounded-md font-black uppercase animate-bounce"
          >
            +Time
          </span>
        </div>
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
            <pre class="text-[10px] text-white bg-red-900 p-2">
  Status: {{ product?.fallback_status }}
  WinnerID: {{ product?.winner_id }}
  UserID: {{ props.userProfile?.id }}
  TxStatus: {{ transaction?.status || "KOSONG/NULL" }}
  IsMatch: {{ product?.winner_id === props.userProfile?.id }}
</pre
            >
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
              class="text-2xl sm:text-4xl md:text-5xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] leading-[1.1] py-2 break-words transition-all duration-300"
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
                    class="absolute left-5 lg:left-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs lg:text-sm italic tracking-tighter z-10 pointer-events-none"
                  >
                    IDR
                  </span>

                  <div
                    class="flex gap-2 lg:gap-3 mb-4 overflow-x-auto no-scrollbar pb-2"
                  >
                    <button
                      v-for="plus in [10000, 50000, 100000, 500000]"
                      :key="plus"
                      @click="
                        bidAmount =
                          (product.current_bid || product.starting_bid) + plus
                      "
                      class="flex-shrink-0 bg-white/5 border border-white/10 px-3 lg:px-4 py-2 rounded-xl text-[9px] lg:text-[10px] font-black italic text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all active:scale-90 shadow-lg"
                    >
                      +{{ plus / 1000 }}K
                    </button>
                  </div>

                  <input
                    v-model="formattedBidAmount"
                    type="text"
                    inputmode="numeric"
                    class="w-full bg-black border-2 border-white/10 rounded-3xl py-5 lg:py-7 pl-14 lg:pl-20 pr-4 lg:pr-6 font-[1000] italic focus:border-yellow-500 text-white outline-none shadow-2xl transition-all"
                    :class="
                      bidAmount.toString().length > 9
                        ? 'text-lg lg:text-3xl'
                        : 'text-xl lg:text-3xl'
                    "
                    placeholder="0"
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
                    class="bg-black/40 p-5 lg:p-6 rounded-3xl border border-white/5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 overflow-hidden shadow-inner"
                  >
                    <span
                      class="text-[9px] lg:text-[10px] font-bold uppercase italic text-gray-500 tracking-wider whitespace-nowrap"
                    >
                      Total Settlement
                    </span>

                    <span
                      class="text-white font-[1000] italic break-all sm:break-normal leading-tight transition-all duration-300"
                      :class="
                        totalToPay.toString().length > 9
                          ? 'text-sm lg:text-base'
                          : 'text-base lg:text-lg'
                      "
                    >
                      {{ formatPrice(totalToPay) }}
                    </span>
                  </div>
                  <button
                    v-if="
                      product?.winner_id === props.userProfile?.id &&
                      product?.fallback_status === 'accepted'
                    "
                    @click="showPaymentModal = true"
                    class="w-full bg-green-500 text-black py-5 rounded-[25px] font-[1000] italic uppercase text-xs flex items-center justify-center gap-3 shadow-lg"
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

    <div
      v-if="showDepositModal"
      class="fixed inset-0 z-[600] flex items-center justify-center p-6"
    >
      <div
        class="absolute inset-0 bg-black/95 backdrop-blur-2xl"
        @click="showDepositModal = false"
      ></div>
      <div
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[45px] p-10 text-center shadow-2xl"
      >
        <div
          class="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/20"
        >
          <BanknotesIcon class="w-10 h-10 text-yellow-500" />
        </div>

        <h3 class="text-2xl font-[1000] italic uppercase text-white mb-2">
          Security <span class="text-yellow-500">Deposit</span>
        </h3>

        <p
          class="text-[9px] text-gray-500 uppercase tracking-widest mb-8 italic px-4"
        >
          {{
            props.userProfile?.reputation < 50
              ? "Wajib jaminan 30% karena reputasi di bawah standar (Probation)."
              : `Jaminan diperlukan untuk bid di luar limit rank ${userRank.name}.`
          }}
        </p>

        <div
          class="bg-white/5 rounded-3xl p-6 mb-8 space-y-4 border border-white/5"
        >
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-black text-gray-500 uppercase italic"
              >Requirement</span
            >
            <span class="text-sm font-black text-white italic">{{
              formatPrice(requiredDeposit)
            }}</span>
          </div>
          <div
            class="flex justify-between items-center pt-4 border-t border-white/5"
          >
            <span class="text-[10px] font-black text-gray-500 uppercase italic"
              >Your Balance</span
            >
            <span
              :class="
                hasEnoughBalanceForDeposit ? 'text-white' : 'text-red-500'
              "
              class="text-sm font-black italic"
            >
              {{ formatPrice(props.userProfile?.balance || 0) }}
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button
            v-if="hasEnoughBalanceForDeposit"
            @click="executeBidTransaction"
            :disabled="isSubmitting"
            class="w-full bg-yellow-500 text-black py-5 rounded-[25px] font-[1000] italic uppercase text-xs shadow-xl active:scale-95 transition-all"
          >
            {{ isSubmitting ? "PROCESSING..." : "PAY DEPOSIT & BID" }}
          </button>

          <button
            v-else
            @click="router.push('/wallet')"
            class="w-full bg-red-600 text-white py-5 rounded-[25px] font-[1000] italic uppercase text-xs shadow-xl active:scale-95 transition-all"
          >
            INSUFFICIENT BALANCE - TOP UP NOW
          </button>

          <button
            @click="showDepositModal = false"
            class="py-4 text-[9px] font-black text-gray-600 uppercase italic hover:text-white transition-colors"
          >
            Decline Transmission
          </button>
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
