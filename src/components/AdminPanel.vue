<script setup>
import { ref } from "vue";

const props = defineProps(["products"]);
const emit = defineEmits(["add-product", "delete-product", "close"]);

const newProduct = ref({
  name: "",
  price: 0,
  category: "Laptop",
  image: "https://via.placeholder.com/150",
});

const submitForm = () => {
  if (newProduct.value.name && newProduct.value.price > 0) {
    // Kirim data ke App.vue (Si Bos Utama)
    emit("add-product", { ...newProduct.value, id: Date.now() });
    // Reset form
    newProduct.value = {
      name: "",
      price: 0,
      category: "Laptop",
      image: "https://via.placeholder.com/150",
    };
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
            <option>Laptop</option>
            <option>Aksesoris</option>
            <option>Monitor</option>
          </select>
          <input
            v-model="newProduct.image"
            type="text"
            placeholder="Link Gambar (URL)"
            class="p-3 rounded-xl border"
          />
        </div>
        <button
          @click="submitForm"
          class="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
        >
          Simpan Produk
        </button>
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
