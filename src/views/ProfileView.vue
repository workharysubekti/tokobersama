<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  PencilSquareIcon,
  CameraIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  BoltIcon,
  FireIcon,
  TrophyIcon,
  ArrowPathIcon, // Ditambahkan karena digunakan di button loading
  BellIcon, // Untuk menu Notifikasi
  QueueListIcon, // Untuk menu Status Barang
} from "@heroicons/vue/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/vue/24/solid";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const isEditing = ref(false);
const fileInput = ref(null);

const OWNER_ID = "68f80a52-d38c-4ac4-b483-8386026f436c";

const totalTx = ref(0);
const followersCount = ref(0);
const followingCount = ref(0);
const averageRating = ref("5.0");

// --- FUNGSI LOGOUT ---
const handleLogout = async () => {
  const confirmLogout = confirm("Konfirmasi Logout dari sistem?");
  if (!confirmLogout) return;
  await supabase.auth.signOut();
  router.push("/login");
};

// --- FUNGSI UPLOAD AVATAR ---
const triggerFileInput = () => {
  fileInput.value.click();
};

const uploadAvatar = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  loading.value = true;
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${props.userProfile.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", props.userProfile.id);

    if (updateError) throw updateError;

    window.location.reload();
  } catch (error) {
    alert("Gagal upload foto: " + error.message);
  } finally {
    loading.value = false;
  }
};

const fetchUserStats = async () => {
  if (!props.userProfile?.id) return;

  const [txRes, follRes, followingRes, revRes] = await Promise.all([
    supabase
      .from("products")
      .select("id")
      .or(
        `owner_id.eq.${props.userProfile.id},winner_id.eq.${props.userProfile.id}`,
      )
      .eq("status", "closed"),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", props.userProfile.id),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", props.userProfile.id),
    supabase
      .from("reviews")
      .select("rating")
      .eq("target_user_id", props.userProfile.id),
  ]);

  if (!txRes.error) totalTx.value = txRes.data?.length || 0;
  followersCount.value = follRes.count || 0;
  followingCount.value = followingRes.count || 0;

  if (!revRes.error && revRes.data.length > 0) {
    const sum = revRes.data.reduce((acc, curr) => acc + curr.rating, 0);
    averageRating.value = (sum / revRes.data.length).toFixed(1);
  } else {
    averageRating.value = "5.0";
  }
};

