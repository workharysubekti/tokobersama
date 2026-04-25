<script setup>
import { ref } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { notify } from "../utils/notify";
// Tambahkan Cropper Component
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

import {
  PhotoIcon,
  TagIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const loading = ref(false);
const uploading = ref(false);
const duration = ref("3");

// Kategori sesuai list terbaru Mas Hary
const categories = [
  "TCG & Kartu",
  "Action Figure",
  "Diecast & Miniatur",
  "Virtual Item",
  "Fashion & Thrift",
  "Hobi & Kolektibel",
];

// --- LOGIKA MULTI SLOT & CROPPER ---
const imageSlots = ref([
  { url: "", storagePath: "" }, // Slot 1 (Utama)
  { url: "", storagePath: "" }, // Slot 2
  { url: null, storagePath: "" }, // Slot 3
  { url: null, storagePath: "" }, // Slot 4
]);

const showCropper = ref(false);
const currentSlotIndex = ref(null);
const cropperImg = ref(null);
const cropperRef = ref(null);

const form = ref({
  name: "",
  category: "TCG & Kartu",
  description: "",
  starting_bid: "",
  image_url: "", // Untuk foto utama
});

// Trigger input file
const triggerUpload = (index) => {
  currentSlotIndex.value = index;
  document.getElementById("fileInput").click();
};

// Ambil file dan masukkan ke Cropper
const onFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      cropperImg.value = e.target.result;
      showCropper.value = true;
    };
    reader.readAsDataURL(file);
  }
};

