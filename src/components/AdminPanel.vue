<script setup>
import { ref, watch, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";

const props = defineProps(["isEditMode", "editData", "products"]);
const emit = defineEmits([
  "add-product",
  "delete-product",
  "close",
  "edit-product",
  "update-product",
]);

const confirmDelete = (product) => {
  if (
    confirm(`Yakin mau hapus product "${product.name}"? Tindakan ini permanen`)
  ) {
    emit("delete-product", product.id);
  }
};

const isUploading = ref(false);
const imageUrl = ref("");

const uploadImage = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    isUploading.value = true;
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    imageUrl.value = publicUrlData.publicUrl;
    alert("Gambar berhasil diunggah!");
  } catch (error) {
    alert("Gagal mengunggah gambar: " + error.message);
  } finally {
    isUploading.value = false;
  }
};

const newProduct = ref({
  name: "",
  price: 0,
  category: "GADGET",
  image: imageUrl, // Akan diupdate setelah upload
});

const isSaving = ref(false);

const submitForm = () => {
  const name = newProduct.value.name;
  const price = Number(newProduct.value.price);
  const category = newProduct.value.category;

  if (name.trim() === "" || price <= 0) {
    alert("Nama dan harga harus diisi dengan benar!");
    return;
  }
  if (!imageUrl.value) {
    alert("Silakan unggah gambar produk terlebih dahulu!");
    return;
  }

  try {
    isSaving.value = true;

    const productData = {
      name: name,
      price: price,
      category: category,
      image: imageUrl.value, // Pastikan URL gambar terbaru digunakan
    };

    if (props.isEditMode) {
      emit("update-product", { ...productData, id: props.editData.id });
    } else {
      emit("add-product", productData);
    }

    //Reset form setelah edit
    if (!props.isEditMode) {
      newProduct.value = {
        name: "",
        price: 0,
        category: "GADGET",
        image: "", // Reset URL gambar setelah submit
      };
    }

    alert("Produk Berhasil Masuk Katalog! 🚀");
    // Reset URL gambar setelah submit
  } catch (error) {
    alert("Gagal menyimpan produk: " + error.message);
  } finally {
    isSaving.value = false;
  }
};

//ResetForm
const resetForm = () => {
  newProduct.value = {
    id: null,
    name: "",
    price: 0,
    category: "GADGET",
    image: "", // Reset URL gambar
  };
  imageUrl.value = ""; // Reset preview gambar
};

