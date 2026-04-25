<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase.js";
import { notify } from "../utils/notify";
import {
  UserCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  UserPlusIcon,
  UserMinusIcon,
  ArrowLeftIcon,
  TagIcon,
  ArrowPathIcon,
  ClockIcon,
  ChevronRightIcon,
  StarIcon as StarIconOutline,
  ShieldCheckIcon,
  BoltIcon,
  FireIcon,
  TrophyIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ShoppingBagIcon,
  CheckBadgeIcon,
  InboxStackIcon
} from "@heroicons/vue/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/vue/24/solid";

const route = useRoute();
const router = useRouter();
const username = route.params.username;

const profile = ref(null);
const listings = ref([]); 
const soldItems = ref([]); 
const wonItems = ref([]); 
const archivedItems = ref([]); // Tambahan untuk Archive
const reviews = ref([]);
const loading = ref(true);
const isFollowing = ref(false);
const currentUser = ref(null);

const activeTab = ref("live");
const activeRecordTab = ref("sold"); // Sub-tab default untuk Records

const followersCount = ref(0);
const followingCount = ref(0);

const showReviewModal = ref(false);
const submittingReview = ref(false);
const newReview = ref({ rating: 5, comment: "" });

const showReportModal = ref(false);
const isSubmittingReport = ref(false);
const reportForm = ref({ category: "Lainnya", details: "" });

let bidSubscription = null;

const fetchData = async () => {
  if (!profile.value) loading.value = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser.value = session?.user;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (profileError) throw profileError;
    profile.value = profileData;

    const now = new Date().toISOString();

    const [liveRes, soldRes, wonRes, archRes, reviewsRes, followersRes, followingRes] =
      await Promise.all([
        // 1. LIVE
        supabase.from("products").select("*").eq("owner_id", profileData.id).eq("status", "active").gt("end_time", now).order("created_at", { ascending: false }),
        
        // 2. SOLD: Barang dia laku (Status closed & owner dia)
        supabase.from("products").select("*").eq("owner_id", profileData.id).eq("status", "closed").not("winner_id", "is", null).order("updated_at", { ascending: false }),
        
        // 3. BOUGHT: Barang dia beli (Winner dia)
        supabase.from("products").select("*").eq("winner_id", profileData.id).eq("status", "closed").order("updated_at", { ascending: false }),

        // 4. ARCHIVE: Barang dia yang sudah berakhir (Apapun statusnya yang penting sudah end_time)
        supabase.from("products").select("*").eq("owner_id", profileData.id).lt("end_time", now).order("end_time", { ascending: false }),
        
        // 5. REVIEWS & FOLLOWS
        supabase.from("reviews").select("*, reviewer:profiles!reviews_reviewer_id_fkey(username, avatar_url)").eq("target_user_id", profileData.id).order("created_at", { ascending: false }),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileData.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileData.id),
      ]);

    reviews.value = reviewsRes.data || [];
    soldItems.value = soldRes.data || [];
    wonItems.value = wonRes.data || [];
    archivedItems.value = archRes.data || [];
    followersCount.value = followersRes.count || 0;
    followingCount.value = followingRes.count || 0;

    const productsData = liveRes.data || [];
    if (productsData.length > 0) {
      const ProductsIds = productsData.map((p) => p.id);
      const { data: allBids } = await supabase.from("bids").select("product_id, amount").in("product_id", ProductsIds).order("amount", { ascending: false });
      listings.value = productsData.map((p) => {
        const highestBid = allBids?.find((b) => b.product_id === p.id);
        return {
          ...p,
          display_price: highestBid ? highestBid.amount : p.current_bid || p.starting_price || 0,
        };
      });
    } else {
      listings.value = [];
    }

    if (currentUser.value) {
      const { data: followData } = await supabase.from("follows").select("id").eq("follower_id", currentUser.value.id).eq("following_id", profileData.id).single();
      isFollowing.value = !!followData;
    }
  } catch (error) { console.error("Error:", error.message); }
  finally { loading.value = false; }
};

const averageRating = computed(() => {
  if (!reviews.value || reviews.value.length === 0) return "5.0";
  const sum = reviews.value.reduce((acc, curr) => acc + curr.rating, 0);
  let base = (sum / reviews.value.length).toFixed(1);
  if (profile.value?.reputation < 50) base = (Number(base) - 0.5).toFixed(1);
  return base;
});

