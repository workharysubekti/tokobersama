<script setup>
import { ref, onMounted, computed, onUnmounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify.js";
import {
  ClockIcon, ArrowLeftIcon, ShieldCheckIcon, TrophyIcon, FireIcon,
  BanknotesIcon, ArrowPathIcon, UserCircleIcon, TagIcon,
  ExclamationTriangleIcon, UserIcon, ChatBubbleLeftRightIcon,
  QrCodeIcon, LockClosedIcon
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

const isIntense = ref(false); 
const hasNotifiedIntense = ref(false);
const isOutbid = ref(false);
const transaction = ref(null);
const showPaymentModal = ref(false);
const adminFee = 5000;
const isCooldown = ref(false);

// --- LOGIKA RANKING (UNIQUE) ---
const rankedBids = computed(() => {
  if (!recentBids.value.length) return [];
  const seen = new Set();
  return recentBids.value.filter(b => {
    const duplicate = seen.has(b.user_id);
    seen.add(b.user_id);
    return !duplicate;
  }).slice(0, 8);
});

// --- LOGIKA WINNER (HANYA JIKA DB BILANG CLOSED) ---
const isWinner = computed(() => {
  return product.value?.status === 'closed' && recentBids.value[0]?.user_id === props.userProfile?.id;
});

const totalToPay = computed(() => (recentBids.value[0]?.amount || 0) + adminFee);

// --- USER RANK DISPLAY ---
const userRank = computed(() => {
  if (props.userProfile?.is_admin) return { name: "OWNER", limit: Infinity, color: "text-yellow-500 font-black" };
  const rep = props.userProfile?.reputation || 0;
  if (rep >= 600) return { name: "LEGEND", limit: Infinity, color: "text-purple-500" };
  if (rep >= 400) return { name: "EXPERT", limit: 100000000, color: "text-red-500" };
  if (rep >= 200) return { name: "INTERMEDIATE", limit: 20000000, color: "text-blue-500" };
  return { name: "NEWBIE", limit: 5000000, color: "text-green-500" };
});

// --- IMAGE LOGIC ---
const activeImgIndex = ref(0);
const allImages = computed(() => {
  if (!product.value) return [];
  const imgs = [product.value.image_url];
  const extra = product.value.additional_images;
  if (Array.isArray(extra)) imgs.push(...extra);
  return imgs.filter(u => u && u.trim() !== "");
});

// --- SOTHEBY'S TIMER: THE "DUMB" COUNTDOWN ---
const updateTimer = () => {
  if (!product.value?.end_time) return;
  const diff = new Date(product.value.end_time).getTime() - Date.now();

  if (diff <= 0) {
    // FASE VALIDATING: Jika timer 0 tapi DB masih 'active', jangan bilang ENDED dulu.
    if (product.value.status === 'active') {
      timeLeft.value = "VALIDATING...";
    } else {
      timeLeft.value = "ENDED";
    }
    isIntense.value = false;
    return;
  }

  // Notif Intense
  if (diff <= 120000) {
    isIntense.value = true;
    if (!hasNotifiedIntense.value) { notify.error("WAR ZONE!", "2 Menit Terakhir!"); hasNotifiedIntense.value = true; }
  } else { isIntense.value = false; hasNotifiedIntense.value = false; }

  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  timeLeft.value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- FUNGSI BID (SERVER AUTHORITY) ---
const placeBid = async () => {
  if (!props.userProfile || isCooldown.value || product.value.status !== 'active') return;
  
  try {
    isSubmitting.value = true;
    const { data, error } = await supabase.rpc('execute_bid_v1', {
      p_product_id: product.value.id,
      p_user_id: props.userProfile.id,
      p_bid_amount: bidAmount.value
    });

    if (error) throw error;

    // Refresh lokal secepat kilat
    product.value.end_time = data.new_end_time;
    product.value.current_bid = data.new_bid;
    bidAmount.value = Number(data.new_bid) + 10000;
    
    notify.success("GACOR!", "Tawaran diterima server!");
    isCooldown.value = true;
    setTimeout(() => isCooldown.value = false, 2000);
    nextTick(() => updateTimer());

  } catch (err) {
    notify.error("Gagal", err.message);
    fetchBids();
  } finally { isSubmitting.value = false; }
};

const fetchBids = async () => {
  const { data } = await supabase.from("bids").select("*, profiles(*)").eq("product_id", route.params.id).order("amount", { ascending: false }).limit(50);
  if (data) recentBids.value = data;
};

onMounted(async () => {
  const { data } = await supabase.from("products").select("*, profiles!owner_id(*)").eq("id", route.params.id).single();
  product.value = data;
  loading.value = false;
  await fetchBids();
  bidAmount.value = (product.value.current_bid || product.value.starting_bid) + 10000;

  setInterval(updateTimer, 1000);

  // REALTIME SYNC (THE MASTER LISTENER)
  supabase.channel(`auc-${route.params.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `id=eq.${route.params.id}` }, (payload) => {
      product.value.status = payload.new.status;
      product.value.end_time = payload.new.end_time;
      product.value.current_bid = payload.new.current_bid;
      nextTick(() => updateTimer());
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `product_id=eq.${route.params.id}` }, () => {
      fetchBids();
    })
    .subscribe();
});

const formatPrice = (p) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(p || 0);
</script>

<template>
  <div v-if="product" class="bg-black min-h-screen text-white pb-32">
    <div class="fixed top-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <button @click="router.back()" class="p-2 hover:bg-white/10 rounded-xl transition-all"><ArrowLeftIcon class="w-6 h-6" /></button>
      <div class="text-center">
        <p class="text-[8px] font-black uppercase text-yellow-500 tracking-[0.4em] italic mb-0.5">Transmission</p>
        <h1 class="text-[10px] font-black uppercase tracking-widest italic">Live Auction Feed</h1>
      </div>
      <div class="w-10"></div>
    </div>

    <div class="lg:hidden fixed top-[64px] inset-x-0 z-[90] px-5 py-3">
      <div :class="isIntense ? 'bg-red-600 border-red-500' : 'bg-yellow-500 border-yellow-400'" class="rounded-2xl border-2 shadow-2xl flex items-center justify-between px-6 py-3 transition-all duration-500">
        <div class="flex items-center gap-2"><ClockIcon class="w-4 h-4 text-black animate-pulse" /><span class="text-[8px] font-black uppercase italic text-black">Status</span></div>
        <span class="text-xl font-[1000] italic text-black">{{ timeLeft }}</span>
      </div>
    </div>

    <div v-if="!loading" class="pt-24 px-5 max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div class="lg:col-span-7 space-y-10">
          <div class="relative w-full aspect-square lg:aspect-video rounded-[40px] overflow-hidden border border-white/10 bg-[#080808] shadow-2xl">
            <img :src="allImages[activeImgIndex]" class="w-full h-full object-cover lg:object-contain" />
            <div class="hidden lg:flex absolute bottom-6 left-6 backdrop-blur-md px-6 py-3 rounded-2xl border items-center gap-3" :class="isIntense ? 'bg-red-600 border-red-500' : 'bg-black/60 border-white/10'">
              <ClockIcon class="w-5 h-5 text-yellow-500" />
              <span class="text-xs font-[1000] italic uppercase">{{ timeLeft }}</span>
            </div>
          </div>

          <div class="hidden lg:block space-y-6">
            <div class="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit mb-6">
              <button @click="activeBidTab = 'ranking'" :class="activeBidTab === 'ranking' ? 'bg-yellow-500 text-black' : 'text-gray-500'" class="px-8 py-3 rounded-xl text-[10px] font-black uppercase italic">Ranking</button>
              <button @click="activeBidTab = 'history'" :class="activeBidTab === 'history' ? 'bg-white text-black' : 'text-gray-500'" class="px-8 py-3 rounded-xl text-[10px] font-black uppercase italic">History</button>
            </div>
            
            <div class="min-h-[400px]">
              <div v-if="activeBidTab === 'ranking'" class="space-y-4">
                <div v-for="(bid, idx) in rankedBids" :key="bid.id" @click="router.push(`/user/${bid.profiles?.username}`)" class="flex items-center justify-between p-6 rounded-[35px] border border-white/5 bg-white/[0.02] hover:border-yellow-500/30 transition-all cursor-pointer shadow-xl">
                  <div class="flex items-center gap-6">
                    <span class="w-8 text-center font-[1000] text-2xl" :class="idx < 3 ? 'text-yellow-500' : 'text-gray-700'">#{{ idx + 1 }}</span>
                    <div class="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
                      <img v-if="bid.profiles?.avatar_url" :src="bid.profiles.avatar_url" class="w-full h-full object-cover" />
                      <UserIcon v-else class="w-full h-full p-3 text-gray-500 bg-gray-800" />
                    </div>
                    <div><p class="text-base font-black italic uppercase">@{{ bid.profiles?.username }}</p><p class="text-[9px] text-gray-600 font-bold uppercase">{{ bid.profiles?.reputation }} REP</p></div>
                  </div>
                  <p class="text-2xl font-[1000] italic text-white">{{ formatPrice(bid.amount) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 space-y-8">
          <div class="space-y-4">
            <h2 class="text-4xl lg:text-7xl font-[1000] italic uppercase tracking-tighter leading-none">{{ product.name }}</h2>
            <div class="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-[30px] w-fit">
              <img v-if="product.profiles?.avatar_url" :src="product.profiles.avatar_url" class="w-12 h-12 rounded-2xl flex-shrink-0" />
              <UserCircleIcon v-else class="w-12 h-12 text-gray-700 flex-shrink-0" />
              <p class="text-sm font-black italic uppercase">@{{ product.profiles?.username }}</p>
            </div>
          </div>

          <div class="bg-[#0a0a0a] border border-white/10 rounded-[50px] p-10 shadow-2xl relative overflow-hidden">
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 italic">Hammer Price</p>
            <h3 class="text-4xl sm:text-5xl lg:text-6xl font-[1000] italic text-yellow-500 tracking-tighter mb-10 leading-none">
              {{ formatPrice(product.current_bid || product.starting_bid) }}
            </h3>
            
            <div class="space-y-6">
              <div v-if="product.status === 'active'" class="space-y-6">
                <div class="relative group">
                  <div class="flex gap-3 mb-5 overflow-x-auto no-scrollbar pb-2">
                    <button v-for="plus in [10000, 50000, 100000, 500000]" :key="plus" @click="bidAmount = (product.current_bid || product.starting_bid) + plus" class="flex-shrink-0 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-[10px] font-black italic text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all">+{{ plus/1000 }}K</button>
                  </div>
                  <input v-model.number="bidAmount" type="number" class="w-full bg-black border-2 border-white/10 rounded-[35px] py-8 px-10 text-4xl font-[1000] italic focus:border-yellow-500 text-white outline-none" />
                </div>
                <button @click="placeBid" :disabled="isSubmitting || isCooldown" :class="isOutbid ? 'bg-red-600 animate-pulse' : 'bg-yellow-500'" class="w-full text-black py-8 rounded-[40px] font-[1000] italic uppercase tracking-widest active:scale-95 shadow-2xl flex flex-col items-center">
                   <div class="flex items-center gap-3">
                     <ArrowPathIcon v-if="isSubmitting" class="w-7 h-7 animate-spin" />
                     <BanknotesIcon v-else class="w-7 h-7" />
                     <span class="text-2xl">{{ isOutbid ? 'RECLAIM POSITION!' : 'Execute Bid' }}</span>
                   </div>
                </button>
              </div>

              <div v-else class="space-y-6">
                <div v-if="isWinner" class="bg-green-500/10 border-2 border-green-500/30 rounded-[50px] p-10 text-center shadow-2xl">
                  <TrophyIcon class="w-20 h-20 text-green-500 mx-auto mb-6" />
                  <h2 class="text-3xl font-[1000] italic uppercase mb-8">Victory Achieved!</h2>
                  <button @click="showPaymentModal = true" class="w-full bg-green-500 text-black py-6 rounded-[30px] font-black italic uppercase text-xs">Pay to Escrow</button>
                </div>
                <div v-else class="bg-white/5 border border-white/10 p-12 rounded-[50px] text-center shadow-2xl">
                  <LockClosedIcon class="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <h4 class="text-xl font-[1000] italic text-gray-500 uppercase">Transmission Closed</h4>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white/[0.02] border border-white/5 rounded-[40px] p-9 text-justify shadow-xl">
            <p class="text-gray-400 text-base italic leading-relaxed">{{ product.description }}</p>
          </div>

          <div class="lg:hidden space-y-8 pt-12 border-t border-white/5 mt-10">
            <div class="flex p-1 bg-white/5 border border-white/10 rounded-2xl w-full mb-8">
              <button @click="activeBidTab = 'ranking'" :class="activeBidTab === 'ranking' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-500'" class="flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all">Ranking</button>
              <button @click="activeBidTab = 'history'" :class="activeBidTab === 'history' ? 'bg-white text-black shadow-lg' : 'text-gray-500'" class="flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all">History</button>
            </div>
            <div v-if="activeBidTab === 'ranking'" class="space-y-4">
              <div v-for="(bid, idx) in rankedBids" :key="bid.id" class="flex items-center justify-between p-6 rounded-3xl border border-white/5 bg-white/[0.02] shadow-xl" :class="idx === 0 ? 'border-yellow-500/20 bg-yellow-500/5' : ''">
                <div class="flex items-center gap-4">
                  <span class="font-[1000] italic text-base text-yellow-500 w-5">#{{ idx + 1 }}</span>
                  <div class="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0">
                    <img v-if="bid.profiles?.avatar_url" :src="bid.profiles.avatar_url" class="w-full h-full object-cover" />
                    <UserIcon v-else class="w-full h-full p-2 bg-gray-800 text-gray-600" />
                  </div>
                  <p class="text-sm font-black italic uppercase">@{{ bid.profiles?.username }}</p>
                </div>
                <p class="text-base font-[1000] italic">{{ formatPrice(bid.amount) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"] { -moz-appearance: textfield; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
