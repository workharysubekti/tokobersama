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

// Modal Review State
const showReviewModal = ref(false);
const submittingReview = ref(false);
const newReview = ref({ rating: 5, comment: "" });

// --- LOGIKA RANK BADGE + OWNER (KODE SUCI) ---
const userRank = computed(() => {
  const ADMIN_ID = "68f80a52-d38c-4ac4-b483-8386026f436c"; // GANTI DENGAN UUID ADMIN MAS

  if (profile.value?.id === ADMIN_ID) {
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

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    if (!profileData) return router.push("/");
    profile.value = profileData;

    const [follRes, followingRes, checkRes, prodRes, revRes] =
      await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", profileData.id),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", profileData.id),
        currentUser.value
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", currentUser.value.id)
              .eq("following_id", profileData.id)
              .maybeSingle()
          : { data: null },
        supabase
          .from("products")
          .select("*")
          .eq("owner_id", profileData.id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select(
            `*, reviewer:profiles!reviewer_id (username, avatar_url, full_name)`,
          )
          .eq("target_user_id", profileData.id)
          .order("created_at", { ascending: false }),
      ]);

    followersCount.value = follRes.count || 0;
    followingCount.value = followingRes.count || 0;
    isFollowing.value = !!checkRes.data;
    listings.value = prodRes.data || [];
    reviews.value = revRes.data || [];
  } finally {
    loading.value = false;
  }
};

const handleFollow = async () => {
  if (!currentUser.value) return notify.info("Denied", "Login dulu Mas.");
  if (isFollowing.value) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUser.value.id)
      .eq("following_id", profile.value.id);
    isFollowing.value = false;
    followersCount.value--;
  } else {
    await supabase
      .from("follows")
      .insert({
        follower_id: currentUser.value.id,
        following_id: profile.value.id,
      });
    isFollowing.value = true;
    followersCount.value++;
  }
};

const submitReview = async () => {
  if (!newReview.value.comment)
    return notify.error("Empty", "Isi pengamatan Mas.");
  submittingReview.value = true;
  try {
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: currentUser.value.id,
      target_user_id: profile.value.id,
      rating: newReview.value.rating,
      comment: newReview.value.comment,
    });
    if (!error) {
      notify.success("Paten", "Review berhasil dikirim.");
      showReviewModal.value = false;
      fetchData(); // Refresh data
    }
  } finally {
    submittingReview.value = false;
  }
};

const formatPrice = (p) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(p || 0);
onMounted(fetchData);
</script>

