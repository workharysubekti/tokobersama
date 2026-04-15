<script setup>
import { ref } from "vue";
import { supabase } from "../lib/supabase.js";

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

const props = defineProps(["products"]);
const emit = defineEmits(["add-product", "delete-product", "close"]);

const newProduct = ref({
  name: "",
  price: 0,
  category: "Laptop",
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

    // Kirim data ke App.vue (Si Bos Utama)
    emit("add-product", {
      name: name,
      price: price,
      category: category,
      image: imageUrl.value,
    });

    // Reset form
    newProduct.value = {
      name: "",
      price: 0,
      category: "Laptop",
      image: "",
    };

    imageUrl.value = "";
    alert("Produk Berhasil Masuk Katalog! 🚀");
    // Reset URL gambar setelah submit
  } catch (error) {
    alert("Gagal menyimpan produk: " + error.message);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-white z-[150] overflow-y-auto p-6">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-black text-slate-900">ADMIN DASHBOARD</h1>
        <button
          @click="$emit('close')"
          class="bg-red-500 text-white px-4 py-2 rounded-xl font-bold"
        >
          Keluar
        </button>
      </div>

      <div class="bg-gray-50 p-6 rounded-3xl mb-8 border border-gray-100">
        <h3 class="font-bold mb-4">Tambah Produk Baru</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            v-model="newProduct.name"
            type="text"
            placeholder="Nama Produk"
            class="p-3 rounded-xl border"
          />
          <input
            v-model.number="newProduct.price"
            type="number"
            placeholder="Harga"
            class="p-3 rounded-xl border"
          />
          <select v-model="newProduct.category" class="p-3 rounded-xl border">
            <option>GAGDET</option>
            <option>AUDIO</option>
            <option>PHOTOGRAPHY</option>
          </select>
          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700">Gambar Produk</label>
            <input
              type="file"
              accept="image/*"
              @change="uploadImage"
              class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
            />
            <p v-if="isUploading" class="text-xs text-blue-600 animate-pulse">
              Mengunggah gambar...
            </p>
          </div>
          <div
            v-if="imageUrl"
            class="mt-4 p-2 border-2 border-dashed border-blue-100 rounded-2xl"
          >
            <p class="text-[10px] font-bold text-blue-600 mb-2 uppercase">
              Preview Foto:
            </p>
            <img
              :src="imageUrl"
              class="w-full h-40 object-cover rounded-xl shadow-md"
            />
          </div>
          <p>
            <button
              @click="submitForm"
              :disable="isSaving"
              class="w-full py-3 rounded-xl font-black text-white transition-all"
              :class="
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              "
            >
              <span
                v-if="isSaving"
                class="flex items-center justify-center gap-2"
              >
                <svg
                  class="animate-spin h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                >
                  ...
                </svg>
                MENYIMPAN...
              </span>
              Simpan Produk
            </button>
          </p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b text-gray-400 text-sm">
              <th class="pb-4">Produk</th>
              <th class="pb-4">Harga</th>
              <th class="pb-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id" class="border-b">
              <td class="py-4 font-bold text-sm">{{ product.name }}</td>
              <td class="py-4 text-sm">
                Rp {{ product.price.toLocaleString() }}
              </td>
              <td class="py-4">
                <button
                  @click="$emit('delete-product', product.id)"
                  class="text-red-500 font-bold text-xs"
                >
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
