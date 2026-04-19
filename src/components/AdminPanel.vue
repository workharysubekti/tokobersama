<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  LockClosedIcon,
  PhotoIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilSquareIcon,
  ClockIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({
  userProfile: Object,
});

const router = useRouter();
const products = ref([]);
const isLocked = ref(true);
const passcode = ref("");
const isUploading = ref(false);
const isSaving = ref(false);
const imageUrl = ref("");
const isEditMode = ref(false);
const editingId = ref(null);

// Form Bid Baru (Sesuaikan kolom database Mas)
const newProduct = ref({
  name: "",
  current_bid: 0,
  category: "GADGET",
  image_url: "",
  end_time: "", // Tambahan untuk limit lelang
});

const unlock = () => {
  if (passcode.value === "1204") {
    isLocked.value = false;
  } else {
    alert("Passcode Salah!");
    passcode.value = "";
  }
};

const fetchProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (!error) products.value = data;
};

const uploadImage = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    isUploading.value = true;
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);
    imageUrl.value = publicUrlData.publicUrl;
    newProduct.value.image_url = publicUrlData.publicUrl;
  } catch (e) {
    alert("Gagal upload: " + e.message);
  } finally {
    isUploading.value = false;
  }
};

const submitForm = async () => {
  if (
    !newProduct.value.name ||
    newProduct.value.current_bid <= 0 ||
    !newProduct.value.image_url
  ) {
    alert("Isi semua data termasuk foto!");
    return;
  }

  try {
    isSaving.value = true;
    if (isEditMode.value) {
      const { error } = await supabase
        .from("products")
        .update(newProduct.value)
        .eq("id", editingId.value);
      if (error) throw error;
      alert("Bid Berhasil Diperbarui!");
    } else {
      const { error } = await supabase
        .from("products")
        .insert([newProduct.value]);
      if (error) throw error;
      alert("Bid Berhasil Dibuka!");
    }

    resetForm();
    fetchProducts();
  } catch (e) {
    alert(e.message);
  } finally {
    isSaving.value = false;
  }
};

