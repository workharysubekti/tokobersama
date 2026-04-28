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
  InboxStackIcon,
  CameraIcon,
  PhotoIcon,
} from "@heroicons/vue/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/vue/24/solid";
import { getRankDetails } from "../utils/rankUtils.js";

const route = useRoute();
const router = useRouter();
const username = route.params.username;

const profile = ref(null);
const listings = ref([]);
const soldItems = ref([]);
const wonItems = ref([]);
const archivedItems = ref([]);
const reviews = ref([]);
const loading = ref(true);
const isFollowing = ref(false);
const currentUser = ref(null);

const activeTab = ref("live");
const activeRecordTab = ref("sold");

const fileToUpload = ref(null);
const followersCount = ref(0);
const followingCount = ref(0);

const showCropModal = ref(false);
const cropType = ref("");
const selectedFile = ref(null);
const isUploading = ref(false);

const isOwnProfile = computed(() => {
  return currentUser.value?.id === profile.value?.id;
});

// --- KODE SUCI: FETCH DATA ---
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

    const now = new Date().toISOString();
    const [
      liveRes,
      soldRes,
      wonRes,
      archRes,
      reviewsRes,
      followersRes,
      followingRes,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("owner_id", profileData.id)
        .eq("status", "active")
        .gt("end_time", now)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .eq("owner_id", profileData.id)
        .eq("status", "closed")
        .not("winner_id", "is", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .eq("winner_id", profileData.id)
        .eq("status", "closed")
        .order("updated_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .eq("owner_id", profileData.id)
        .lt("end_time", now)
        .order("end_time", { ascending: false }),
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

    reviews.value = reviewsRes.data || [];
    soldItems.value = soldRes.data || [];
    wonItems.value = wonRes.data || [];
    archivedItems.value = archRes.data || [];
    followersCount.value = followersRes.count || 0;
    followingCount.value = followingRes.count || 0;

    const productsData = liveRes.data || [];
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
        .maybeSingle();
      isFollowing.value = !!followData;
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    loading.value = false;
  }
};

// --- LOGIKA UPLOAD & CROP ---
const handleFileSelect = (event, type) => {
  const file = event.target.files[0];
  if (file) {
    fileToUpload.value = file;
    selectedFile.value = URL.createObjectURL(file);
    cropType.value = type;
    showCropModal.value = true;
  }
};

const executeUpload = async () => {
  if (!fileToUpload.value || !currentUser.value) return;
  isUploading.value = true;
  try {
    const file = fileToUpload.value;
    const fileExt = file.name.split(".").pop();
    const fileName = `${currentUser.value.id}-${Math.random()}.${fileExt}`;
    const filePath = `${currentUser.value.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(cropType.value === "avatar" ? "avatars" : "covers")
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage
      .from(cropType.value === "avatar" ? "avatars" : "covers")
      .getPublicUrl(filePath);
    const updateData = {};
    const columnName = cropType.value === "avatar" ? "avatar_url" : "cover_url";
    updateData[columnName] = publicUrl;
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", currentUser.value.id);
    if (updateError) throw updateError;
    if (profile.value) {
      profile.value[columnName] = publicUrl;
    }
    notify.success(
      `${cropType.value === "avatar" ? "Foto Profil" : "Sampul"} Berhasil Diperbarui!`,
    );
    showCropModal.value = false;
    fileToUpload.value = null;
  } catch (err) {
    notify.error("Upload Gagal", err.message);
  } finally {
    isUploading.value = false;
  }
};

// --- LOGIKA FOLLOW & RATING ---
const toggleFollow = async () => {
  if (!currentUser.value) return router.push("/login");
  if (isOwnProfile.value) return;

  try {
    if (isFollowing.value) {
      // --- LOGIKA UNFOLLOW (DELETE) ---
      const { error: deleteError } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.value.id)
        .eq("following_id", profile.value.id);

      if (deleteError) throw deleteError;

      followersCount.value--;
      isFollowing.value = false;
      notify.success("Berhenti Mengikuti");
    } else {
      // --- LOGIKA FOLLOW (INSERT) ---
      const { error: insertError } = await supabase.from("follows").insert({
        follower_id: currentUser.value.id,
        following_id: profile.value.id,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          isFollowing.value = true;
          return;
        }
        throw insertError;
      }

      // --- LOGIKA NOTIFIKASI (BIAR GAK JADI @SESEORANG) ---
      try {
        // Ambil data profil SAYA (Pengirim) biar dapet username asli
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUser.value.id)
          .single();

        const senderUsername = myProfile?.username || "User";

        const { data: checkFollback } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", profile.value.id)
          .eq("following_id", currentUser.value.id)
          .maybeSingle();

        const isFollback = !!checkFollback;

        await supabase.from("notifications").insert({
          user_id: profile.value.id,
          from_user_id: currentUser.value.id,
          title: isFollback
            ? "FOLLBACK DETECTED!"
            : "NEW TRANSMISSION FOLLOWER!",
          message: `@${senderUsername} ${isFollback ? "mengikuti balik Anda." : "mulai mengikuti Anda."}`,
          type: "activity",
        });
      } catch (notifErr) {
        console.error("Notif failed:", notifErr);
      }

      followersCount.value++;
      isFollowing.value = true;
      notify.success("Berhasil Mengikuti");
    }
  } catch (error) {
    console.error("Follow/Unfollow Error:", error.message);
    notify.error("Aksi Gagal", error.message);
    fetchData();
  }
};

const averageRating = computed(() => {
  if (!reviews.value || reviews.value.length === 0) return "5.0";
  const sum = reviews.value.reduce((acc, curr) => acc + curr.rating, 0);
  let base = (sum / reviews.value.length).toFixed(1);
  if (profile.value?.reputation < 50) base = (Number(base) - 0.5).toFixed(1);
  return base;
});

const myRank = computed(() => {
  return getRankDetails(
    userProfile.value.reputation,
    userProfile.value.role === "admin",
  );
});

const showReviewModal = ref(false);
const submittingReview = ref(false);
const newReview = ref({ rating: 5, comment: "" });

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

const showReportModal = ref(false);
const isSubmittingReport = ref(false);
const reportForm = ref({ category: "Lainnya", details: "" });

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
  } catch (e) {
    notify.error("Report failed");
  } finally {
    isSubmittingReport.value = false;
  }
};

let bidSubscription = null;
watch(
  () => profile.value,
  (newVal) => {
    if (newVal && !bidSubscription) {
      bidSubscription = supabase
        .channel("public-profile-live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids" },
          async () => {
            await fetchData();
          },
        )
        .subscribe();
    }
  },
  { immediate: true },
);

onMounted(fetchData);
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
        class="relative w-full h-56 lg:h-96 bg-[#0a0a0a] overflow-hidden group"
      >
        <img
          :src="
            profile.cover_url ||
            'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'
          "
          class="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"
        ></div>

        <button
          @click="router.back()"
          class="absolute top-6 left-6 p-2.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 active:scale-90 transition-all z-[50]"
        >
          <ArrowLeftIcon class="w-5 h-5 text-white" />
        </button>

        <label
          v-if="isOwnProfile"
          class="absolute bottom-4 right-4 lg:bottom-6 lg:right-8 p-3 bg-black/60 border border-white/10 rounded-2xl cursor-pointer hover:bg-yellow-500 hover:text-black transition-all z-20"
        >
          <PhotoIcon class="w-5 h-5" />
          <input
            type="file"
            class="hidden"
            @change="handleFileSelect($event, 'cover')"
            accept="image/*"
          />
        </label>
      </div>

      <div class="max-w-6xl mx-auto px-6 relative -mt-20 lg:-mt-28 z-10">
        <div class="flex flex-col lg:flex-row lg:items-end lg:gap-10">
          <div
            class="relative flex flex-col items-center lg:items-start flex-shrink-0 self-center lg:self-end"
          >
            <div
              class="w-36 h-36 lg:w-52 lg:h-52 rounded-[45px] border-[8px] border-black overflow-hidden shadow-2xl bg-black relative ring-1 ring-white/5"
            >
              <img
                :src="profile.avatar_url || 'https://via.placeholder.com/150'"
                class="w-full h-full object-cover"
              />
            </div>

            <label
              v-if="isOwnProfile"
              class="absolute -bottom-1 -right-1 lg:bottom-2 lg:right-2 bg-yellow-500 p-2 lg:p-2.5 rounded-xl text-black shadow-2xl cursor-pointer active:scale-110 transition-all border-4 border-black z-[30]"
            >
              <CameraIcon class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
              <input
                type="file"
                class="hidden"
                @change="handleFileSelect($event, 'avatar')"
                accept="image/*"
              />
            </label>
          </div>

          <div
            class="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left mt-6 lg:mb-4"
          >
            <div class="lg:flex lg:items-center lg:gap-6">
              <h1 class="text-4xl lg:text-6xl tracking-tighter text-white">
                {{ profile.full_name }}
              </h1>

              <div class="hidden lg:flex items-center gap-4">
                <div
                  :class="[myRank.bg, myRank.color]"
                  class="px-5 py-1.5 rounded-full border border-white/5 text-[9px] flex items-center gap-2"
                >
                  <component :is="myRank.icon" class="w-3.5 h-3.5" />
                  <span>{{ myRank.name }}</span>
                </div>
                <div
                  class="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/5 px-4 py-1.5 rounded-full border border-yellow-500/10"
                >
                  <StarIconSolid class="w-3.5 h-3.5" />
                  <span class="text-xs font-black italic"
                    >{{ averageRating }}/5.0</span
                  >
                </div>
              </div>
            </div>

            <p
              class="text-[10px] lg:text-xs text-yellow-500/50 tracking-[0.4em] mb-6 lg:mb-4"
            >
              @{{ profile.username }}
            </p>

            <div
              class="flex items-center gap-6 lg:gap-10 text-[10px] lg:text-xs tracking-[0.2em] text-gray-500 mb-8 lg:mb-0"
            >
              <router-link
                :to="`/user/${profile.username}/followers`"
                class="group cursor-pointer text-center lg:text-left active:scale-95 transition-all"
              >
                <p
                  class="text-white text-xl lg:text-3xl mb-0.5 leading-none group-hover:text-yellow-500 transition-colors"
                >
                  {{ followersCount }}
                </p>
                <p class="group-hover:text-gray-300">PENGIKUT</p>
              </router-link>

              <div class="w-px h-8 bg-white/10"></div>

              <router-link
                :to="`/user/${profile.username}/following`"
                class="group cursor-pointer text-center lg:text-left active:scale-95 transition-all"
              >
                <p
                  class="text-white text-xl lg:text-3xl mb-0.5 leading-none group-hover:text-blue-500 transition-colors"
                >
                  {{ followingCount }}
                </p>
                <p class="group-hover:text-gray-300">MENGIKUTI</p>
              </router-link>

              <div class="w-px h-8 bg-white/10"></div>

              <div class="text-center lg:text-left">
                <p class="text-white text-xl lg:text-3xl mb-0.5 leading-none">
                  {{ profile.reputation || 0 }}
                </p>
                <p>REPUTASI</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 lg:mt-12 lg:flex lg:items-start lg:gap-16">
          <div class="w-full lg:w-1/3 flex flex-col gap-6">
            <div class="flex items-center gap-3 w-full">
              <button
                v-if="!isOwnProfile"
                @click="toggleFollow"
                :class="
                  isFollowing
                    ? 'bg-white/5 text-white border-white/10'
                    : 'bg-yellow-500 text-black'
                "
                class="flex-[3] py-4 rounded-[22px] text-[10px] lg:text-xs font-black tracking-widest border transition-all active:scale-95"
              >
                {{ isFollowing ? "UNFOLLOW" : "IKUTI USER" }}
              </button>
              <button
                v-else
                @click="router.push('/profile')"
                class="flex-1 py-4 bg-white/5 border border-white/10 rounded-[22px] text-[10px] lg:text-xs font-black tracking-widest text-yellow-500 active:scale-95 transition-all"
              >
                MODIFIKASI PROFIL SAYA
              </button>
              <button
                v-if="!isOwnProfile"
                @click="router.push(`/messages/${profile.id}`)"
                class="flex-1 p-4 bg-white/5 border border-white/10 rounded-[22px] flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <ChatBubbleLeftEllipsisIcon class="w-6 h-6 text-yellow-500" />
              </button>
              <button
                v-if="currentUser && !isOwnProfile"
                @click="showReportModal = true"
                class="flex-1 p-4 bg-red-500/10 border border-red-500/20 rounded-[22px] flex items-center justify-center text-red-500"
              >
                <ExclamationTriangleIcon class="w-6 h-6" />
              </button>
            </div>

            <p
              class="text-gray-400 text-[13px] leading-relaxed normal-case italic font-bold text-center lg:text-left"
            >
              "{{ profile.bio || "NO BIOGRAPHICAL DATA TRANSMITTED." }}"
            </p>

            <div class="lg:hidden flex items-center justify-center gap-4">
              <div
                :class="[myRank.bg, myRank.color]"
                class="px-6 py-2 rounded-full border border-white/5 text-[10px] flex items-center gap-2"
              >
                <component :is="myRank.icon" class="w-4 h-4" />
                <span>{{ myRank.name }}</span>
              </div>
              <div
                class="flex items-center gap-2 text-yellow-500 bg-yellow-500/5 px-4 py-2 rounded-full border border-yellow-500/10"
              >
                <StarIconSolid class="w-3.5 h-3.5" />
                <span class="text-sm font-black italic"
                  >{{ averageRating }}/5.0</span
                >
              </div>
            </div>
          </div>

          <div class="w-full lg:flex-1 mt-12 lg:mt-0">
            <div
              class="bg-[#0a0a0a] border border-white/5 rounded-[40px] lg:rounded-[50px] overflow-hidden p-6 lg:p-10 shadow-2xl"
            >
              <div class="flex border-b border-white/5 mb-10">
                <button
                  v-for="tab in ['live', 'records', 'reviews']"
                  :key="tab"
                  @click="activeTab = tab"
                  :class="
                    activeTab === tab
                      ? 'text-yellow-500 border-b-4 border-yellow-500'
                      : 'text-gray-600'
                  "
                  class="flex-1 py-5 text-[11px] lg:text-xs tracking-[0.4em] font-black uppercase italic transition-all"
                >
                  {{ tab }}
                </button>
              </div>

              <div class="min-h-[400px]">
                <div
                  v-if="activeTab === 'live'"
                  class="grid grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <div
                    v-for="item in listings"
                    :key="item.id"
                    @click="router.push(`/product/${item.id}`)"
                    class="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden aspect-square relative group cursor-pointer shadow-xl"
                  >
                    <img
                      :src="item.image_url"
                      class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
                    />
                    <div
                      v-if="item.is_priority"
                      class="absolute top-3 right-3 bg-yellow-500 p-2 rounded-full shadow-xl border-2 border-black z-10"
                    >
                      <StarIconSolid class="w-3 h-3 text-black" />
                    </div>
                    <div
                      class="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black to-transparent"
                    >
                      <p class="text-[10px] truncate mb-1 text-white">
                        {{ item.name }}
                      </p>
                      <p class="text-yellow-500 text-xs font-black italic">
                        IDR {{ item.display_price?.toLocaleString() }}
                      </p>
                    </div>
                  </div>
                  <div
                    v-if="listings.length === 0"
                    class="col-span-full py-20 text-center opacity-20"
                  >
                    <ArchiveBoxIcon class="w-16 h-16 mx-auto mb-4" />
                    <p class="text-[10px] tracking-[0.5em]">
                      NO LIVE TRANSMISSIONS
                    </p>
                  </div>
                </div>

                <div v-if="activeTab === 'records'" class="space-y-6">
                  <div
                    class="flex gap-3 p-1.5 bg-white/[0.03] border border-white/5 rounded-[24px]"
                  >
                    <button
                      v-for="sub in [
                        { id: 'sold', name: 'SOLD' },
                        { id: 'bought', name: 'BOUGHT' },
                        { id: 'archived', name: 'ARCHIVE' },
                      ]"
                      :key="sub.id"
                      @click="activeRecordTab = sub.id"
                      :class="
                        activeRecordTab === sub.id
                          ? 'bg-white/10 text-white shadow-lg'
                          : 'text-gray-600'
                      "
                      class="flex-1 py-3 rounded-[18px] text-[9px] font-black tracking-widest transition-all italic uppercase"
                    >
                      {{ sub.name }}
                    </button>
                  </div>
                  <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <template v-if="activeRecordTab === 'sold'">
                      <div
                        v-for="item in soldItems"
                        :key="item.id"
                        class="bg-white/5 border border-white/5 rounded-[32px] p-4 group transition-all"
                      >
                        <img
                          :src="item.image_url"
                          class="w-full h-32 object-cover rounded-2xl mb-4 grayscale group-hover:grayscale-0 transition-all"
                        />
                        <p class="text-[10px] truncate font-black italic">
                          {{ item.name }}
                        </p>
                      </div>
                    </template>
                    <template v-if="activeRecordTab === 'bought'">
                      <div
                        v-for="item in wonItems"
                        :key="item.id"
                        class="bg-white/5 border border-white/5 rounded-[32px] p-4 relative group transition-all"
                      >
                        <img
                          :src="item.image_url"
                          class="w-full h-32 object-cover rounded-2xl mb-4 grayscale group-hover:grayscale-0 transition-all"
                        />
                        <p class="text-[10px] truncate font-black italic">
                          {{ item.name }}
                        </p>
                        <CheckBadgeIcon
                          class="absolute top-4 right-4 w-6 h-6 text-green-500 drop-shadow-xl"
                        />
                      </div>
                    </template>
                    <template v-if="activeRecordTab === 'archived'">
                      <div
                        v-for="item in archivedItems"
                        :key="item.id"
                        class="bg-white/5 border border-white/5 rounded-[32px] p-4 flex flex-col"
                      >
                        <img
                          :src="item.image_url"
                          class="w-full h-32 object-cover rounded-2xl mb-4 opacity-40 grayscale"
                        />
                        <div class="flex justify-between items-center">
                          <p
                            class="text-[10px] truncate font-black italic flex-1"
                          >
                            {{ item.name }}
                          </p>
                          <span class="text-[8px] text-gray-500">ENDED</span>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>

                <div v-if="activeTab === 'reviews'" class="space-y-6">
                  <div
                    v-for="review in reviews"
                    :key="review.id"
                    class="bg-white/[0.02] border border-white/5 rounded-[32px] p-8"
                  >
                    <div class="flex justify-between items-start mb-6">
                      <div class="flex items-center gap-4">
                        <img
                          :src="review.reviewer?.avatar_url"
                          class="w-12 h-12 rounded-2xl border border-white/10"
                        />
                        <div>
                          <p class="text-xs text-white">
                            @{{ review.reviewer?.username }}
                          </p>
                          <div class="flex gap-1 mt-1.5">
                            <StarIconSolid
                              v-for="i in 5"
                              :key="i"
                              :class="
                                i <= review.rating
                                  ? 'text-yellow-500'
                                  : 'text-gray-900'
                              "
                              class="w-3 h-3"
                            />
                          </div>
                        </div>
                      </div>
                      <span
                        class="text-[9px] text-gray-700 italic font-black uppercase"
                        >{{
                          new Date(review.created_at).toLocaleDateString()
                        }}</span
                      >
                    </div>
                    <p
                      class="text-[13px] leading-relaxed text-gray-400 normal-case italic font-bold"
                    >
                      "{{ review.comment }}"
                    </p>
                  </div>

                  <button
                    v-if="currentUser && !isOwnProfile"
                    @click="showReviewModal = true"
                    class="w-full py-6 bg-white/5 border border-dashed border-white/10 rounded-[32px] text-[11px] tracking-widest text-gray-500 hover:text-yellow-500 italic font-black transition-all"
                  >
                    + LOG NEW OBSERVATION TRANSMISSION
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showCropModal"
      class="fixed inset-0 z-[1000] flex items-center justify-center p-6"
    >
      <div
        class="absolute inset-0 bg-black/98 backdrop-blur-2xl"
        @click="showCropModal = false"
      ></div>
      <div
        class="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-[45px] overflow-hidden shadow-2xl"
      >
        <div
          class="p-8 border-b border-white/5 flex justify-between items-center"
        >
          <h3 class="text-xl font-black italic uppercase">
            CROP {{ cropType }} IMAGE
          </h3>
          <button
            @click="showCropModal = false"
            class="p-2 bg-white/5 rounded-xl"
          >
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>
        <div class="p-10 flex flex-col items-center">
          <div
            :class="
              cropType === 'avatar'
                ? 'w-64 h-64 rounded-full'
                : 'w-full aspect-video rounded-3xl'
            "
            class="overflow-hidden border-2 border-dashed border-yellow-500/50 bg-black mb-10"
          >
            <img :src="selectedFile" class="w-full h-full object-contain" />
          </div>
          <button
            @click="executeUpload"
            :disabled="isUploading"
            class="w-full bg-yellow-500 text-black py-5 rounded-[25px] font-black italic uppercase text-xs flex items-center justify-center gap-3"
          >
            <ArrowPathIcon
              v-if="isUploading"
              class="w-5 h-5 animate-spin"
            /><span v-else>SYNC & UPLOAD ASSET</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showReportModal"
      class="fixed inset-0 z-[200] flex items-center justify-center px-6"
    >
      <div
        class="absolute inset-0 bg-black/95 backdrop-blur-lg"
        @click="showReportModal = false"
      ></div>
      <div
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-10 shadow-2xl"
      >
        <div class="text-center mb-8">
          <div
            class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20"
          >
            <ExclamationTriangleIcon class="w-8 h-8 text-red-500" />
          </div>
          <h3 class="text-xl font-black italic uppercase text-white">
            Report Profil
          </h3>
        </div>
        <div class="space-y-6">
          <textarea
            v-model="reportForm.details"
            rows="4"
            placeholder="Alasan pelaporan..."
            class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs text-white outline-none focus:border-red-500 italic font-bold"
          ></textarea>
          <div class="flex gap-3">
            <button
              @click="showReportModal = false"
              class="flex-1 py-5 bg-white/5 rounded-3xl text-[10px] font-black italic uppercase"
            >
              CANCEL
            </button>
            <button
              @click="submitReport"
              :disabled="isSubmittingReport"
              class="flex-[2] bg-red-600 text-white py-5 rounded-3xl font-black text-[10px] italic uppercase"
            >
              {{ isSubmittingReport ? "TRANSMITTING..." : "CONFIRM REPORT" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showReviewModal"
      class="fixed inset-0 z-[200] flex items-center justify-center px-6"
    >
      <div
        class="absolute inset-0 bg-black/95 backdrop-blur-lg"
        @click="showReviewModal = false"
      ></div>
      <div
        class="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[40px] p-10 shadow-2xl"
      >
        <div class="text-center mb-8">
          <h3 class="text-xl font-black italic uppercase text-white">
            Log Observation
          </h3>
        </div>
        <div class="space-y-6">
          <div class="flex justify-center gap-2">
            <StarIconSolid
              v-for="i in 5"
              :key="i"
              @click="newReview.rating = i"
              :class="
                i <= newReview.rating ? 'text-yellow-500' : 'text-gray-800'
              "
              class="w-8 h-8 cursor-pointer"
            />
          </div>
          <textarea
            v-model="newReview.comment"
            rows="4"
            placeholder="Describe quality..."
            class="w-full bg-black border border-white/10 rounded-3xl p-5 text-xs text-white outline-none focus:border-yellow-500 italic font-bold"
          ></textarea>
          <button
            @click="submitReview"
            :disabled="submittingReview"
            class="w-full bg-yellow-500 text-black py-5 rounded-3xl font-black text-[10px] italic uppercase"
          >
            {{ submittingReview ? "SYNCING..." : "CONFIRM LOG" }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <span
    :style="{
      color: myRank.color,
      textShadow: `0 0 10px ${myRank.color}44`,
    }"
    class="font-black italic"
  >
    {{ myRank.name }}
  </span>
</template>
