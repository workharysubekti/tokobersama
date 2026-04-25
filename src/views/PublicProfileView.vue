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
} from "@heroicons/vue/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/vue/24/solid";

const route = useRoute();
const router = useRouter();
const username = route.params.username;

const profile = ref(null);
const listings = ref([]);
const reviews = ref([]);
const loading = ref(true);
const isFollowing = ref(false);
const currentUser = ref(null);
const activeTab = ref("transmissions");

const followersCount = ref(0);
const followingCount = ref(0);

const showReviewModal = ref(false);
const submittingReview = ref(false);
const newReview = ref({ rating: 5, comment: "" });

// Real-time currency bid
const higherBids = ref([]);
let bidSubscription = null;

// FUNGSI FETCH DATA (FIX FOLLOWERS & REPUTASI)
const fetchData = async () => {
  if (!profile.value) loading.value = true;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    currentUser.value = session?.user;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (profileError) throw profileError;
    profile.value = profileData;

    // Ambil semua data pendukung secara Paralel (Followers, Following, Reviews, Products)
    const [productsRes, reviewsRes, followersRes, followingRes] =
      await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("owner_id", profileData.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select(
            "*, reviewer:profiles!reviews_reviewer_id_fkey(username, avatar_url)",
          )
          .eq("target_user_id", profileData.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", profileData.id),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", profileData.id),
      ]);

    // Set Data Reputasi & Social (Agar tidak 0/NaN)
    reviews.value = reviewsRes.data || [];
    followersCount.value = followersRes.count || 0;
    followingCount.value = followingRes.count || 0;

    // Logika Real-time Bid untuk Listings
    const productsData = productsRes.data || [];
    if (productsData.length > 0) {
      const ProductsIds = productsData.map((p) => p.id);
      const { data: allBids } = await supabase
        .from("bids")
        .select("product_id, amount")
        .in("product_id", ProductsIds)
        .order("amount", { ascending: false });

      listings.value = productsData.map((p) => {
        const highestBid = allBids?.find((b) => b.product_id === p.id);
        return {
          ...p,
          display_price: highestBid
            ? highestBid.amount
            : p.current_bid || p.starting_price || 0,
        };
      });
    } else {
      listings.value = [];
    }

    if (currentUser.value) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", profileData.id)
        .single();
      isFollowing.value = !!followData;
    }
  } catch (error) {
    console.error("Error fetching profile:", error.message);
  } finally {
    loading.value = false;
  }
};

const fetchHigherBids = async () => {
  if (!profile.value?.id) return;
  const { data, error } = await supabase
    .from("bids")
    .select("*, products(name, end_time)")
    .eq("user_id", profile.value.id)
    .order("created_at", { ascending: false });
  if (!error) higherBids.value = data;
};

// --- LOGIKA REPUTASI ---
const averageRating = computed(() => {
  if (!reviews.value || reviews.value.length === 0) return "5.0";
  const sum = reviews.value.reduce((acc, curr) => acc + curr.rating, 0);
  return (sum / reviews.value.length).toFixed(1);
});

// --- LOGIKA RANK BADGE (KODE SUCI) ---
const OWNER_ID = "68f80a52-d38c-4ac4-b483-8386026f436c";
const userRank = computed(() => {
  if (profile.value?.id === OWNER_ID)
    return {
      name: "OWNER",
      color: "text-red-600",
      bg: "bg-red-600/10",
      icon: ShieldCheckIcon,
    };
  const count = followersCount.value;
  if (count >= 100)
    return {
      name: "LEGEND",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      icon: TrophyIcon,
    };
  if (count >= 30)
    return {
      name: "EXPERT",
      color: "text-red-500",
      bg: "bg-red-500/10",
      icon: FireIcon,
    };
  if (count >= 10)
    return {
      name: "INTERMEDIATE",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      icon: BoltIcon,
    };
  return {
    name: "NEWBIE",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: ShieldCheckIcon,
  };
});

const toggleFollow = async () => {
  if (!currentUser.value) return router.push("/login");
  try {
    if (isFollowing.value) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", profile.value.id);
      followersCount.value--;
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUser.value.id,
        following_id: profile.value.id,
      });
      followersCount.value++;
    }
    isFollowing.value = !isFollowing.value;
  } catch (error) {
    notify.error("Action failed");
  }
};

const submitReview = async () => {
  if (!newReview.value.comment.trim())
    return notify.error("Log entry required");
  submittingReview.value = true;
  try {
    const { error } = await supabase.from("reviews").insert({
      target_user_id: profile.value.id,
      reviewer_id: currentUser.value.id,
      rating: newReview.value.rating,
      comment: newReview.value.comment,
    });
    if (error) throw error;
    notify.success("Transmission logged");
    showReviewModal.value = false;
    newReview.value = { rating: 5, comment: "" };
    fetchData();
  } catch (error) {
    notify.error("Sync failed");
  } finally {
    submittingReview.value = false;
  }
};

// --- REAL-TIME MONITORING ---
watch(
  () => profile.value,
  (newVal) => {
    if (newVal && !bidSubscription) {
      bidSubscription = supabase
        .channel("public-profile-live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids" },
          async (payload) => {
            console.log("New Bid Detected, Refreshing Listings...");
            await fetchData();
            await fetchHigherBids();
          },
        )
        .subscribe();
    }
  },
  { immediate: true },
);

onMounted(() => {
  fetchData();
});