// Fungsi Crop & Upload ke Storage
const cropImage = async () => {
  const { canvas } = cropperRef.value.getResult();
  if (!canvas) return;

  try {
    uploading.value = true;
    showCropper.value = false;

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    // Kita buat nama file unik tiap kali upload biar gak tabrakan di cache
    const fileName = `item_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;

    // JURUS ANTI-GAGAL: Kita bungkus dalam try-catch yang lebih rapi
    const { data, error: uploadError } = await supabase.storage
      .from("auction_items")
      .upload(fileName, blob, {
        cacheControl: "3600",
        upsert: false, // Jangan nimpa file lama biar gak konflik
      });

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      throw new Error("Koneksi ke storage terputus, coba sekali lagi.");
    }

    // Ambil URL-nya
    const { data: urlData } = supabase.storage
      .from("auction_items")
      .getPublicUrl(fileName);

    // Pastikan URL-nya ada
    if (!urlData.publicUrl) throw new Error("Gagal generate link foto.");

    imageSlots.value[currentSlotIndex.value].url = urlData.publicUrl;

    if (currentSlotIndex.value === 0) {
      form.value.image_url = urlData.publicUrl;
    }

    notify.success("Asset Encoded", "Foto berhasil dikalibrasi.");
  } catch (error) {
    // Tampilkan error yang lebih spesifik biar Mas tau rusaknya dimana
    notify.error(
      "Upload Failed",
      error.message || "Gangguan koneksi, silakan coba lagi.",
    );
  } finally {
    uploading.value = false;
    cropperImg.value = null;
  }
};

// --- FUNGSI SUBMIT ---
const createListing = async () => {
  if (!form.value.name || !form.value.starting_bid || !form.value.image_url) {
    notify.error("Data Incomplete", "Foto utama & data wajib diisi!");
    return;
  }

  loading.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const calculatedEndTime = new Date();
    calculatedEndTime.setDate(
      calculatedEndTime.getDate() + parseInt(duration.value),
    );

    // Kumpulkan foto tambahan (slot 1, 2, 3) ke dalam array
    const additionalImages = imageSlots.value
      .slice(1)
      .filter((slot) => slot.url)
      .map((slot) => slot.url);

    const { error } = await supabase.from("products").insert({
      name: form.value.name,
      category: form.value.category,
      description: form.value.description,
      image_url: form.value.image_url, // Foto Utama (Slot 0)
      additional_images: additionalImages, // Foto 2,3,4 (Array)
      starting_bid: parseInt(form.value.starting_bid.replace(/[^0-9]/g, "")),
      owner_id: session?.user.id,
      status: "pending",
      end_time: calculatedEndTime.toISOString(),
      is_priority: false,
    });

    if (error) throw error;

    notify.success("Gacor!", "Lelang dikirim ke sistem approval!");
    router.push("/vault");
  } catch (error) {
    notify.error("System Error", error.message);
  } finally {
    loading.value = false;
  }
};

const formatCurrencyInput = (event) => {
  let value = event.target.value.replace(/[^0-9]/g, "");
  form.value.starting_bid = value
    ? new Intl.NumberFormat("id-ID").format(value)
    : "";
};
</script>

<template>
  <div
    class="min-h-screen bg-[#0a0a0a] pt-24 pb-32 px-6 text-white uppercase italic font-black"
  >
    <div class="max-w-md mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl tracking-tighter">
          New <span class="text-yellow-500">Asset</span>
        </h1>
        <button
          @click="router.back()"
          class="p-2 bg-white/5 rounded-xl border border-white/5"
        >
          <XMarkIcon class="w-6 h-6 text-gray-600" />
        </button>
      </div>

      <div
        class="bg-white/[0.02] border border-white/5 p-6 rounded-[35px] backdrop-blur-xl"
      >
        <div class="mb-8">
          <label class="text-[10px] text-yellow-500 tracking-[0.2em] block mb-4"
            >Item Visualization (Max 4)</label
          >

          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="(slot, index) in imageSlots"
              :key="index"
              class="relative group"
            >
              <div
                @click="triggerUpload(index)"
                :class="[
                  slot.url ? 'border-yellow-500/50' : 'border-white/10',
                  index === 0 ? 'h-40' : 'h-28',
                ]"
                class="bg-black/40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-white/[0.03] transition-all relative"
              >
                <img
                  v-if="slot.url"
                  :src="slot.url"
                  class="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  v-else
                  class="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity"
                >
                  <PlusIcon class="w-6 h-6 text-yellow-500 mb-1" />
                  <span class="text-[8px]">{{
                    index === 0 ? "MAIN FOTO" : "SLOT " + (index + 1)
                  }}</span>
                </div>

                <div
                  v-if="index === 0"
                  class="absolute top-2 left-2 bg-yellow-500 text-black text-[7px] px-2 py-0.5 rounded-full font-black"
                >
                  PRIMARY
                </div>
              </div>
            </div>
          </div>
          <input
            type="file"
            id="fileInput"
            class="hidden"
            @change="onFileChange"
            accept="image/*"
          />
        </div>

        <div class="space-y-5">
          <div>
            <label class="text-[10px] text-gray-600 block mb-2"
              >Designation</label
            >
            <div class="relative">
              <TagIcon class="absolute left-4 top-4 w-5 h-5 text-gray-700" />
              <input
                v-model="form.name"
                type="text"
                placeholder="ENTER NAME"
                class="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[11px] outline-none focus:border-yellow-500 text-white"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] text-gray-600 block mb-2"
                >Category</label
              >
              <div class="relative">
                <Squares2X2Icon
                  class="absolute left-4 top-4 w-5 h-5 text-gray-700"
                />
                <select
                  v-model="form.category"
                  class="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[11px] outline-none appearance-none"
                >
                  <option
                    v-for="cat in categories"
                    :key="cat"
                    :value="cat"
                    class="bg-gray-900"
                  >
                    {{ cat }}
                  </option>
                </select>
              </div>
            </div>
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase italic text-gray-500"
                >Durasi Lelang</label
              >
              <select
                v-model="duration"
                class="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white font-bold uppercase italic text-xs outline-none focus:border-yellow-500 transition-all"
              >
                <option value="1">1 Hari (Kilat)</option>
                <option value="3">3 Hari (Standar)</option>
                <option value="7">7 Hari (Mingguan)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-[10px] text-gray-600 block mb-2"
              >Opening Price (IDR)</label
            >
            <div class="relative">
              <CurrencyDollarIcon
                class="absolute left-4 top-4 w-5 h-5 text-gray-700"
              />
              <input
                v-model="form.starting_bid"
                @input="formatCurrencyInput"
                type="text"
                placeholder="0"
                class="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[11px] text-yellow-500 outline-none focus:border-yellow-500 font-black"
              />
            </div>
          </div>

          <div>
            <label class="text-[10px] text-gray-600 block mb-2"
              >Description</label
            >
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="DETAILS..."
              class="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-[11px] outline-none focus:border-yellow-500 resize-none font-bold normal-case text-white"
            ></textarea>
          </div>
        </div>

        <button
          @click="createListing"
          :disabled="loading || uploading"
          class="w-full mt-10 bg-yellow-500 text-black py-5 rounded-[25px] shadow-[0_20px_50px_rgba(234,179,8,0.2)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <CheckIcon v-if="!loading" class="w-6 h-6" />
          <span class="text-xs font-[1000] tracking-widest">{{
            loading ? "PROCESSING..." : "ESTABLISH AUCTION"
          }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="showCropper"
      class="fixed inset-0 z-[300] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/95 backdrop-blur-md"
        @click="showCropper = false"
      ></div>
      <div
        class="relative w-full max-w-lg bg-[#0d0d0d] border border-white/10 rounded-[40px] overflow-hidden p-8 shadow-2xl"
      >
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-sm tracking-[0.3em] text-yellow-500">
            CALIBRATE IMAGE
          </h2>
          <button @click="showCropper = false">
            <XMarkIcon class="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div class="h-80 w-full bg-black rounded-3xl overflow-hidden mb-8">
          <Cropper
            ref="cropperRef"
            class="h-full"
            :src="cropperImg"
            :stencil-props="{ aspectRatio: 1 / 1 }"
          />
        </div>

        <button
          @click="cropImage"
          class="w-full bg-white text-black py-5 rounded-[24px] font-black text-xs tracking-widest active:scale-95 transition-all"
        >
          APPLY & CAPTURE
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Untuk menyembunyikan scrollbar select di mobile */
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='激19l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1em;
}
</style>
