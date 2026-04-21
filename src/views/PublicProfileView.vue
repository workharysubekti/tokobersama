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
  ShieldCheckIcon, // Newbie
  BoltIcon, // Intermediate
  FireIcon, // Expert
  TrophyIcon, // Legend
} from "@heroicons/vue/24/outline";

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

// Stats Real-time (Paten: Diambil dari tabel follows)
const followersCount = ref(0);
const followingCount = ref(0);

// --- LOGIKA RANK BADGE SEIMBANG (NEWBIE - LEGEND) ---
const userRank = computed(() => {
  const ADMIN_ID = "68f80a52-d38c-4ac4-b483-8386026f436c"; // Masukkan ID Owner

  if (profile.value?.id === ADMIN_ID) {
    return {
      name: "OWNER",
      color: "text-red-500",
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

    if (!profileData) {
      router.push("/");
      return;
    }
    profile.value = profileData;

    // AMBIL COUNT DARI TABEL FOLLOWS (Solusi Anti-Refresh 0)
    const [followersRes, followingRes, followCheckRes] = await Promise.all([
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
    ]);

    followersCount.value = followersRes.count || 0;
    followingCount.value = followingRes.count || 0;
    isFollowing.value = !!followCheckRes.data;

    // Ambil Listings & Reviews
    const [productsRes, reviewsRes] = await Promise.all([
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

    listings.value = productsRes.data || [];
    reviews.value = reviewsRes.data || [];
  } catch (error) {
    console.error("Error:", error);
  } finally {
    loading.value = false;
  }
};

const handleFollow = async () => {
  if (!currentUser.value) return notify.info("Denied", "Login dulu Mas.");
  if (currentUser.value.id === profile.value.id) return;

  try {
    if (isFollowing.value) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", profile.value.id);
      isFollowing.value = false;
      followersCount.value = Math.max(0, followersCount.value - 1);
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUser.value.id,
        following_id: profile.value.id,
      });
      isFollowing.value = true;
      followersCount.value++;
    }
  } catch (error) {
    notify.error("Error", "Gagal update follow status.");
  }
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price || 0);
};

onMounted(fetchData);
</script>

<template>
  <div
    class="min-h-screen bg-[#050505] pt-24 pb-32 px-6 text-white font-sans uppercase italic font-[1000]"
  >
    <div v-if="loading" class="flex flex-col items-center justify-center py-48">
      <ArrowPathIcon class="w-12 h-12 text-yellow-500 animate-spin" />
    </div>

    <div v-else-if="profile" class="max-w-4xl mx-auto">
      <button
        @click="router.back()"
        class="mb-8 p-3 bg-white/5 border border-white/10 rounded-2xl"
      >
        <ArrowLeftIcon class="w-5 h-5 text-gray-400" />
      </button>

      <div
        class="bg-gray-900/20 border border-white/5 rounded-[48px] p-10 mb-10 backdrop-blur-3xl relative shadow-2xl"
      >
        <div class="flex flex-col md:flex-row items-center gap-10">
          <div class="relative">
            <div
              class="w-36 h-36 rounded-full border-4 border-white/5 overflow-hidden bg-black"
            >
              <img
                v-if="profile.avatar_url"
                :src="profile.avatar_url"
                class="w-full h-full object-cover"
              />
              <UserCircleIcon v-else class="w-full h-full text-gray-900" />
            </div>
            <div
              :class="[userRank.bg, userRank.color]"
              class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 shadow-xl whitespace-nowrap"
            >
              <component :is="userRank.icon" class="w-3.5 h-3.5" />
              <span class="text-[9px] tracking-[0.2em] font-black">{{
                userRank.name
              }}</span>
            </div>
          </div>

          <div class="flex-1 text-center md:text-left">
            <h1 class="text-4xl tracking-tighter leading-none mb-2">
              {{ profile.full_name || profile.username }}
            </h1>
            <p class="text-xs text-yellow-500/50 tracking-[0.3em] mb-6">
              @{{ profile.username }}
            </p>

            <div
              class="flex flex-wrap justify-center md:justify-start gap-4 mb-8"
            >
              <div
                class="bg-black/60 border border-white/5 px-6 py-3 rounded-[24px] text-center min-w-[100px]"
              >
                <span class="block text-xl text-yellow-500 leading-none mb-1">{{
                  followersCount
                }}</span>
                <span
                  class="text-[7px] text-gray-500 tracking-widest uppercase font-black"
                  >Followers</span
                >
              </div>
              <div
                class="bg-black/60 border border-white/5 px-6 py-3 rounded-[24px] text-center min-w-[100px]"
              >
                <span class="block text-xl text-white leading-none mb-1">{{
                  followingCount
                }}</span>
                <span
                  class="text-[7px] text-gray-500 tracking-widest uppercase font-black"
                  >Following</span
                >
              </div>
              <div
                class="bg-black/60 border border-white/5 px-6 py-3 rounded-[24px] text-center min-w-[100px]"
              >
                <span class="block text-xl text-blue-500 leading-none mb-1">{{
                  listings.length
                }}</span>
                <span
                  class="text-[7px] text-gray-500 tracking-widest uppercase font-black"
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
                    ? 'bg-white/5 border border-white/10 text-white'
                    : 'bg-yellow-500 text-black'
                "
                class="px-8 py-3 rounded-2xl text-[9px] tracking-widest transition-all active:scale-95 font-black uppercase italic"
              >
                {{ isFollowing ? "Unfollow Member" : "Follow Member" }}
              </button>
              <button
                @click="router.push(`/messages/${profile.id}`)"
                class="p-3 bg-white/5 border border-white/10 rounded-2xl hover:text-yellow-500 transition-all"
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
          class="pb-5 text-[10px] tracking-[0.3em] font-black uppercase italic"
        >
          Market Items ({{ listings.length }})
        </button>
        <button
          @click="activeTab = 'reviews'"
          :class="
            activeTab === 'reviews'
              ? 'text-yellow-500 border-b-2 border-yellow-500'
              : 'text-gray-600'
          "
          class="pb-5 text-[10px] tracking-[0.3em] font-black uppercase italic"
        >
          Reputation ({{ reviews.length }})
        </button>
      </div>

      <div v-if="activeTab === 'transmissions'" class="grid grid-cols-1 gap-4">
        <div
          v-for="product in listings"
          :key="product.id"
          @click="router.push(`/product/${product.id}`)"
          class="group flex items-center bg-white/[0.02] border border-white/5 rounded-3xl p-3 pr-8 hover:border-yellow-500/40 transition-all cursor-pointer"
        >
          <div
            class="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/5"
          >
            <img
              :src="product.image_url"
              class="w-full h-full object-cover group-hover:scale-110 duration-700"
            />
          </div>
          <div class="flex-1 ml-6">
            <h3
              class="text-xs tracking-tighter mb-2 group-hover:text-yellow-500 transition-colors uppercase italic font-black"
            >
              {{ product.name }}
            </h3>
            <span
              class="text-[8px] px-2 py-0.5 bg-white/5 rounded text-gray-500 uppercase"
              >{{ product.category }}</span
            >
          </div>
          <div class="text-right">
            <p class="text-sm text-yellow-500 font-black italic">
              {{ formatPrice(product.price) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
