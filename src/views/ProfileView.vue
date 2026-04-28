<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  PencilSquareIcon,
  CameraIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CheckBadgeIcon as CheckBadgeOutline,
  ShieldCheckIcon as ShieldCheckOutline,
  BoltIcon as BoltOutline,
  FireIcon as FireOutline,
  TrophyIcon as TrophyOutline,
  ArrowPathIcon,
  BanknotesIcon,
  UserIcon,
  ArrowUpRightIcon,
} from "@heroicons/vue/24/outline";
import { getRankDetails } from "../utils/rankUtils.js";
import {
  BoltIcon,
  FireIcon,
  ShieldCheckIcon,
  TrophyIcon,
  CheckBadgeIcon,
  StarIcon as StarIconSolid,
} from "@heroicons/vue/24/solid"; // Pakai yang SOLID biar warnanya lebih 'isi'

// Fungsi pemetaan icon
const getIconComponent = (iconName) => {
  const map = {
    BoltIcon,
    FireIcon,
    ShieldCheckIcon,
    TrophyIcon,
    CheckBadgeIcon,
    StarIconSolid,
  };
  return map[iconName] || BoltIcon; // Default ke Bolt kalau ga ketemu
};

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const isEditing = ref(false);
const fileInput = ref(null);

const totalTx = ref(0);
const followersCount = ref(0);
const followingCount = ref(0);
const balance = ref(0);
const activeProductsCounts = ref(0);

// --- LOGIKA LOGOUT (KODE SUCI) ---
const handleLogout = async () => {
  const confirmLogout = confirm("Konfirmasi Logout dari sistem TokBer?");
  if (!confirmLogout) return;
  await supabase.auth.signOut();
  router.push("/login");
};

// --- LOGIKA AVATAR (KODE SUCI) ---
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
  balance.value = props.userProfile?.balance || 0;
  const [txRes, statusRes, follRes, followingRes] = await Promise.all([
    supabase
      .from("products")
      .select("id")
      .or(
        `owner_id.eq.${props.userProfile.id},winner_id.eq.${props.userProfile.id}`,
      )
      .eq("status", "closed"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", props.userProfile.id)
      .in("status", ["active", "pending", "rejected"]),

    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", props.userProfile.id),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", props.userProfile.id),
  ]);
  if (!txRes.error) totalTx.value = txRes.data?.length || 0;
  if (!statusRes.error) activeProductsCounts.value = statusRes.count || 0;
  followersCount.value = follRes.count || 0;
  followingCount.value = followingRes.count || 0;
};

// --- LOGIKA RANK (UPDATED LOGIC) ---
const myRank = computed(() => {
  if (!props.userProfile)
    return { name: "LOADING", color: "#666", icon: "BoltIcon" };

  return getRankDetails(
    props.userProfile.reputation || 0,
    props.userProfile.is_admin === true,
  );
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
const unreadNotif = ref(0);

const fetchUnreadNotifications = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .eq("type", "activity");
  unreadNotif.value = count || 0;
};

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
  fetchUnreadNotifications();
});
</script>

