<script setup>
import { ref, onMounted, computed } from "vue";
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

// --- TAMBAHAN LOGIKA REPUTASI REAL TIME ---
const averageRating = computed(() => {
  if (!reviews.value || reviews.value.length === 0) return "5.0";
  const sum = reviews.value.reduce((acc, curr) => acc + curr.rating, 0);
  return (sum / reviews.value.length).toFixed(1);
});

// --- LOGIKA RANK BADGE + OWNER (KODE SUCI) ---
const OWNER_ID = "68f80a52-d38c-4ac4-b483-8386026f436c";
const userRank = computed(() => {
  if (profile.value?.id === OWNER_ID) {
    return {
      name: "OWNER",
      color: "text-red-600",
      bg: "bg-red-600/10",
      icon: ShieldCheckIcon,
    };
  }
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

const fetchData = async () => {
  loading.value = true;
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

    const [listingsRes, reviewsRes, followersRes, followingRes] =
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

    listings.value = listingsRes.data || [];
    reviews.value = reviewsRes.data || [];
    followersCount.value = followersRes.count || 0;
    followingCount.value = followingRes.count || 0;

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
    notify.error("Member data not found");
  } finally {
    loading.value = false;
  }
};

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
      await supabase
        .from("follows")
        .insert({
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

onMounted(fetchData);
</script>

<template>
  <div
    class="min-h-screen bg-black text-white font-sans uppercase italic font-[1000] pb-24"
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
              IDR {{ item.current_bid.toLocaleString() }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'observations'" class="space-y-4">
        <button
          v-if="currentUser && currentUser.id !== profile.id"
          @click="showReviewModal = true"
          class="w-full py-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] tracking-widest text-gray-500 hover:text-yellow-500 transition-all mb-6"
        >
          + LOG NEW OBSERVATION
        </button>

        <div
          v-for="review in reviews"
          :key="review.id"
          class="bg-white/[0.02] border border-white/5 rounded-3xl p-6"
        >
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <img
                :src="review.reviewer.avatar_url"
                class="w-8 h-8 rounded-full border border-white/10"
              />
              <div>
                <p class="text-[10px] text-white">
                  @{{ review.reviewer.username }}
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
      </div>
    </div>

    <div
      v-if="showReviewModal"
      class="fixed inset-0 z-[200] flex items-center justify-center px-6"
    >
      <div
        class="absolute inset-0 bg-black/90 backdrop-blur-sm"
        @click="showReviewModal = false"
      ></div>
      <div
        class="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-[40px] p-10 relative z-10 shadow-2xl"
      >
        <div class="text-center mb-10">
          <h3 class="text-xl tracking-tighter mb-2">LOG OBSERVATION</h3>
          <p class="text-[9px] text-gray-600 tracking-[0.3em]">
            MEMBER REPUTASI SYNC
          </p>
        </div>

        <div class="flex justify-center gap-3 mb-12">
          <button
            v-for="i in 5"
            :key="i"
            @click="newReview.rating = i"
            class="transition-all active:scale-90 p-1"
          >
            <StarIconSolid
              class="w-10 h-10"
              :class="
                i <= newReview.rating
                  ? 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]'
                  : 'text-gray-900'
              "
            />
          </button>
        </div>

        <textarea
          v-model="newReview.comment"
          placeholder="Log your observations here..."
          class="w-full bg-black border border-white/5 rounded-3xl p-6 text-xs outline-none focus:border-yellow-500/50 italic font-bold normal-case text-white mb-10 resize-none"
          rows="4"
        ></textarea>

        <button
          @click="submitReview"
          :disabled="submittingReview"
          class="w-full py-6 bg-yellow-500 text-black rounded-[28px] text-[11px] tracking-[0.3em] font-[1000] uppercase italic active:scale-95 transition-all"
        >
          {{ submittingReview ? "SYNCING..." : "CONFIRM LOG" }}
        </button>
      </div>
    </div>
  </div>
</template>
