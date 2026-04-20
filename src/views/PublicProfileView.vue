<script setup>
import { ref, onMounted } from "vue";
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
  ChatBubbleBottomCenterTextIcon,
  HandThumbUpIcon,
  FaceFrownIcon,
  XMarkIcon,
  CheckIcon,
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

const showReviewModal = ref(false);
const submittingReview = ref(false);
const newReview = ref({ rating: 5, comment: "" });

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
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profileData) {
      notify.error("Not Found", "User tidak terdaftar.");
      router.push("/");
      return;
    }
    profile.value = profileData;

    if (currentUser.value && currentUser.value.id !== profileData.id) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", profileData.id)
        .maybeSingle();

      isFollowing.value = !!followData;
    }

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
    console.error("Critical Error:", error);
    notify.error("Error", "Gagal memuat profil.");
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 500);
  }
};

const handleFollow = async () => {
  if (!currentUser.value)
    return notify.info("Access Denied", "Login dulu Mas.");
  if (currentUser.value.id === profile.value.id) return;
  try {
    if (isFollowing.value) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", profile.value.id);
      isFollowing.value = false;
      profile.value.followers_count = Math.max(
        0,
        (profile.value.followers_count || 0) - 1,
      );
    } else {
      await supabase
        .from("follows")
        .insert({
          follower_id: currentUser.value.id,
          following_id: profile.value.id,
        });
      isFollowing.value = true;
      profile.value.followers_count = (profile.value.followers_count || 0) + 1;
    }
  } catch (error) {
    notify.error("Action Failed", error.message);
  }
};

// --- INTEGRASI CHAT ---
const startChat = () => {
  if (!currentUser.value)
    return notify.info("Auth Required", "Login dulu Mas!");
  if (currentUser.value.id === profile.value.id) return;
  router.push(`/messages/${profile.value.id}`); // Arahkan ke Detail Chat dengan ID User
};

const submitReview = async () => {
  if (!currentUser.value)
    return notify.error("Auth Required", "Login dulu Mas!");
  if (currentUser.value.id === profile.value.id)
    return notify.error("Invalid", "Gak boleh review diri sendiri!");
  if (!newReview.value.comment)
    return notify.error("Input Empty", "Komentar kosong.");
  submittingReview.value = true;
  try {
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: currentUser.value.id,
      target_user_id: profile.value.id,
      rating: newReview.value.rating,
      comment: newReview.value.comment,
    });
    if (error) throw error;
    notify.success("Success", "Review terpublish!");
    showReviewModal.value = false;
    newReview.value = { rating: 5, comment: "" };
    fetchData();
  } catch (error) {
    notify.error("Failed", error.message);
  } finally {
    submittingReview.value = false;
  }
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

onMounted(fetchData);
</script>

