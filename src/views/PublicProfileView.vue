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

// --- LOGIKA RANK BADGE + OWNER (KODE SUCI) ---
const userRank = computed(() => {
  const ADMIN_ID = "68f80a52-d38c-4ac4-b483-8386026f436c";

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
  try {
    if (isFollowing.value) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", profile.value.id);
      isFollowing.value = false;
      followersCount.value--;
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUser.value.id,
        following_id: profile.value.id,
      });
      isFollowing.value = true;
      followersCount.value++;
    }
  } catch (e) {
    console.error(e);
  }
};

const submitReview = async () => {
  if (!newReview.value.comment) return notify.error("Empty", "Isi pesan Mas.");
  submittingReview.value = true;
  try {
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: currentUser.value.id,
      target_user_id: profile.value.id,
      rating: newReview.value.rating,
      comment: newReview.value.comment,
    });
    if (!error) {
      showReviewModal.value = false;
      newReview.value.comment = "";
      fetchData();
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

// Navigator buat klik reviewer
const goToProfile = (uname) => {
  if (uname === username) return;
  router.push(`/user/${uname}`);
};

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
              class="w-36 h-36 rounded-full border-4 border-white/5 overflow-hidden shadow-2xl bg-black"
            >
              <img
                :src="profile.avatar_url"
                class="w-full h-full object-cover"
              />
            </div>
            <div
              :class="[userRank.bg, userRank.color]"
              class="mt-4 px-4 py-1.5 rounded-full border border-white/10 text-[9px] flex items-center justify-center gap-2 whitespace-nowrap shadow-xl w-fit min-w-[80px]"
            >
              <component :is="userRank.icon" class="w-3.5 h-3.5" />
              {{ userRank.name }}
            </div>
          </div>

          <div class="flex-1 text-center md:text-left">
            <h1 class="text-4xl tracking-tighter leading-none mb-2">
              {{ profile.full_name || profile.username }}
            </h1>
            <p
              class="text-xs text-yellow-500/50 tracking-[0.4em] mb-8 uppercase font-black"
            >
              @{{ profile.username }}
            </p>

            <div
              class="flex flex-wrap justify-center md:justify-start gap-4 mb-8"
            >
              <div
                class="bg-black/40 border border-white/5 px-6 py-4 rounded-[28px] text-center min-w-[100px]"
              >
                <span
                  class="block text-2xl text-yellow-500 leading-none mb-1"
                  >{{ followersCount }}</span
                >
                <span
                  class="text-[8px] text-gray-600 tracking-widest font-black uppercase"
                  >Followers</span
                >
              </div>
              <div
                class="bg-black/40 border border-white/5 px-6 py-4 rounded-[28px] text-center min-w-[100px]"
              >
                <span class="block text-2xl text-white leading-none mb-1">{{
                  followingCount
                }}</span>
                <span
                  class="text-[8px] text-gray-600 tracking-widest font-black uppercase"
                  >Following</span
                >
              </div>
              <div
                class="bg-black/40 border border-white/5 px-6 py-4 rounded-[28px] text-center min-w-[100px]"
              >
                <span class="block text-2xl text-blue-500 leading-none mb-1">{{
                  listings.length
                }}</span>
                <span
                  class="text-[8px] text-gray-600 tracking-widest font-black uppercase"
                  >Items</span
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
                class="px-10 py-4 rounded-2xl text-[10px] tracking-widest font-black transition-all active:scale-95 shadow-xl"
              >
                {{ isFollowing ? "UNFOLLOW SIGNAL" : "FOLLOW MEMBER" }}
              </button>
              <button
                @click="router.push(`/messages/${profile.id}`)"
                class="p-4 bg-white/5 border border-white/10 rounded-2xl hover:text-yellow-500 transition-all"
              >
                <ChatBubbleLeftEllipsisIcon class="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-10 mb-10 border-b border-white/5 px-4">
        <button
          @click="activeTab = 'transmissions'"
          :class="
            activeTab === 'transmissions'
              ? 'text-yellow-500 border-b-4 border-yellow-500'
              : 'text-gray-700'
          "
          class="pb-6 text-[10px] tracking-[0.3em] font-black uppercase transition-all"
        >
          Transmissions
        </button>
        <button
          @click="activeTab = 'reviews'"
          :class="
            activeTab === 'reviews'
              ? 'text-yellow-500 border-b-4 border-yellow-500'
              : 'text-gray-700'
          "
          class="pb-6 text-[10px] tracking-[0.3em] font-black uppercase transition-all"
        >
          Reputation
        </button>
      </div>

      <div v-if="activeTab === 'transmissions'" class="grid gap-4">
        <div
          v-for="p in listings"
          :key="p.id"
          @click="router.push(`/product/${p.id}`)"
          class="group flex items-center bg-white/[0.02] border border-white/5 rounded-[32px] p-4 pr-10 hover:border-yellow-500/30 transition-all cursor-pointer"
        >
          <div
            class="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-inner"
          >
            <img
              :src="p.image_url"
              class="w-full h-full object-cover group-hover:scale-110 duration-500"
            />
          </div>
          <div class="ml-8 flex-1">
            <h3
              class="text-xs group-hover:text-yellow-500 font-black uppercase tracking-tight mb-1"
            >
              {{ p.name }}
            </h3>
            <span
              class="text-[8px] px-2 py-1 bg-white/5 rounded text-gray-600 uppercase font-black"
              >{{ p.category }}</span
            >
          </div>
          <div class="text-right">
            <p class="text-lg text-yellow-500 font-black">
              {{ formatPrice(p.current_bid) }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'reviews'" class="space-y-6">
        <button
          v-if="currentUser && currentUser.id !== profile.id"
          @click="showReviewModal = true"
          class="w-full py-6 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[32px] text-[10px] tracking-[0.4em] font-black text-gray-600 hover:text-yellow-500 hover:border-yellow-500/30 transition-all uppercase italic"
        >
          Submit Reputation Report
        </button>

        <div v-if="reviews.length > 0" class="space-y-4">
          <div
            v-for="rev in reviews"
            :key="rev.id"
            class="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 shadow-xl"
          >
            <div class="flex justify-between items-start mb-6">
              <div
                @click="goToProfile(rev.reviewer.username)"
                class="flex items-center gap-4 cursor-pointer group"
              >
                <div
                  class="w-10 h-10 rounded-full overflow-hidden border border-white/10 group-hover:border-yellow-500 transition-all"
                >
                  <img
                    :src="rev.reviewer.avatar_url"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p
                    class="text-[10px] text-white group-hover:text-yellow-500 font-black transition-colors uppercase"
                  >
                    @{{ rev.reviewer.username }}
                  </p>
                  <div class="flex gap-0.5 mt-1.5">
                    <StarIconSolid
                      v-for="i in 5"
                      :key="i"
                      class="w-3 h-3"
                      :class="
                        i <= rev.rating
                          ? 'text-yellow-500 shadow-sm'
                          : 'text-gray-900'
                      "
                    />
                  </div>
                </div>
              </div>
              <span
                class="text-[8px] text-gray-800 font-black tracking-widest"
                >{{ new Date(rev.created_at).toLocaleDateString() }}</span
              >
            </div>
            <p
              class="text-[12px] text-gray-400 normal-case font-bold italic leading-relaxed px-2"
            >
              "{{ rev.comment }}"
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="showReviewModal"
        class="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/90 overflow-hidden"
      >
        <div
          class="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[60px] p-12 relative shadow-2xl animate-in fade-in zoom-in duration-300"
        >
          <button
            @click="showReviewModal = false"
            class="absolute top-10 right-10 text-gray-700 hover:text-white"
          >
            <XMarkIcon class="w-8 h-8" />
          </button>
          <h2
            class="text-3xl mb-12 tracking-tighter uppercase italic font-black text-white"
          >
            Reputation Report
          </h2>
          <div class="mb-10 text-center">
            <label
              class="text-[10px] text-gray-700 block mb-6 tracking-widest font-black uppercase"
              >Select Rating Level</label
            >
            <div class="flex justify-center gap-3">
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
          </div>
          <div class="mb-12">
            <textarea
              v-model="newReview.comment"
              placeholder="Log your observations here..."
              class="w-full bg-black border border-white/5 rounded-3xl p-6 text-xs outline-none focus:border-yellow-500/50 italic font-bold normal-case text-white shadow-inner resize-none"
              rows="4"
            ></textarea>
          </div>
          <button
            @click="submitReview"
            :disabled="submittingReview"
            class="w-full py-6 bg-yellow-500 text-black rounded-[28px] text-[11px] tracking-[0.3em] font-[1000] uppercase italic active:scale-95 transition-all shadow-xl shadow-yellow-500/10"
          >
            {{ submittingReview ? "TRANSMITTING..." : "COMMIT REPORT" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