<template>
  <div
    class="min-h-screen bg-[#050505] pt-24 pb-32 px-6 text-white font-sans uppercase italic font-[1000]"
  >
    <div v-if="loading" class="flex justify-center py-48">
      <ArrowPathIcon class="w-12 h-12 text-yellow-500 animate-spin" />
    </div>
    <div v-else-if="profile" class="max-w-4xl mx-auto">
      <div
        class="bg-gray-900/20 border border-white/5 rounded-[48px] p-10 mb-10 backdrop-blur-3xl relative"
      >
        <div class="flex flex-col md:flex-row items-center gap-10">
          <div class="relative">
            <div
              class="w-32 h-32 rounded-full border-4 border-white/5 overflow-hidden"
            >
              <img
                :src="profile.avatar_url"
                class="w-full h-full object-cover"
              />
            </div>
            <div
              :class="[userRank.bg, userRank.color]"
              class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full border border-white/10 text-[9px] flex items-center gap-2 whitespace-nowrap"
            >
              <component :is="userRank.icon" class="w-3 h-3" />
              {{ userRank.name }}
            </div>
          </div>
          <div class="flex-1 text-center md:text-left">
            <h1 class="text-4xl tracking-tighter mb-1">
              {{ profile.full_name || profile.username }}
            </h1>
            <p class="text-xs text-yellow-500/50 tracking-[0.3em] mb-6">
              @{{ profile.username }}
            </p>
            <div class="flex justify-center md:justify-start gap-4 mb-8">
              <div
                class="bg-black/40 border border-white/5 px-6 py-3 rounded-2xl text-center min-w-[90px]"
              >
                <span class="block text-xl text-yellow-500">{{
                  followersCount
                }}</span>
                <span class="text-[7px] text-gray-500 tracking-widest"
                  >Followers</span
                >
              </div>
              <div
                class="bg-black/40 border border-white/5 px-6 py-3 rounded-2xl text-center min-w-[90px]"
              >
                <span class="block text-xl text-white">{{
                  followingCount
                }}</span>
                <span class="text-[7px] text-gray-500 tracking-widest"
                  >Following</span
                >
              </div>
            </div>
            <div
              v-if="currentUser?.id !== profile.id"
              class="flex gap-2 justify-center md:justify-start"
            >
              <button
                @click="handleFollow"
                :class="
                  isFollowing
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-yellow-500 text-black'
                "
                class="px-8 py-3 rounded-2xl text-[9px] transition-all"
              >
                {{ isFollowing ? "Unfollow" : "Follow" }}
              </button>
              <button
                @click="router.push(`/messages/${profile.id}`)"
                class="p-3 bg-white/5 border border-white/10 rounded-2xl"
              >
                <ChatBubbleLeftEllipsisIcon class="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-8 mb-10 border-b border-white/5">
        <button
          @click="activeTab = 'transmissions'"
          :class="
            activeTab === 'transmissions'
              ? 'text-yellow-500 border-b-2 border-yellow-500'
              : 'text-gray-600'
          "
          class="pb-5 text-[10px] tracking-widest"
        >
          Items ({{ listings.length }})
        </button>
        <button
          @click="activeTab = 'reviews'"
          :class="
            activeTab === 'reviews'
              ? 'text-yellow-500 border-b-2 border-yellow-500'
              : 'text-gray-600'
          "
          class="pb-5 text-[10px] tracking-widest"
        >
          Reputation ({{ reviews.length }})
        </button>
      </div>

      <div v-if="activeTab === 'transmissions'" class="grid gap-4">
        <div
          v-for="p in listings"
          :key="p.id"
          @click="router.push(`/product/${p.id}`)"
          class="group flex items-center bg-white/[0.02] border border-white/5 rounded-3xl p-3 cursor-pointer"
        >
          <div class="w-20 h-20 rounded-2xl overflow-hidden">
            <img :src="p.image_url" class="w-full h-full object-cover" />
          </div>
          <div class="ml-6 flex-1">
            <h3 class="text-xs group-hover:text-yellow-500">{{ p.name }}</h3>
          </div>
          <div class="text-right font-black text-yellow-500">
            {{ formatPrice(p.current_bid) }}
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'reviews'" class="space-y-6">
        <div v-if="currentUser && currentUser.id !== profile.id" class="mb-10">
          <button
            @click="showReviewModal = true"
            class="w-full py-5 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-[32px] text-[10px] tracking-[0.4em] hover:border-yellow-500/50 transition-all"
          >
            Submit Reputation Report
          </button>
        </div>

        <div v-if="reviews.length > 0" class="space-y-4">
          <div
            v-for="rev in reviews"
            :key="rev.id"
            class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full overflow-hidden border border-white/10"
                >
                  <img
                    :src="rev.reviewer.avatar_url"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p class="text-[9px] text-white">
                    @{{ rev.reviewer.username }}
                  </p>
                  <div class="flex gap-0.5 mt-1">
                    <StarIconSolid
                      v-for="i in 5"
                      :key="i"
                      class="w-2.5 h-2.5"
                      :class="
                        i <= rev.rating ? 'text-yellow-500' : 'text-gray-800'
                      "
                    />
                  </div>
                </div>
              </div>
              <span class="text-[7px] text-gray-700">{{
                new Date(rev.created_at).toLocaleDateString()
              }}</span>
            </div>
            <p class="text-[11px] text-gray-400 normal-case font-bold italic">
              "{{ rev.comment }}"
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="showReviewModal"
        class="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80"
      >
        <div
          class="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[48px] p-10 relative shadow-2xl"
        >
          <button
            @click="showReviewModal = false"
            class="absolute top-8 right-8 text-gray-500 hover:text-white"
          >
            <XMarkIcon class="w-6 h-6" />
          </button>
          <h2 class="text-2xl mb-10 tracking-tighter uppercase italic">
            Reputation Report
          </h2>

          <div class="mb-8">
            <label class="text-[9px] text-gray-600 block mb-4 tracking-widest"
              >RATING LEVEL</label
            >
            <div class="flex gap-2">
              <button
                v-for="i in 5"
                :key="i"
                @click="newReview.rating = i"
                class="transition-all active:scale-90"
              >
                <StarIconSolid
                  class="w-8 h-8"
                  :class="
                    i <= newReview.rating ? 'text-yellow-500' : 'text-gray-900'
                  "
                />
              </button>
            </div>
          </div>

          <div class="mb-10">
            <label class="text-[9px] text-gray-600 block mb-4 tracking-widest"
              >OBSERVATIONS</label
            >
            <textarea
              v-model="newReview.comment"
              placeholder="Describe member activity..."
              class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs outline-none focus:border-yellow-500 italic font-bold normal-case text-white"
              rows="4"
            ></textarea>
          </div>

          <button
            @click="submitReview"
            :disabled="submittingReview"
            class="w-full py-5 bg-yellow-500 text-black rounded-3xl text-[10px] tracking-widest font-black uppercase"
          >
            {{ submittingReview ? "Syncing..." : "Transmit Report" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
