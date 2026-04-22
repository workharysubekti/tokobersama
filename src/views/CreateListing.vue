<script setup>
import { ref } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { notify } from "../utils/notify";
import {
  PhotoIcon,
  TagIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const loading = ref(false);
const uploading = ref(false);

const categories = [
  "TCG",
  "FIGURE",
  "DIECAST",
  "THRIFT",
  "VIRTUAL ITEM",
  "EKSKLUSIF",
];

const form = ref({
  name: "", // Menggunakan 'name' agar sinkron dengan database
  category: "TCG",
  description: "",
  starting_bid: "",
  end_time: "", // Menggunakan 'end_time' agar sinkron dengan AdminPanel
  image_url: "",
});

// --- FUNGSI UPLOAD ---
const handleImageUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    uploading.value = true;
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("auction_items")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("auction_items")
      .getPublicUrl(filePath);
    form.value.image_url = data.publicUrl;

    notify.success("Asset Captured", "Foto berhasil masuk ke system.");
  } catch (error) {
    notify.error("Upload Failed", error.message);
  } finally {
    uploading.value = false;
  }
};

// --- FUNGSI SUBMIT KE TABEL PRODUCTS ---
const createListing = async () => {
  if (
    !form.value.name ||
    !form.value.starting_bid ||
    !form.value.image_url ||
    !form.value.end_time
  ) {
    notify.error("Data Incomplete", "Semua kolom wajib diisi!");
    return;
  }

  loading.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // PERBAIKAN: Field disesuaikan dengan database dan filter Home.vue
    const { error } = await supabase.from("products").insert({
      name: form.value.name, // Gunakan 'name', bukan 'title'
      category: form.value.category,
      description: form.value.description,
      image_url: form.value.image_url,
      starting_bid: parseInt(form.value.starting_bid.replace(/[^0-9]/g, "")),
      owner_id: session?.user.id,
      status: "pending", // Review admin..
      end_time: new Date(form.value.end_time).toISOString(),
      is_priority: false,
    });

    if (error) throw error;

    notify.success("Gacor!", "Barang muncul di Home & Vault!");
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
        <div class="mb-6">
          <label class="text-[10px] text-yellow-500 tracking-[0.2em] block mb-2"
            >Item Visualization</label
          >
          <div class="relative group">
            <label
              class="h-56 bg-black/50 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-500/50 transition-all active:scale-[0.98]"
            >
              <input
                type="file"
                @change="handleImageUpload"
                class="hidden"
                accept="image/*"
              />
              <img
                v-if="form.image_url"
                :src="form.image_url"
                class="absolute inset-0 w-full h-full object-cover z-0"
              />
              <div class="relative z-10 flex flex-col items-center">
                <PhotoIcon
                  class="w-10 h-10 text-gray-700 group-hover:text-yellow-500 mb-2 transition-colors"
                />
                <span
                  class="text-[10px] text-gray-600 group-hover:text-yellow-500 tracking-[0.2em]"
                >
                  {{
                    uploading
                      ? "UPLOADING..."
                      : form.image_url
                        ? "CHANGE PHOTO"
                        : "ATTACH PHOTO"
                  }}
                </span>
              </div>
            </label>
          </div>
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
            <div>
              <label class="text-[10px] text-gray-600 block mb-2"
                >Deadline</label
              >
              <div class="relative">
                <CalendarDaysIcon
                  class="absolute left-4 top-4 w-5 h-5 text-gray-700"
                />
                <input
                  v-model="form.end_time"
                  type="datetime-local"
                  class="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[11px] outline-none focus:border-yellow-500 text-white"
                />
              </div>
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
  </div>
</template>