//Pantau perubahan props untuk update form edit
watch(
  () => props.editData,
  (newVal) => {
    if (props.isEditMode && newVal) {
      // isi otomatis kotak input dengan data lama saat edit
      newProduct.value = {
        id: newVal.id,
        name: newVal.name,
        price: newVal.price,
        category: newVal.category,
        image: newVal.image,
      };
      //tampilkan gambar lama di preview
      imageUrl.value = newVal.image; // Update URL gambar saat data edit berubah
    } else {
      // Reset form jika tidak dalam mode edit
      resetForm();
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (props.isEditMode && props.editData) {
    newProduct.value = { ...props.editData };
    imageUrl.value = props.editData.image; // Set URL gambar dari data yang diedit
  }
});
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  >
    <div
      class="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <div class="p-6 border-b flex justify-between items-center bg-gray-50/50">
        <div>
          <h1
            class="text-xs font-black text-blue-600 uppercase tracking-widest"
          >
            Admin Dashboard
          </h1>
          <h2 class="text-2xl font-bold text-gray-800">
            {{ isEditMode ? "🛠️ Edit Produk" : "➕ Tambah Produk" }}
          </h2>
        </div>
        <button
          @click="$emit('close')"
          class="bg-gray-100 hover:bg-red-50 hover:text-red-500 w-10 h-10 rounded-full flex items-center justify-center transition-all text-2xl"
        >
          &times;
        </button>
      </div>

      <div class="p-6 overflow-y-auto custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-gray-400 ml-2"
                >NAMA PRODUK</label
              >
              <input
                v-model="newProduct.name"
                type="text"
                placeholder="Contoh: iPhone 15 Pro"
                class="p-4 rounded-2xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-gray-400 ml-2"
                >HARGA (RP)</label
              >
              <input
                v-model.number="newProduct.price"
                type="number"
                placeholder="15000000"
                class="p-4 rounded-2xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-gray-400 ml-2"
                >KATEGORI</label
              >
              <select
                v-model="newProduct.category"
                class="p-4 rounded-2xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
              >
                <option value="GADGET">GADGET 📱</option>
                <option value="AUDIO">AUDIO 🎧</option>
                <option value="PHOTOGRAPHY">PHOTOGRAPHY 📷</option>
              </select>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-gray-400 ml-2"
                >FOTO PRODUK</label
              >
              <div class="relative group">
                <input
                  type="file"
                  accept="image/*"
                  @change="uploadImage"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  class="p-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center group-hover:border-blue-400 transition-colors bg-gray-50"
                >
                  <span class="text-2xl mb-2">📸</span>
                  <span class="text-xs font-bold text-gray-500"
                    >Klik untuk upload foto</span
                  >
                </div>
              </div>
            </div>

            <div
              v-if="imageUrl || isUploading"
              class="relative rounded-2xl overflow-hidden shadow-inner bg-gray-100 h-40 flex items-center justify-center"
            >
              <div
                v-if="isUploading"
                class="absolute inset-0 bg-white/80 flex items-center justify-center z-10"
              >
                <div class="flex flex-col items-center">
                  <div
                    class="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <p
                    class="text-[10px] font-black text-blue-600 mt-2 tracking-widest"
                  >
                    UPLOADING...
                  </p>
                </div>
              </div>
              <img
                v-if="imageUrl"
                :src="imageUrl"
                class="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div class="mt-10 border-t pt-8">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            📦 Daftar Inventaris
            <span
              class="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full"
              >{{ products.length }}</span
            >
          </h3>
          <div class="overflow-x-auto rounded-2xl border border-gray-100">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr
                  class="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest"
                >
                  <th class="p-4">Produk</th>
                  <th class="p-4">Harga</th>
                  <th class="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="product in products"
                  :key="product.id"
                  class="border-b last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td class="p-4">
                    <div class="font-bold text-sm text-gray-700">
                      {{ product.name }}
                    </div>
                    <div class="text-[10px] text-gray-400 uppercase">
                      {{ product.category }}
                    </div>
                  </td>
                  <td class="p-4 text-sm font-medium text-gray-600">
                    Rp {{ product.price.toLocaleString() }}
                  </td>
                  <td class="p-4">
                    <div class="flex justify-center gap-2">
                      <button
                        @click.stop="$emit('edit-product', product)"
                        class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-600 hover:text-white transition-all"
                      >
                        EDIT
                      </button>
                      <button
                        @click.stop="confirmDelete(product)"
                        class="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-bold text-[10px] hover:bg-red-600 hover:text-white transition-all"
                      >
                        HAPUS
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="p-6 bg-gray-50 border-t flex gap-3">
        <button
          @click="$emit('close')"
          class="flex-1 p-4 rounded-2xl bg-white border border-gray-200 font-bold text-gray-500 hover:bg-gray-100 transition-all"
        >
          BATAL
        </button>
        <button
          @click="submitForm"
          :disabled="isSaving || isUploading"
          class="flex-2 p-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2"
          :class="
            isSaving || isUploading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
          "
        >
          <span
            v-if="isSaving"
            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          {{
            isSaving
              ? "MENYIMPAN..."
              : isEditMode
                ? "SIMPAN PERUBAHAN"
                : "TAMBAH KE KATALOG"
          }}
        </button>
      </div>
    </div>
  </div>
</template>