const startEdit = (product) => {
  isEditMode.value = true;
  editingId.value = product.id;
  newProduct.value = {
    name: product.name,
    current_bid: product.current_bid,
    category: product.category,
    image_url: product.image_url,
    end_time: product.end_time || "",
  };
  imageUrl.value = product.image_url;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const deleteProduct = async (id) => {
  if (confirm("Hapus item lelang ini?")) {
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  }
};

const resetForm = () => {
  newProduct.value = {
    name: "",
    current_bid: 0,
    category: "GADGET",
    image_url: "",
    end_time: "",
  };
  imageUrl.value = "";
  isEditMode.value = false;
  editingId.value = null;
};

onMounted(() => {
  fetchProducts();

  //untuk sekarang cuman owner yang bisa
  if (props.userProfile?.username !== "harysubekti20@gmail.com") {
    router.push("/");
  }
});
</script>

<template>
  <div
    v-if="isLocked"
    class="fixed inset-0 bg-[#0a0a0a] z-[10000] flex items-center justify-center p-6"
  >
    <div
      class="bg-[#16191e] border border-white/5 p-8 rounded-[2.5rem] w-full max-w-sm text-center shadow-2xl"
    >
      <div
        class="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-yellow-500/20"
      >
        <LockClosedIcon class="w-8 h-8 text-yellow-500" />
      </div>
      <h2
        class="text-xl font-black text-white italic uppercase tracking-tighter mb-2"
      >
        Vault Access
      </h2>
      <p class="text-gray-500 text-[10px] uppercase tracking-widest mb-8">
        Masukkan Kode Otoritas
      </p>

      <input
        v-model="passcode"
        type="password"
        @keyup.enter="unlock"
        placeholder="****"
        class="w-full p-4 bg-black/40 border border-white/5 rounded-2xl text-center text-2xl tracking-[1rem] text-yellow-500 outline-none focus:border-yellow-500/50 mb-6 font-black"
      />

      <div class="grid grid-cols-2 gap-4">
        <button
          @click="router.push('/')"
          class="p-4 bg-white/5 rounded-2xl font-black text-gray-500 text-[11px] uppercase italic tracking-widest"
        >
          Batal
        </button>
        <button
          @click="unlock"
          class="p-4 bg-yellow-500 rounded-2xl font-black text-black text-[11px] uppercase italic tracking-widest"
        >
          Unlock
        </button>
      </div>
    </div>
  </div>

  <div class="min-h-screen bg-[#0a0a0a] text-white pb-32">
    <div
      class="bg-black/60 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 px-6 py-5"
    >
      <div class="max-w-4xl mx-auto flex justify-between items-center">
        <div>
          <p
            class="text-yellow-500 font-black text-[9px] uppercase tracking-[0.4em] mb-1"
          >
            Command Center
          </p>
          <h2 class="text-xl font-black italic uppercase tracking-tighter">
            Auction <span class="text-gray-500">Manager</span>
          </h2>
        </div>
        <button
          @click="router.push('/')"
          class="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-red-500/20 transition-all"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <div class="p-6 max-w-4xl mx-auto space-y-8">
      <div
        class="bg-[#16191e] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
      >
        <div
          class="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[50px]"
        ></div>

        <h3
          class="font-black italic uppercase tracking-tighter text-lg mb-6 flex items-center"
        >
          <span class="w-2 h-6 bg-yellow-500 mr-3 rounded-full"></span>
          {{ isEditMode ? "Modify" : "Launch" }} New Bid
        </h3>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label
                class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block"
                >Nama Koleksi</label
              >
              <input
                v-model="newProduct.name"
                type="text"
                class="w-full p-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-yellow-500/50 text-sm font-bold uppercase italic tracking-tight"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block"
                  >Starting Bid</label
                >
                <input
                  v-model.number="newProduct.current_bid"
                  type="number"
                  class="w-full p-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-yellow-500/50 text-sm font-black text-yellow-500"
                />
              </div>
              <div>
                <label
                  class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block"
                  >Kategori</label
                >
                <select
                  v-model="newProduct.category"
                  class="w-full p-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-yellow-500/50 text-xs font-bold uppercase"
                >
                  <option value="GADGET">GADGET</option>
                  <option value="AUDIO">AUDIO</option>
                  <option value="PHOTOGRAPHY">PHOTOGRAPHY</option>
                </select>
              </div>
            </div>

            <div>
              <label
                class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block flex items-center gap-2"
              >
                <ClockIcon class="w-3 h-3" /> End Date/Time
              </label>
              <input
                v-model="newProduct.end_time"
                type="datetime-local"
                class="w-full p-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-yellow-500/50 text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div class="flex flex-col">
            <label
              class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block"
              >Visual Data</label
            >
            <div
              class="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center relative hover:bg-white/5 transition-all min-h-[200px]"
            >
              <input
                type="file"
                @change="uploadImage"
                class="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div v-if="!imageUrl" class="text-center">
                <PhotoIcon class="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p
                  class="text-[10px] font-black text-gray-500 uppercase tracking-widest"
                >
                  Drop Image Here
                </p>
              </div>
              <img
                v-else
                :src="imageUrl"
                class="w-full h-full object-cover rounded-2xl p-2"
              />
              <div
                v-if="isUploading"
                class="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl"
              >
                <div
                  class="animate-spin h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 flex gap-4">
          <button
            v-if="isEditMode"
            @click="resetForm"
            class="flex-1 p-4 bg-white/5 text-gray-500 rounded-2xl font-black text-[11px] uppercase italic tracking-widest"
          >
            Batal Edit
          </button>
          <button
            @click="submitForm"
            :disabled="isSaving || isUploading"
            class="flex-[2] p-4 bg-yellow-500 text-black rounded-2xl font-[900] text-[11px] uppercase italic tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.3)] active:scale-95 transition-all disabled:opacity-50"
          >
            {{
              isSaving
                ? "SYNCING..."
                : isEditMode
                  ? "UPDATE AUCTION"
                  : "OPEN BID NOW"
            }}
          </button>
        </div>
      </div>

      <div class="bg-[#16191e] border border-white/5 rounded-[2.5rem] p-8">
        <h3 class="font-black italic uppercase tracking-tighter text-lg mb-6">
          Live <span class="text-yellow-500">Vault</span> ({{
            products.length
          }})
        </h3>
        <div class="space-y-3">
          <div
            v-for="product in products"
            :key="product.id"
            class="flex items-center bg-black/40 border border-white/5 p-4 rounded-2xl group hover:border-yellow-500/30 transition-all"
          >
            <img
              :src="product.image_url"
              class="w-12 h-12 rounded-xl object-cover border border-white/10"
            />
            <div class="flex-1 ml-4">
              <p
                class="font-black text-xs text-white uppercase italic tracking-tight"
              >
                {{ product.name }}
              </p>
              <p class="text-[9px] text-gray-600 font-mono mt-1 uppercase">
                {{ product.category }} //
                {{ product.end_time ? "Timed" : "Open" }}
              </p>
            </div>
            <div class="text-right mr-6">
              <p class="text-yellow-500 font-black text-sm italic">
                Rp {{ product.current_bid?.toLocaleString() }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="startEdit(product)"
                class="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-yellow-500 transition-colors"
              >
                <PencilSquareIcon class="w-4 h-4" />
              </button>
              <button
                @click="deleteProduct(product.id)"
                class="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