const userRank = computed(() => {
  if (profile.value?.is_admin) return { name: "OWNER", color: "text-red-600", bg: "bg-red-600/10", icon: ShieldCheckIcon };
  const rep = profile.value?.reputation || 0;
  if (rep >= 500) return { name: "LEGEND", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: TrophyIcon };
  if (rep >= 200) return { name: "EXPERT", color: "text-red-500", bg: "bg-red-600/10", icon: FireIcon };
  return { name: "MEMBER", color: "text-blue-500", bg: "bg-blue-500/10", icon: ShieldCheckIcon };
});

const toggleFollow = async () => {
  if (!currentUser.value) return router.push("/login");
  try {
    if (isFollowing.value) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.value.id).eq("following_id", profile.value.id);
      followersCount.value--;
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.value.id, following_id: profile.value.id });
      const { data: checkBack } = await supabase.from("follows").select("id").eq("follower_id", profile.value.id).eq("following_id", currentUser.value.id).single();
      const isFB = !!checkBack;
      await supabase.from("notifications").insert({
        user_id: profile.value.id,
        title: isFB ? "Follow Back!" : "New Follower!",
        message: `@${currentUser.value.user_metadata.username || 'Seseorang'} ${isFB ? 'mengikuti balik Anda.' : 'mulai mengikuti Anda.'}`,
        type: "activity"
      });
      followersCount.value++;
    }
    isFollowing.value = !isFollowing.value;
  } catch (error) { notify.error("Action failed"); }
};

const submitReport = async () => {
  if (!currentUser.value) return router.push("/login");
  if (reportForm.value.details.length < 5) return notify.error("Need details");
  isSubmittingReport.value = true;
  try {
    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUser.value.id,
      target_user_id: profile.value.id,
      reason_category: reportForm.value.category,
      reason: reportForm.value.details,
      status: "pending",
    });
    if (error) throw error;
    notify.success("Report Transmission Sent");
    showReportModal.value = false;
    reportForm.value.details = "";
  } catch (e) { notify.error("Report failed"); }
  finally { isSubmittingReport.value = false; }
};

const submitReview = async () => {
  if (!newReview.value.comment.trim()) return notify.error("Log entry required");
  submittingReview.value = true;
  try {
    const { error } = await supabase.from("reviews").insert({ target_user_id: profile.value.id, reviewer_id: currentUser.value.id, rating: newReview.value.rating, comment: newReview.value.comment });
    if (error) throw error;
    notify.success("Transmission logged");
    showReviewModal.value = false;
    newReview.value = { rating: 5, comment: "" };
    fetchData();
  } catch (error) { notify.error("Sync failed"); }
  finally { submittingReview.value = false; }
};

