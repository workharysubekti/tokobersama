<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { notify } from "../utils/notify";
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  Cog6ToothIcon,
  ShoppingBagIcon,
  HeartIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  ArrowPathIcon,
  StarIcon, // Import Ikon Bintang
} from "@heroicons/vue/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/vue/24/solid"; // Import Ikon Bintang Solid buat Rating

const router = useRouter();
const user = ref(null);
const profile = ref(null);
const loading = ref(true);
const uploading = ref(false);

// State Dummy buat Reputasi (Nanti ambil dari DB)
const userReputation = ref({
  score: 4.8,
  total_reviews: 125,
});

// State Edit
const isEditing = ref(false);
const editForm = ref({
  full_name: "",
  bio: "",
  avatar_url: "",
});

// Ambil Data Profil dari Database
const fetchProfile = async () => {
  loading.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      user.value = session.user;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        profile.value = data;
        editForm.value = {
          full_name: data.full_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
        };
      }
    } else {
      router.push("/login");
    }
  } catch (error) {
    console.error("Error fetch profile:", error.message);
    notify.error("Gagal Muat Profil", error.message);
  } finally {
    loading.value = false;
  }
};

// --- LOGIKA UPLOAD FOTO (ANTI-STUCK) ---
const handleFileUpload = async (event) => {
  try {
    uploading.value = true;
    const file = event.target.files[0];

    // Kalau batal pilih foto, hentikan loading dan keluar
    if (!file) {
      uploading.value = false;
      return;
    }

    const fileExt = file.name.split(".").pop();
    // Nama unik pakai Date.now()
    const fileName = `${user.value.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload ke bucket 'avatars'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true, // Wajib agar tidak bentrok nama file
      });

    if (uploadError) throw uploadError;

    // Ambil Public URL setelah berhasil upload
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Langsung tampilkan preview foto yang baru
    editForm.value.avatar_url = data.publicUrl;

    notify.success(
      "Foto Terupload",
      "Jangan lupa klik ikon centang hijau untuk menyimpan profil!",
    );
  } catch (error) {
    console.error("Gagal Upload:", error);
    notify.error(
      "Upload Gagal",
      error.message || "Terjadi kesalahan saat upload.",
    );
  } finally {
    uploading.value = false; // Memastikan loading berhenti
    event.target.value = ""; // Reset input agar bisa pilih foto lagi jika mau
  }
};

// --- SIMPAN PROFIL KE DATABASE ---
const saveProfile = async () => {
  loading.value = true;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.value.full_name,
        bio: editForm.value.bio,
        avatar_url: editForm.value.avatar_url,
      })
      .eq("id", user.value.id);

    if (error) throw error;

    // Update tampilan utama agar sinkron dengan yang diedit
    profile.value = { ...profile.value, ...editForm.value };
    isEditing.value = false;
    notify.success("Gacor!", "Profil Mas berhasil diperbarui.");
  } catch (error) {
    notify.error("Gagal Simpan", error.message);
  } finally {
    loading.value = false;
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/").then(() => window.location.reload());
};

// Fungsi navigasi ke halaman histori reputasi
const goToReputationHistory = () => {
  // Path belum dibikin, nanti Mas tinggal bikin route '/profile/reputation'
  // router.push('/profile/reputation');
  notify.info(
    "Fitur Mendatang",
    "Halaman histori aktivitas reputasi sedang dikembangkan.",
  );
};

onMounted(fetchProfile);
</script>

<template>
  <div
    class="min-h-screen bg-[#0a0a0a] pt-24 pb-32 px-6 relative text-white font-sans"
  >
    <div v-if="!loading && profile" class="max-w-md mx-auto relative">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-xl font-black italic uppercase tracking-tighter">
          Vault <span class="text-yellow-500">Member</span>
        </h1>
        <button
          @click="handleLogout"
          class="p-2.5 bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-red-500 transition-all"
        >
          <ArrowRightOnRectangleIcon class="w-5 h-5" />
        </button>
      </div>

      <div
        class="bg-gray-900/40 border border-white/5 rounded-[35px] p-8 mb-6 backdrop-blur-md relative overflow-hidden shadow-2xl shadow-black/50"
      >
        <div
          class="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl -z-10"
        ></div>

        <div v-if="!isEditing" class="flex flex-col items-center text-center">
          <div class="relative group mb-4">
            <div
              class="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-all"
            ></div>
            <div
              class="relative w-24 h-24 bg-black rounded-full border-2 border-white/10 overflow-hidden shadow-inner"
            >
              <img
                v-if="profile.avatar_url"
                :src="profile.avatar_url"
                class="w-full h-full object-cover"
              />
              <UserCircleIcon v-else class="w-full h-full text-gray-800 p-2" />
            </div>
          </div>

          <h2
            class="text-2xl font-[1000] italic uppercase tracking-tighter leading-tight"
          >
            {{ profile.full_name || profile.username }}
          </h2>
          <p
            class="text-[10px] text-gray-500 font-black tracking-[0.3em] uppercase mb-3 italic"
          >
            @{{ profile.username }}
          </p>

          <div
            @click="goToReputationHistory"
            class="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full mb-5 cursor-pointer hover:bg-yellow-500/20 transition-all active:scale-95 group"
            title="Klik untuk melihat histori reputasi"
          >
            <StarIconSolid
              class="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform"
            />
            <span class="text-xs font-black text-yellow-500 tracking-tight">{{
              userReputation.score.toFixed(1)
            }}</span>
            <span
              class="text-[9px] text-yellow-500/60 font-bold uppercase tracking-widest italic"
              >/ {{ userReputation.total_reviews }} Reviews</span
            >
          </div>

          <p class="text-xs text-gray-400 leading-relaxed max-w-[280px] italic">
            {{
              profile.bio ||
              "No bio yet. Tap edit to introduce yourself to the community."
            }}
          </p>

          <button
            @click="isEditing = true"
            class="mt-8 flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
          >
            <PencilSquareIcon class="w-4 h-4 text-gray-500" /> Edit Profile
          </button>
        </div>

        <div v-else class="space-y-5">
          <div class="flex items-center justify-between mb-5">
            <span
              class="text-[10px] font-black text-yellow-500 uppercase tracking-widest italic"
              >Editing Mode</span
            >
            <div class="flex gap-2">
              <button
                @click="isEditing = false"
                class="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
              >
                <XMarkIcon class="w-4 h-4 text-gray-500" />
              </button>
              <button
                @click="saveProfile"
                class="p-2.5 bg-yellow-500 text-black rounded-xl shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform"
              >
                <CheckIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            class="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5"
          >
            <div
              class="relative w-14 h-14 rounded-2xl bg-gray-900 overflow-hidden shrink-0 border border-white/10 shadow-inner"
            >
              <img
                v-if="editForm.avatar_url"
                :src="editForm.avatar_url"
                class="w-full h-full object-cover"
              />
              <UserCircleIcon v-else class="w-full h-full text-gray-800 p-1" />
              <div
                v-if="uploading"
                class="absolute inset-0 bg-black/80 flex items-center justify-center"
              >
                <ArrowPathIcon class="w-5 h-5 text-yellow-500 animate-spin" />
              </div>
            </div>
            <div class="flex-1">
              <label
                class="cursor-pointer flex items-center gap-2.5 text-[10px] font-black uppercase text-gray-400 hover:text-yellow-500 transition-colors bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 active:scale-95"
              >
                <PhotoIcon class="w-4 h-4" />
                {{ uploading ? "Uploading..." : "Change Photo" }}
                <input
                  type="file"
                  class="hidden"
                  @change="handleFileUpload"
                  accept="image/*"
                  :disabled="uploading"
                />
              </label>
            </div>
          </div>

          <div>
            <label
              class="text-[9px] font-black text-gray-600 uppercase tracking-widest italic mb-1.5 block"
              >Display Name</label
            >
            <input
              v-model="editForm.full_name"
              type="text"
              placeholder="DISPLAY NAME"
              class="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-xs font-bold focus:border-yellow-500 outline-none transition-all uppercase italic text-white placeholder:text-gray-700 placeholder:normal-case shadow-inner"
            />
          </div>

          <div>
            <label
              class="text-[9px] font-black text-gray-600 uppercase tracking-widest italic mb-1.5 block"
              >Bio Description</label
            >
            <textarea
              v-model="editForm.bio"
              placeholder="YOUR BIO..."
              rows="3"
              class="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-xs font-bold focus:border-yellow-500 outline-none transition-all italic resize-none text-white placeholder:text-gray-700 placeholder:normal-case shadow-inner normal-case"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <button
          @click="router.push('/messages')"
          class="relative bg-yellow-500 p-6 rounded-[30px] h-36 flex flex-col justify-between items-start text-black overflow-hidden shadow-xl shadow-yellow-500/10 hover:scale-[1.03] active:scale-95 transition-all group"
        >
          <div
            class="absolute -right-3 -top-3 opacity-15 group-hover:scale-110 transition-transform duration-500"
          >
            <ChatBubbleOvalLeftEllipsisIcon class="w-20 h-20" />
          </div>
          <ChatBubbleOvalLeftEllipsisIcon
            class="w-8 h-8 opacity-40 relative z-10"
          />
          <div class="text-left relative z-10">
            <p class="text-sm font-black uppercase italic leading-none">
              Messages
            </p>
            <p
              class="text-[9px] font-bold opacity-60 mt-1 uppercase italic leading-none tracking-wider"
            >
              3 Unread
            </p>
          </div>
          <div
            class="absolute top-6 right-6 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-yellow-500 shadow-lg animate-pulse"
          ></div>
        </button>

        <button
          @click="router.push('/vault')"
          class="bg-white/[0.03] border border-white/5 p-6 rounded-[30px] h-36 flex flex-col justify-between items-start text-left active:bg-white/10 hover:border-white/10 hover:bg-white/[0.05] hover:scale-[1.01] transition-all group"
        >
          <ShoppingBagIcon
            class="w-8 h-8 text-gray-700 group-hover:text-gray-500 transition-colors"
          />
          <div>
            <p
              class="text-sm font-black uppercase italic leading-none text-gray-200"
            >
              My Vault
            </p>
            <p
              class="text-[9px] font-bold text-gray-600 mt-1 uppercase italic leading-none tracking-wider group-hover:text-gray-500 transition-colors"
            >
              Inventory
            </p>
          </div>
        </button>

        <button
          @click="router.push('/watchlist')"
          class="bg-white/[0.03] border border-white/5 p-6 rounded-[30px] h-36 flex flex-col justify-between items-start text-left active:bg-white/10 hover:border-white/10 hover:bg-white/[0.05] hover:scale-[1.01] transition-all group"
        >
          <HeartIcon
            class="w-8 h-8 text-gray-700 group-hover:text-red-500 transition-colors"
          />
          <div>
            <p
              class="text-sm font-black uppercase italic leading-none text-gray-200"
            >
              Favorites
            </p>
            <p
              class="text-[9px] font-bold text-gray-600 mt-1 uppercase italic leading-none tracking-wider group-hover:text-gray-500 transition-colors"
            >
              Watchlist
            </p>
          </div>
        </button>

        <button
          @click="router.push('/settings')"
          class="bg-white/[0.03] border border-white/5 p-6 rounded-[30px] h-36 flex flex-col justify-between items-start text-left active:bg-white/10 hover:border-white/10 hover:bg-white/[0.05] hover:scale-[1.01] transition-all group"
        >
          <Cog6ToothIcon
            class="w-8 h-8 text-gray-700 group-hover:text-gray-500 transition-colors"
          />
          <div>
            <p
              class="text-sm font-black uppercase italic leading-none text-gray-200"
            >
              Config
            </p>
            <p
              class="text-[9px] font-bold text-gray-600 mt-1 uppercase italic leading-none tracking-wider group-hover:text-gray-500 transition-colors"
            >
              Settings
            </p>
          </div>
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-48">
      <div class="relative flex items-center justify-center">
        <div
          class="absolute w-16 h-16 border-4 border-yellow-500/20 rounded-full"
        ></div>
        <ArrowPathIcon
          class="w-10 h-10 text-yellow-500 animate-spin relative z-10"
        />
      </div>
      <p
        class="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] italic mt-6"
      >
        Decrypting Vault...
      </p>
    </div>
  </div>
</template>

<style scoped>
button {
  -webkit-tap-highlight-color: transparent;
  outline: none !important;
}
textarea,
input {
  outline: none !important;
}
/* Custom Scrollbar buat Bio Textarea kalau kepanjangan di edit mode */
textarea::-webkit-scrollbar {
  width: 4px;
}
textarea::-webkit-scrollbar-track {
  bg: transparent;
}
textarea::-webkit-scrollbar-thumb {
  bg: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}
</style>