<template>
  <div
    class="min-h-screen bg-[#050505] pt-12 lg:pt-16 pb-32 px-6 text-white font-sans uppercase italic font-[1000]"
  >
    <div v-if="userProfile" class="max-w-2xl lg:max-w-5xl mx-auto">
      <div class="flex flex-col lg:flex-row gap-10 items-center lg:items-start">
        <div
          class="w-full lg:w-1/3 flex flex-col items-center text-center space-y-6"
        >
          <div class="relative group mt-4">
            <div
              class="w-32 h-32 lg:w-40 lg:h-40 rounded-full border-4 border-yellow-500/10 overflow-hidden bg-black shadow-2xl"
            >
              <img
                :src="
                  userProfile.avatar_url || 'https://via.placeholder.com/150'
                "
                class="w-full h-full object-cover transition-transform group-hover:scale-110"
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
              class="absolute bottom-1 right-1 bg-yellow-500 p-2.5 rounded-full text-black shadow-xl active:scale-110"
            >
              <CameraIcon v-if="!loading" class="w-5 h-5" />
              <ArrowPathIcon v-else class="w-5 h-5 animate-spin" />
            </button>
          </div>

          <div class="space-y-1">
            <h1
              class="text-3xl lg:text-4xl tracking-tighter text-white leading-none"
            >
              {{ userProfile.full_name || "MEMBER" }}
            </h1>
            <p class="text-[10px] text-yellow-500/40 tracking-[0.4em]">
              @{{ userProfile.username }}
            </p>
          </div>

          <router-link
            to="/reputation-info"
            class="active:scale-95 transition-all"
          >
            <div
              :style="{
                borderColor: myRank.color + '44',
                backgroundColor: myRank.color + '15',
              }"
              class="flex items-center gap-3 px-5 py-2 rounded-2xl border backdrop-blur-sm shadow-xl"
            >
              <div
                :style="{ backgroundColor: myRank.color + '22' }"
                class="p-1.5 rounded-lg border border-white/5"
              >
                <component
                  :is="getIconComponent(myRank.icon)"
                  :style="{ color: myRank.color }"
                  class="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                />
              </div>

              <div class="text-left">
                <p
                  class="text-[8px] text-gray-500 tracking-[0.3em] font-black leading-none mb-1"
                >
                  RANK STATUS
                </p>
                <span
                  :style="{
                    color: myRank.color,
                    textShadow: `0 0 12px ${myRank.color}88`,
                  }"
                  class="text-sm font-[1000] italic tracking-tighter leading-none"
                >
                  {{ myRank.name }}
                </span>
              </div>
              <ChevronRightIcon class="w-4 h-4 text-yellow-500/30 ml-1" />
            </div>
          </router-link>

          <div
            class="flex items-center gap-4 text-[10px] tracking-widest text-gray-600"
          >
            <button
              @click="router.push(`/user/${userProfile.username}/followers`)"
              class="active:text-white"
            >
              <span class="text-white">{{ followersCount }}</span> PENGIKUT
            </button>
            <span class="text-white/10 text-xs font-light">|</span>
            <button
              @click="router.push(`/user/${userProfile.username}/following`)"
              class="active:text-white"
            >
              <span class="text-white">{{ followingCount }}</span> MENGIKUTI
            </button>
          </div>

          <div class="max-w-xs">
            <p
              class="text-[11px] leading-relaxed text-gray-500 normal-case italic font-bold"
            >
              {{
                userProfile.bio || "Belum ada biodata yang direkam oleh sistem."
              }}
            </p>
          </div>

          <button
            @click="isEditing = !isEditing"
            class="text-[9px] text-yellow-500 tracking-[0.2em] font-black border border-yellow-500/10 px-6 py-2 rounded-full"
          >
            {{ isEditing ? "BATALKAN EDIT" : "EDIT BIODATA" }}
          </button>
        </div>

        <div class="w-full lg:w-2/3 space-y-8">
          <div
            v-if="isEditing"
            class="bg-yellow-500/[0.02] border border-yellow-500/10 rounded-[32px] p-6 space-y-4"
          >
            <input
              v-model="editData.full_name"
              type="text"
              placeholder="Nama Lengkap"
              class="w-full bg-black border border-white/5 rounded-2xl p-5 text-xs text-white outline-none focus:border-yellow-500/30"
            />
            <textarea
              v-model="editData.bio"
              rows="3"
              placeholder="Biodata..."
              class="w-full bg-black border border-white/5 rounded-2xl p-5 text-xs text-white normal-case italic font-bold outline-none focus:border-yellow-500/30"
            ></textarea>
            <button
              @click="handleUpdate"
              class="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black text-[10px] uppercase italic active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4 lg:gap-6">
            <router-link
              to="/wallet"
              class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 active:bg-white/[0.05] transition-all flex flex-col justify-between aspect-square lg:aspect-auto lg:h-40"
            >
              <div class="flex justify-between items-start">
                <div
                  class="p-2.5 bg-yellow-500/5 rounded-xl border border-yellow-500/10"
                >
                  <BanknotesIcon class="w-4 h-4 text-yellow-500" />
                </div>
                <ArrowUpRightIcon class="w-3.5 h-3.5 text-gray-800" />
              </div>
              <div>
                <p
                  class="text-[8px] text-gray-600 tracking-widest mb-1 font-black italic"
                >
                  SALDO AKTIF
                </p>
                <p class="text-base lg:text-xl font-[1000] text-white">
                  Rp {{ balance.toLocaleString() }}
                </p>
              </div>
            </router-link>

            <router-link
              :to="`/user/${userProfile.username}`"
              class="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 active:bg-white/[0.05] transition-all flex flex-col justify-between aspect-square lg:aspect-auto lg:h-40"
            >
              <div class="flex justify-between items-start">
                <div
                  class="p-2.5 bg-white/5 rounded-xl border border-white/5 text-white"
                >
                  <UserIcon class="w-4 h-4" />
                </div>
                <ArrowUpRightIcon class="w-3.5 h-3.5 text-gray-800" />
              </div>
              <div>
                <p
                  class="text-[8px] text-gray-600 tracking-widest mb-1 font-black italic"
                >
                  TAMPILAN PUBLIK
                </p>
                <p class="text-base lg:text-xl font-[1000] text-white">
                  PROFIL <span class="text-gray-600">PUBLIK</span>
                </p>
              </div>
            </router-link>
          </div>

          <div
            class="bg-white/[0.01] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl"
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
                  name: 'Pesan Masuk',
                  path: '/messages',
                  count: unreadCount,
                  type: 'message',
                },
                {
                  name: 'Status Barang',
                  path: '/my-auctions',
                  count: activeProductsCounts,
                  type: 'status_barang',
                },
                { name: 'Gudang Barang', path: '/vault' },
                { name: 'Pengaturan Akun', path: '/settings' },
              ]"
              :key="item.path"
              :to="item.path"
              class="flex items-center justify-between p-7 active:bg-white/[0.02] transition-all border-white/5 border-b"
            >
              <div class="flex items-center gap-4">
                <span
                  class="text-[10px] lg:text-[11px] font-[1000] uppercase italic tracking-[0.2em] text-gray-400"
                  >{{ item.name }}</span
                >
                <div
                  v-if="item.type === 'notif' && item.count > 0"
                  class="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_5px_red]"
                ></div>
                <div
                  v-if="item.type === 'message' && item.count > 0"
                  class="bg-white text-black text-[8px] px-2 py-0.5 rounded-lg font-black"
                >
                  {{ item.count }}
                </div>
                <div
                  v-if="item.type === 'status_barang' && item.count > 0"
                  class="text-[8px] text-yellow-500/30 italic font-black tracking-widest"
                >
                  {{ item.count }} ITEM
                </div>
              </div>
              <ChevronRightIcon class="w-3.5 h-3.5 text-gray-800" />
            </router-link>

            <button
              @click="handleLogout"
              class="w-full flex items-center justify-between p-7 active:bg-red-500/5 transition-all text-red-500"
            >
              <div class="flex items-center gap-4">
                <ArrowRightOnRectangleIcon class="w-4 h-4" />
                <span
                  class="text-[10px] lg:text-[11px] font-[1000] uppercase italic tracking-[0.2em]"
                  >Keluar dari Sistem</span
                >
              </div>
              <ChevronRightIcon class="w-3.5 h-3.5 text-red-500/20" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