onUnmounted(() => {
  if (bidSubscription) supabase.removeChannel(bidSubscription);
});
</script>

<template>
  <div
    class="min-h-screen bg-black text-white font-sans uppercase italic font-[1000] pb-26"
  >
    <div v-if="profile" class="relative">
      <div
        class="h-48 bg-gradient-to-b from-yellow-500/10 to-transparent"
      ></div>
      <div class="max-w-2xl mx-auto px-6 -mt-24 flex flex-col items-center">
        <div
          class="w-32 h-32 rounded-full border-4 border-black overflow-hidden shadow-2xl mb-6 bg-black"
        >
          <img
            :src="profile.avatar_url || 'https://via.placeholder.com/150'"
            class="w-full h-full object-cover"
          />
        </div>
        <h1 class="text-3xl tracking-tighter mb-1">{{ profile.full_name }}</h1>
        <p class="text-[10px] text-yellow-500/50 tracking-[0.4em] mb-6">
          @{{ profile.username }}
        </p>

        <div
          class="flex items-center gap-6 mb-8 text-[10px] tracking-[0.2em] text-gray-500"
        >
          <div class="text-center">
            <p class="text-white text-lg mb-0.5">{{ followersCount }}</p>
            <p>FOLLOWERS</p>
          </div>
          <div class="w-px h-8 bg-white/10"></div>
          <div class="text-center">
            <p class="text-white text-lg mb-0.5">{{ followingCount }}</p>
            <p>FOLLOWING</p>
          </div>
        </div>

        <div class="flex gap-3 w-full max-w-xs mb-10">
          <button
            @click="toggleFollow"
            :class="
              isFollowing
                ? 'bg-white/5 text-white border-white/10'
                : 'bg-yellow-500 text-black'
            "
            class="flex-1 py-4 rounded-2xl text-[10px] tracking-widest border transition-all active:scale-95 font-[1000]"
          >
            {{ isFollowing ? "UNFOLLOW" : "FOLLOW" }}
          </button>
          <button
            @click="router.push(`/messages/${profile.id}`)"
            class="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
          >
            <ChatBubbleLeftEllipsisIcon class="w-5 h-5 text-yellow-500" />
          </button>
        </div>

        <p
          class="text-center text-[11px] leading-relaxed text-gray-400 max-w-sm mb-8 normal-case"
        >
          {{ profile.bio || "NO BIOGRAPHICAL DATA TRANSMITTED." }}
        </p>

        <div
          :class="[userRank.bg, userRank.color]"
          class="px-6 py-2 rounded-full border border-white/5 text-[10px] flex items-center gap-2 mb-3"
        >
          <component :is="userRank.icon" class="w-4 h-4" />
          <span>{{ userRank.name }}</span>
        </div>

        <div class="flex items-center gap-1.5 text-yellow-500/80">
          <StarIconSolid class="w-3.5 h-3.5" />
          <span class="text-[11px] font-[1000] tracking-widest italic"
            >{{ averageRating }}/5.0</span
          >
        </div>
      </div>
    </div>

    <div v-if="profile" class="max-w-2xl mx-auto px-6 mt-12">
      <div class="flex border-b border-white/5 mb-8">
        <button
          v-for="tab in ['transmissions', 'observations']"
          :key="tab"
          @click="activeTab = tab"
          :class="
            activeTab === tab
              ? 'text-yellow-500 border-b-2 border-yellow-500'
              : 'text-gray-600'
          "
          class="flex-1 py-4 text-[10px] tracking-[0.3em] font-black uppercase transition-all"
        >
          {{ tab }}
        </button>
      </div>

      <div v-if="activeTab === 'transmissions'" class="grid grid-cols-2 gap-4">
        <div
          v-for="item in listings"
          :key="item.id"
          @click="router.push(`/product/${item.id}`)"
          class="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden aspect-square relative group cursor-pointer"
        >
          <img
            :src="item.image_url"
            class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all"
          />
          <div class="absolute bottom-4 left-4 right-4">
            <p class="text-[10px] truncate mb-1">{{ item.name }}</p>
            <p class="text-yellow-500 text-xs">
              IDR {{ item.display_price?.toLocaleString() }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'observations'" class="space-y-4">
        <div
          v-for="review in reviews"
          :key="review.id"
          class="bg-white/[0.02] border border-white/5 rounded-3xl p-6"
        >
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <img
                :src="review.reviewer?.avatar_url"
                class="w-8 h-8 rounded-full border border-white/10"
              />
              <div>
                <p class="text-[10px] text-white">
                  @{{ review.reviewer?.username }}
                </p>
                <div class="flex gap-0.5 mt-1">
                  <StarIconSolid
                    v-for="i in 5"
                    :key="i"
                    :class="
                      i <= review.rating ? 'text-yellow-500' : 'text-gray-900'
                    "
                    class="w-2.5 h-2.5"
                  />
                </div>
              </div>
            </div>
            <span class="text-[8px] text-gray-700">{{
              new Date(review.created_at).toLocaleDateString()
            }}</span>
          </div>
          <p
            class="text-[11px] leading-relaxed text-gray-400 normal-case italic"
          >
            {{ review.comment }}
          </p>
        </div>
        <button
          v-if="currentUser && currentUser.id !== profile.id"
          @click="showReviewModal = true"
          class="w-full py-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] tracking-widest text-gray-500 hover:text-yellow-500 transition-all mb-6"
        >
          + LOG NEW OBSERVATION
        </button>
      </div>
    </div>
  </div>
</template>