const userRank = computed(() => {
  if (props.userProfile?.id === OWNER_ID) {
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

const editData = ref({
  full_name: props.userProfile?.full_name || "",
  bio: props.userProfile?.bio || "",
});

watch(
  () => props.userProfile,
  (newVal) => {
    if (newVal) {
      editData.value.full_name = newVal.full_name || "";
      editData.value.bio = newVal.bio || "";
      fetchUserStats();
    }
  },
  { immediate: true },
);

const handleUpdate = async () => {
  loading.value = true;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: editData.value.full_name,
      bio: editData.value.bio,
      updated_at: new Date(),
    })
    .eq("id", props.userProfile.id);

  if (!error) {
    isEditing.value = false;
    window.location.reload();
  }
  loading.value = false;
};

const unreadCount = ref(0);
const unreadNotif = ref(1); // Simulasi titik merah notifikasi (bisa ditarik dari DB nanti)
let messageSubscription = null;

const fetchUnreadCount = async () => {
  if (!props.userProfile?.id) return;
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", props.userProfile.id)
    .eq("is_read", false);
  unreadCount.value = count || 0;
};

onMounted(() => {
  fetchUserStats();
  fetchUnreadCount();
  messageSubscription = supabase
    .channel("public:messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      fetchUnreadCount,
    )
    .subscribe();
});

onUnmounted(() => {
  if (messageSubscription) supabase.removeChannel(messageSubscription);
});
</script>

<template>
  <div
    class="min-h-screen bg-[#050505] pt-28 pb-32 px-6 text-white font-sans uppercase italic font-[1000]"
  >
    <div v-if="userProfile" class="max-w-2xl mx-auto relative">
      <button
        @click="handleLogout"
        class="absolute -top-16 right-0 p-3 bg-white/5 border border-white/10 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl z-50"
      >
        <ArrowRightOnRectangleIcon class="w-6 h-6" />
      </button>

      <div class="flex flex-col items-center mb-12">
        <div class="relative group mb-6">
          <div
            class="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white/5 overflow-hidden shadow-2xl bg-black"
          >
            <img
              :src="userProfile.avatar_url || 'https://via.placeholder.com/150'"
              class="w-full h-full object-cover"
            />
          </div>

          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept="image/*"
            @change="uploadAvatar"
          />

          <button
            @click="triggerFileInput"
            :disabled="loading"
            class="absolute bottom-1 right-1 bg-yellow-500 p-2.5 rounded-full text-black shadow-xl hover:scale-110 transition-all disabled:opacity-50"
          >
            <CameraIcon v-if="!loading" class="w-5 h-5" />
            <ArrowPathIcon v-else class="w-5 h-5 animate-spin" />
          </button>
        </div>

        <h1 class="text-3xl tracking-tighter mb-1">
          {{ userProfile.full_name || "MEMBER" }}
        </h1>
        <p class="text-[10px] text-yellow-500/50 tracking-[0.4em] mb-4">
          @{{ userProfile.username }}
        </p>

        <div
          class="flex items-center gap-3 mb-4 text-[10px] tracking-widest text-gray-500 font-black uppercase"
        >
          <button
            @click="router.push(`/user/${userProfile.username}/followers`)"
            class="flex items-center gap-1.5 hover:text-yellow-500 transition-colors"
          >
            <span class="text-white">{{ followersCount }}</span>
            <span>Follower</span>
          </button>
          <span class="text-white/10 text-xs font-light">|</span>
          <button
            @click="router.push(`/user/${userProfile.username}/following`)"
            class="flex items-center gap-1.5 hover:text-yellow-500 transition-colors"
          >
            <span class="text-white">{{ followingCount }}</span>
            <span>Following</span>
          </button>
        </div>

        <div class="mb-6 max-w-md text-center">
          <p
            class="text-[11px] leading-relaxed text-gray-400 normal-case italic font-bold"
          >
            {{ userProfile.bio || "MEMBER HAS NOT TRANSMITTED A BIO DATA." }}
          </p>
        </div>

        <div
          :class="[userRank.bg, userRank.color]"
          class="px-5 py-1.5 rounded-full border border-white/10 text-[9px] flex items-center gap-2 shadow-xl mb-3"
        >
          <component :is="userRank.icon" class="w-3.5 h-3.5" />
          <span class="leading-none">{{ userRank.name }}</span>
        </div>

        <div class="flex items-center gap-1.5 text-yellow-500/80">
          <StarIconSolid class="w-3.5 h-3.5" />
          <span class="text-[11px] font-black tracking-widest italic"
            >{{ averageRating }}/5.0</span
          >
        </div>
      </div>

      <div
        class="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 mb-8 backdrop-blur-3xl shadow-2xl"
      >
        <div class="flex justify-between items-center mb-8 px-2">
          <h2 class="text-xs tracking-[0.3em] text-gray-500 italic font-black">
            PROFIL
          </h2>
          <button
            @click="isEditing = !isEditing"
            class="text-yellow-500 text-[10px] tracking-widest font-black italic"
          >
            {{ isEditing ? "BATAL" : "EDIT PROFIL" }}
          </button>
        </div>

        <div v-if="!isEditing" class="space-y-6 px-2">
          <div>
            <label
              class="text-[8px] text-gray-700 block mb-1 tracking-widest font-black uppercase"
              >Transaksi</label
            >
            <p class="text-xl text-white font-[1000]">
              {{ totalTx }}
              <span class="text-[10px] text-gray-600 ml-1 italic">DEALS</span>
            </p>
          </div>
        </div>

        <div v-else class="space-y-5">
          <input
            v-model="editData.full_name"
            type="text"
            placeholder="Nama Lengkap"
            class="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-xs text-white focus:border-yellow-500 outline-none"
          />
          <textarea
            v-model="editData.bio"
            rows="3"
            placeholder="Bio..."
            class="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-xs text-white normal-case font-bold italic resize-none"
          ></textarea>
          <button
            @click="handleUpdate"
            class="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black text-[10px] uppercase italic active:scale-95 transition-all"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>

      <div
        class="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl"
      >
        <router-link
          v-for="(item, index) in [
            {
              name: 'Notifikasi',
              path: '/notifications',
              count: unreadNotif,
              type: 'notif',
            },
            {
              name: 'Pesan',
              path: '/messages',
              count: unreadCount,
              type: 'message',
            },
            { name: 'Status Barang', path: '/my-auctions', count: 0 },
            { name: 'Inventory', path: '/vault', count: 0 },
            { name: 'Pengaturan Akun', path: '/settings', count: 0 },
          ]"
          :key="item.path"
          :to="item.path"
          class="flex items-center justify-between p-7 hover:bg-white/[0.04] transition-all border-white/5"
          :class="{ 'border-b': index !== 4 }"
        >
          <div class="flex items-center gap-4">
            <span
              class="text-xs font-[1000] uppercase italic tracking-widest text-gray-200"
              >{{ item.name }}</span
            >

            <div
              v-if="item.type === 'notif' && item.count > 0"
              class="w-2 h-2 bg-red-600 rounded-full animate-ping shadow-[0_0_10px_#dc2626]"
            ></div>

            <div
              v-if="item.type === 'message' && item.count > 0"
              class="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse"
            >
              {{ item.count }}
            </div>
          </div>
          <ChevronRightIcon class="w-4 h-4 text-gray-800" />
        </router-link>
      </div>
    </div>
  </div>
</template>