watch(() => profile.value, (newVal) => {
  if (newVal && !bidSubscription) {
    bidSubscription = supabase.channel("public-profile-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, async () => { await fetchData(); }).subscribe();
  }
}, { immediate: true });

onMounted(fetchData);
onUnmounted(() => { if (bidSubscription) supabase.removeChannel(bidSubscription); });
</script>

<template>
  <div class="min-h-screen bg-black text-white font-sans uppercase italic font-[1000] pb-26">
    <div v-if="profile" class="relative">
      <div class="flex items-center justify-between px-6 py-6 border-b border-white/5 bg-black sticky top-0 z-50">
        <button @click="router.back()" class="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
        <p class="text-[10px] tracking-[0.3em] text-yellow-500 uppercase">Profile Transmission</p>
        <div class="w-10"></div>
      </div>

      <div class="max-w-2xl mx-auto px-6 pt-12 flex flex-col items-center">
        <div class="w-32 h-32 rounded-full border-4 border-black overflow-hidden shadow-2xl mb-6 bg-black relative z-10">
          <img :src="profile.avatar_url || 'https://via.placeholder.com/150'" class="w-full h-full object-cover" />
        </div>

        <h1 class="text-3xl tracking-tighter mb-1">{{ profile.full_name }}</h1>
        <p class="text-[10px] text-yellow-500/50 tracking-[0.4em] mb-6">@{{ profile.username }}</p>

        <div class="flex items-center gap-6 mb-8 text-[10px] tracking-[0.2em] text-gray-500">
          <div class="text-center"><p class="text-white text-lg mb-0.5">{{ followersCount }}</p><p>FOLLOWERS</p></div>
          <div class="w-px h-8 bg-white/10"></div>
          <div class="text-center"><p class="text-white text-lg mb-0.5">{{ followingCount }}</p><p>FOLLOWING</p></div>
          <div class="w-px h-8 bg-white/10"></div>
          <div class="text-center"><p class="text-white text-lg mb-0.5">{{ profile.reputation || 0 }}</p><p>REPUTATION</p></div>
        </div>

        <div class="flex items-center gap-3 w-full max-w-sm mb-6">
          <button @click="toggleFollow" :class="isFollowing ? 'bg-white/5 text-white border-white/10' : 'bg-yellow-500 text-black'" class="flex-[3] py-4 rounded-2xl text-[10px] tracking-widest border transition-all active:scale-95">
            {{ isFollowing ? "UNFOLLOW" : "FOLLOW" }}
          </button>
          <button @click="router.push(`/messages/${profile.id}`)" class="flex-1 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
            <ChatBubbleLeftEllipsisIcon class="w-5 h-5 text-yellow-500" />
          </button>
          <button v-if="currentUser && currentUser.id !== profile.id" @click="showReportModal = true" class="flex-1 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
            <ExclamationTriangleIcon class="w-5 h-5" />
          </button>
        </div>

        <button v-if="currentUser?.id === profile.id" @click="router.push('/profile')" class="text-[9px] text-gray-500 border border-white/10 px-6 py-2 rounded-xl mb-8 hover:bg-white/5 transition-all">
          MODIFIKASI PROFIL SAYA
        </button>

        <p class="text-center text-[11px] leading-relaxed text-gray-400 max-w-sm mb-8 normal-case italic">
          {{ profile.bio || "NO BIOGRAPHICAL DATA TRANSMITTED." }}
        </p>

        <div class="flex items-center gap-4 mb-3">
          <div :class="[userRank.bg, userRank.color]" class="px-6 py-2 rounded-full border border-white/5 text-[10px] flex items-center gap-2">
            <component :is="userRank.icon" class="w-4 h-4" />
            <span>{{ userRank.name }}</span>
          </div>
          <div class="flex items-center gap-1.5 text-yellow-500/80">
            <StarIconSolid class="w-3.5 h-3.5" />
            <span class="text-[11px] font-[1000] tracking-widest italic">{{ averageRating }}/5.0</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="profile" class="max-w-2xl mx-auto px-6 mt-12">
      <div class="flex border-b border-white/5 mb-8 bg-black sticky top-16 z-40">
        <button v-for="tab in ['live', 'records', 'reviews']" :key="tab" @click="activeTab = tab" 
          :class="activeTab === tab ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-600'" 
          class="flex-1 py-4 text-[10px] tracking-[0.3em] font-black uppercase italic">
          {{ tab }}
        </button>
      </div>

      <div v-if="activeTab === 'live'" class="grid grid-cols-2 gap-4">
        <div v-for="item in listings" :key="item.id" @click="router.push(`/product/${item.id}`)" class="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden aspect-square relative group cursor-pointer">
          <img :src="item.image_url" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
          <div v-if="item.is_priority" class="absolute top-2 right-2 bg-yellow-500 p-1.5 rounded-full shadow-xl border-2 border-black z-10"><StarIconSolid class="w-2.5 h-2.5 text-black" /></div>
          <div class="absolute bottom-4 left-4 right-4"><p class="text-[10px] truncate mb-1 text-white">{{ item.name }}</p><p class="text-yellow-500 text-xs font-black italic">IDR {{ item.display_price?.toLocaleString() }}</p></div>
        </div>
        <div v-if="listings.length === 0" class="col-span-2 py-20 text-center opacity-20"><ArchiveBoxIcon class="w-12 h-12 mx-auto mb-4" /><p class="text-[8px] tracking-[0.5em]">NO LIVE TRANSMISSIONS</p></div>
      </div>

      <div v-if="activeTab === 'records'" class="space-y-6">
        <div class="flex gap-2 p-1 bg-white/[0.03] border border-white/5 rounded-2xl">
          <button v-for="sub in [{id:'sold', name:'SOLD'}, {id:'bought', name:'BOUGHT'}, {id:'archived', name:'ARCHIVE'}]" :key="sub.id"
            @click="activeRecordTab = sub.id"
            :class="activeRecordTab === sub.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-600'"
            class="flex-1 py-2.5 rounded-xl text-[8px] font-black tracking-widest transition-all italic">
            {{ sub.name }}
          </button>
        </div>

        <div v-if="activeRecordTab === 'sold'" class="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
          <div v-for="item in soldItems" :key="item.id" class="bg-white/5 border border-white/5 rounded-3xl p-3 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            <img :src="item.image_url" class="w-full h-24 object-cover rounded-2xl mb-3" />
            <p class="text-[9px] truncate font-black italic">{{ item.name }}</p>
          </div>
          <div v-if="soldItems.length === 0" class="col-span-2 py-20 text-center opacity-10 text-[8px] tracking-widest uppercase italic">Empty Vault</div>
        </div>

        <div v-if="activeRecordTab === 'bought'" class="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
          <div v-for="item in wonItems" :key="item.id" class="bg-white/5 border border-white/5 rounded-3xl p-3 relative opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            <img :src="item.image_url" class="w-full h-24 object-cover rounded-2xl mb-3" />
            <p class="text-[9px] truncate font-black italic">{{ item.name }}</p>
            <CheckBadgeIcon class="absolute top-2 right-2 w-5 h-5 text-green-500 drop-shadow-lg" />
          </div>
          <div v-if="wonItems.length === 0" class="col-span-2 py-20 text-center opacity-10 text-[8px] tracking-widest uppercase italic">No Victories Recorded</div>
        </div>

        <div v-if="activeRecordTab === 'archived'" class="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
          <div v-for="item in archivedItems" :key="item.id" class="bg-white/5 border border-white/5 rounded-3xl p-3 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all flex flex-col">
            <img :src="item.image_url" class="w-full h-24 object-cover rounded-2xl mb-3" />
            <div class="flex justify-between items-center">
              <p class="text-[9px] truncate font-black italic flex-1">{{ item.name }}</p>
              <span class="text-[7px] text-gray-500 ml-2">ENDED</span>
            </div>
          </div>
          <div v-if="archivedItems.length === 0" class="col-span-2 py-20 text-center opacity-10 text-[8px] tracking-widest uppercase italic">No Archive History</div>
        </div>
      </div>

      <div v-if="activeTab === 'reviews'" class="space-y-4">
        <div v-for="review in reviews" :key="review.id" class="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <img :src="review.reviewer?.avatar_url" class="w-8 h-8 rounded-full border border-white/10" />
              <div><p class="text-[10px] text-white">@{{ review.reviewer?.username }}</p><div class="flex gap-0.5 mt-1"><StarIconSolid v-for="i in 5" :key="i" :class="i <= review.rating ? 'text-yellow-500' : 'text-gray-900'" class="w-2.5 h-2.5" /></div></div>
            </div>
            <span class="text-[8px] text-gray-700 italic font-black uppercase">{{ new Date(review.created_at).toLocaleDateString() }}</span>
          </div>
          <p class="text-[11px] leading-relaxed text-gray-400 normal-case italic font-bold">"{{ review.comment }}"</p>
        </div>
        <button v-if="currentUser && currentUser.id !== profile.id" @click="showReviewModal = true" class="w-full py-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] tracking-widest text-gray-500 hover:text-yellow-500 mb-10 italic font-black">
          + LOG NEW OBSERVATION
        </button>
      </div>
    </div>

    <div v-if="showReportModal" class="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/95 backdrop-blur-lg" @click="showReportModal = false"></div>
      <div class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-10 shadow-2xl">
        <div class="text-center mb-8"><div class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20"><ExclamationTriangleIcon class="w-8 h-8 text-red-500" /></div><h3 class="text-xl font-black italic uppercase text-white">Report Profil</h3></div>
        <div class="space-y-6">
          <textarea v-model="reportForm.details" rows="4" placeholder="Alasan pelaporan..." class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs text-white outline-none focus:border-red-500 italic font-bold"></textarea>
          <div class="flex gap-3">
            <button @click="showReportModal = false" class="flex-1 py-5 bg-white/5 rounded-3xl text-[10px] font-black italic uppercase">CANCEL</button>
            <button @click="submitReport" :disabled="isSubmittingReport" class="flex-[2] bg-red-600 text-white py-5 rounded-3xl font-black text-[10px] italic uppercase">{{ isSubmittingReport ? "TRANSMITTING..." : "CONFIRM REPORT" }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showReviewModal" class="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/95 backdrop-blur-lg" @click="showReviewModal = false"></div>
      <div class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-10 shadow-2xl">
        <div class="text-center mb-8"><h3 class="text-xl font-black italic uppercase text-white">Log Observation</h3></div>
        <div class="space-y-6">
          <div class="flex justify-center gap-2"><StarIconSolid v-for="i in 5" :key="i" @click="newReview.rating = i" :class="i <= newReview.rating ? 'text-yellow-500' : 'text-gray-800'" class="w-8 h-8 cursor-pointer" /></div>
          <textarea v-model="newReview.comment" rows="4" placeholder="Describe quality..." class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs text-white outline-none focus:border-yellow-500 italic font-bold"></textarea>
          <button @click="submitReview" :disabled="submittingReview" class="w-full bg-yellow-500 text-black py-5 rounded-3xl font-black text-[10px] italic uppercase">{{ submittingReview ? "SYNCING..." : "CONFIRM LOG" }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