<template>
  <div
    class="min-h-screen bg-[#0a0a0a] pt-24 pb-32 px-6 text-white font-sans uppercase italic font-black"
  >
    <div v-if="loading" class="flex flex-col items-center justify-center py-48">
      <ArrowPathIcon class="w-12 h-12 text-yellow-500 animate-spin" />
      <p
        class="text-[10px] text-gray-600 tracking-[0.4em] mt-6 italic font-black uppercase"
      >
        Accessing Public Intel...
      </p>
    </div>

    <div v-else-if="profile" class="max-w-4xl mx-auto">
      <button
        @click="router.back()"
        class="mb-8 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
      >
        <ArrowLeftIcon class="w-5 h-5 text-gray-400" />
      </button>

      <div
        class="bg-gray-900/40 border border-white/5 rounded-[40px] p-8 mb-8 backdrop-blur-xl relative overflow-hidden shadow-2xl"
      >
        <div
          class="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] -z-10"
        ></div>
        <div
          class="flex flex-col md:flex-row items-center md:items-start gap-8"
        >
          <div
            class="relative w-32 h-32 rounded-full border-4 border-white/5 overflow-hidden bg-black shadow-2xl"
          >
            <img
              v-if="profile.avatar_url"
              :src="profile.avatar_url"
              class="w-full h-full object-cover"
            />
            <UserCircleIcon v-else class="w-full h-full text-gray-800" />
          </div>
          <div class="flex-1 text-center md:text-left">
            <div class="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div>
                <h1 class="text-3xl tracking-tighter leading-none">
                  {{ profile.full_name || profile.username }}
                </h1>
                <p class="text-xs text-gray-500 tracking-[0.2em] mt-2">
                  @{{ profile.username }}
                </p>
              </div>
              <div
                v-if="currentUser?.id !== profile.id"
                class="flex gap-2 justify-center md:justify-start"
              >
                <button
                  @click="handleFollow"
                  class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] tracking-widest transition-all shadow-lg"
                  :class="
                    isFollowing
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-yellow-500 text-black shadow-yellow-500/20'
                  "
                >
                  <component
                    :is="isFollowing ? UserMinusIcon : UserPlusIcon"
                    class="w-4 h-4"
                  />
                  {{ isFollowing ? "Unfollow" : "Follow" }}
                </button>
                <button
                  @click="startChat"
                  class="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:text-yellow-500 transition-colors"
                >
                  <ChatBubbleLeftEllipsisIcon class="w-5 h-5" />
                </button>
              </div>
              <div
                v-else
                class="bg-yellow-500/10 border border-yellow-500/20 px-4 py-1 rounded-full"
              >
                <span
                  class="text-[9px] text-yellow-500 tracking-widest uppercase"
                  >Self Transmission</span
                >
              </div>
            </div>
            <div
              class="flex flex-wrap justify-center md:justify-start gap-3 mb-6"
            >
              <div
                class="bg-black/40 border border-white/5 px-4 py-2 rounded-2xl flex flex-col items-center"
              >
                <span class="text-[14px] text-yellow-500">{{
                  profile.reputation_score?.toFixed(1) || "5.0"
                }}</span
                ><span class="text-[8px] text-gray-500 mt-1 uppercase"
                  >Reputation</span
                >
              </div>
              <div
                class="bg-black/40 border border-white/5 px-4 py-2 rounded-2xl flex flex-col items-center"
              >
                <span>{{ profile.followers_count || 0 }}</span
                ><span class="text-[8px] text-gray-500 mt-1 uppercase"
                  >Followers</span
                >
              </div>
              <div
                class="bg-black/40 border border-white/5 px-4 py-2 rounded-2xl flex flex-col items-center"
              >
                <span class="text-gray-300 italic text-[14px]">CERTIFIED</span
                ><span class="text-[8px] text-gray-500 mt-1 uppercase"
                  >Status</span
                >
              </div>
            </div>
            <p
              class="text-sm text-gray-400 normal-case font-bold max-w-xl leading-relaxed italic"
            >
              {{ profile.bio || "No data intel for this member yet." }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-4 mb-8 border-b border-white/5">
        <button
          @click="activeTab = 'transmissions'"
          :class="
            activeTab === 'transmissions'
              ? 'text-yellow-500 border-b-2 border-yellow-500 pb-4'
              : 'text-gray-500 pb-4'
          "
          class="text-xs tracking-widest transition-all"
        >
          Transmissions ({{ listings.length }})
        </button>
        <button
          @click="activeTab = 'reviews'"
          :class="
            activeTab === 'reviews'
              ? 'text-yellow-500 border-b-2 border-yellow-500 pb-4'
              : 'text-gray-500 pb-4'
          "
          class="text-xs tracking-widest transition-all"
        >
          Reputation ({{ reviews.length }})
        </button>
      </div>

      <div v-if="activeTab === 'transmissions'" class="space-y-3">
        <div v-if="listings.length > 0" class="flex flex-col gap-3">
          <div
            v-for="product in listings"
            :key="product.id"
            @click="router.push(`/product/${product.id}`)"
            class="group flex items-center bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-all cursor-pointer p-2 pr-6"
          >
            <div
              class="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10"
            >
              <img
                :src="product.image_url"
                class="w-full h-full object-cover group-hover:scale-110 duration-500 shadow-lg"
              />
            </div>
            <div
              class="flex-1 ml-5 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div>
                <h3
                  class="text-xs tracking-tight group-hover:text-yellow-500 transition-colors uppercase leading-none mb-2"
                >
                  {{ product.name }}
                </h3>
                <div class="flex items-center gap-4">
                  <span class="text-[8px] text-gray-600 uppercase">{{
                    product.category
                  }}</span>
                  <div class="flex items-center gap-1.5">
                    <ClockIcon class="w-3 h-3 text-yellow-500" /><span
                      class="text-[9px] text-gray-500 uppercase"
                      >Active</span
                    >
                  </div>
                </div>
              </div>
              <div class="md:text-right">
                <p
                  class="text-[8px] text-gray-600 mb-1 uppercase tracking-widest"
                >
                  Current Bid
                </p>
                <p class="text-sm text-yellow-500 leading-none">
                  {{ formatPrice(product.current_bid || product.price) }}
                </p>
              </div>
            </div>
            <ChevronRightIcon
              class="ml-8 hidden md:block w-5 h-5 text-gray-800 group-hover:text-yellow-500"
            />
          </div>
        </div>
        <div
          v-else
          class="py-20 text-center bg-white/[0.02] border border-white/5 rounded-[40px] opacity-30"
        >
          <TagIcon class="w-10 h-10 mx-auto mb-4" />
          <p class="text-[10px] tracking-[0.3em]">No items in transmission</p>
        </div>
      </div>

      <div v-if="activeTab === 'reviews'" class="space-y-4">
        <div v-if="reviews.length > 0" class="flex flex-col gap-4">
          <div
            v-for="review in reviews"
            :key="review.id"
            class="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-xl"
          >
            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full bg-gray-900 border border-white/10 overflow-hidden shrink-0 shadow-lg"
              >
                <img
                  v-if="review.reviewer?.avatar_url"
                  :src="review.reviewer.avatar_url"
                  class="w-full h-full object-cover"
                />
                <UserCircleIcon
                  v-else
                  class="w-full h-full text-gray-700 p-1"
                />
              </div>
              <div class="flex-1">
                <div class="flex justify-between mb-2 uppercase">
                  <p class="text-[10px] text-white italic tracking-tight">
                    @{{ review.reviewer?.username || "Member" }}
                  </p>
                  <div class="flex gap-0.5">
                    <StarIconSolid
                      v-for="i in review.rating"
                      :key="i"
                      class="w-3 h-3 text-yellow-500"
                    /><StarIconSolid
                      v-for="i in 5 - review.rating"
                      :key="i"
                      class="w-3 h-3 text-gray-800"
                    />
                  </div>
                </div>
                <p
                  class="text-xs text-gray-300 normal-case font-bold italic leading-relaxed"
                >
                  "{{ review.comment }}"
                </p>
                <div class="mt-3 flex items-center gap-1.5">
                  <p
                    class="text-[8px] text-gray-500 uppercase tracking-tighter"
                  >
                    {{ formatDate(review.created_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          class="py-20 text-center bg-white/[0.02] border border-white/5 rounded-[40px] opacity-30"
        >
          <ChatBubbleBottomCenterTextIcon class="w-10 h-10 mx-auto mb-4" />
          <p class="text-[10px] tracking-[0.2em]">
            Intel clean. No reviews filed.
          </p>
        </div>
        <div v-if="currentUser?.id !== profile.id" class="mt-8">
          <button
            @click="showReviewModal = true"
            class="w-full py-5 border-2 border-dashed border-white/10 rounded-[30px] text-[10px] text-gray-500 hover:border-yellow-500/40 hover:text-yellow-500 transition-all uppercase tracking-widest"
          >
            + File a Reputation Report
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showReviewModal"
      class="fixed inset-0 z-[100] flex items-center justify-center px-6"
    >
      <div
        class="absolute inset-0 bg-black/95 backdrop-blur-xl"
        @click="showReviewModal = false"
      ></div>
      <div
        class="relative bg-gray-900 border border-white/10 w-full max-w-md rounded-[40px] p-8 shadow-2xl"
      >
        <h3
          class="text-xl tracking-tighter mb-6 uppercase italic font-black text-white"
        >
          File <span class="text-yellow-500">Report</span>
        </h3>
        <div class="mb-8">
          <label
            class="text-[10px] text-gray-600 block mb-3 tracking-widest uppercase italic font-black"
            >Reputation Impact</label
          >
          <div class="flex gap-2">
            <button
              v-for="i in 5"
              :key="i"
              @click="newReview.rating = i"
              class="transition-transform active:scale-90"
            >
              <StarIconSolid
                class="w-8 h-8"
                :class="
                  i <= newReview.rating ? 'text-yellow-500' : 'text-gray-800'
                "
              />
            </button>
          </div>
        </div>
        <div class="mb-8">
          <label
            class="text-[10px] text-gray-600 block mb-3 tracking-widest uppercase italic font-black"
            >Observations</label
          >
          <textarea
            v-model="newReview.comment"
            placeholder="Describe member activity..."
            class="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-xs focus:border-yellow-500 outline-none transition-all normal-case font-bold italic resize-none text-white shadow-inner"
            rows="4"
          ></textarea>
        </div>
        <div class="flex gap-4">
          <button
            @click="showReviewModal = false"
            class="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] uppercase tracking-widest font-black italic"
          >
            Cancel
          </button>
          <button
            @click="submitReview"
            :disabled="submittingReview"
            class="flex-1 py-4 bg-yellow-500 text-black rounded-2xl text-[10px] uppercase tracking-widest font-black shadow-lg shadow-yellow-500/20 italic"
          >
            {{ submittingReview ? "TRANSMITTING..." : "SUBMIT REPORT" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
