<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";

const router = useRouter();
const products = ref([]);
const isLocked = ref(true); // Status terkunci
const passcode = ref("");
const isUploading = ref(false);
const isSaving = ref(false);
const imageUrl = ref("");
const isEditMode = ref(false);
const editingId = ref(null);

const startEdit = (product) => {
  isEditMode.value = true;
  editingId.value = product.id;

  // Masukkan data produk ke form input
  newProduct.value = {
    name: product.name,
    price: product.price,
    category: product.category,
  };
  imageUrl.value = product.image;

  // Scroll otomatis ke atas biar kelihatan form-nya
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const newProduct = ref({
  name: "",
  price: 0,
  category: "GADGET",
  image: "",
});

// --- SISTEM KEAMANAN ---
const unlock = () => {
  if (passcode.value === "1204") {
    // Ganti password sesukamu di sini
    isLocked.value = false;
  } else {
    alert("Passcode Salah!");
    passcode.value = "";
  }
};

// --- AMBIL DATA INVENTARIS ---
const fetchProducts = async () => {
  const { data, error } = await supabase.from("products").select("*");
  if (!error) products.value = data;
};

// --- LOGIC TOMBOL CLOSE/CANCEL ---
const goBack = () => {
  router.push("/"); // Kembali ke Home
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
  } catch (e) {
    alert("Gagal upload: " + e.message);
  } finally {
    isUploading.value = false;
  }
};

const submitForm = async () => {
  if (
    !newProduct.value.name ||
    newProduct.value.price <= 0 ||
    !imageUrl.value
  ) {
    alert("Isi semua data dengan benar!");
    return;
  }
  try {
    isSaving.value = true;
    if (isEditMode.value) {
      const { error } = await supabase
        .from("products")
        .update({ ...newProduct.value, image: imageUrl.value })
        .eq("id", editingId.value);
      if (error) throw error;
      alert("Produk Berhasil Diperbarui!");
    } else {
      const { error } = await supabase
        .from("products")
        .insert({ ...newProduct.value, image: imageUrl.value });
      if (error) throw error;
      alert("Produk Berhasil Ditambah!");
    }

    //Reset status
    isEditMode.value = false;
    editingId.value = null;
    fetchProducts();
    resetForm();
  } catch (e) {
    alert(e.message);
  } finally {
    isSaving.value = false;
  }
};

const deleteProduct = async (id) => {
  if (confirm("Yakin hapus?")) {
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  }
};

onMounted(fetchProducts);
</script>

<template>
  <div
    v-if="isLocked"
    class="fixed inset-0 bg-slate-900 z-[10000] flex items-center justify-center p-6"
  >
    <div
      class="bg-white p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl"
    >
      <div class="text-4xl mb-4">🔐</div>
      <h2 class="text-xl font-black mb-2">Admin Access</h2>
      <p class="text-gray-400 text-sm mb-6">Masukkan kode rahasia</p>
      <input
        v-model="passcode"
        type="password"
        @keyup.enter="unlock"
        placeholder="****"
        class="w-full p-4 bg-gray-100 rounded-2xl text-center text-2xl tracking-[1rem] outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="goBack"
          class="p-4 bg-gray-100 rounded-2xl font-bold text-gray-500"
        >
          BATAL
        </button>
        <button
          @click="unlock"
          class="p-4 bg-blue-600 rounded-2xl font-bold text-white"
        >
          MASUK
        </button>
      </div>
    </div>
  </div>

  <div class="min-h-screen bg-gray-50 pb-20">
    <div
      class="bg-white p-6 border-b flex justify-between items-center sticky top-0 z-50"
    >
      <div>
        <h1 class="text-blue-600 font-black text-xs uppercase tracking-widest">
          Dashboard
        </h1>
        <h2 class="text-xl font-bold">Manajemen Toko</h2>
      </div>
      <button
        @click="goBack"
        class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold"
      >
        ×
      </button>
    </div>

    <div class="p-4 max-w-4xl mx-auto space-y-6">
      <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <h3 class="font-bold mb-4">Tambah Produk Baru</h3>
        <div class="space-y-4">
          <input
            v-model="newProduct.name"
            type="text"
            placeholder="Nama Produk"
            class="w-full p-4 bg-gray-50 rounded-2xl outline-none"
          />
          <input
            v-model.number="newProduct.price"
            type="number"
            placeholder="Harga"
            class="w-full p-4 bg-gray-50 rounded-2xl outline-none"
          />
          <select
            v-model="newProduct.category"
            class="w-full p-4 bg-gray-50 rounded-2xl outline-none"
          >
            <option value="GADGET">GADGET</option>
            <option value="AUDIO">AUDIO</option>
            <option value="PHOTOGRAPHY">PHOTOGRAPHY</option>
          </select>
          <div
            class="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center relative hover:bg-gray-50 transition-all"
          >
            <input
              type="file"
              @change="uploadImage"
              class="absolute inset-0 opacity-0 cursor-pointer"
            />
            <p v-if="!imageUrl" class="text-gray-400 font-bold text-sm">
              Klik untuk upload foto
            </p>
            <img
              v-else
              :src="imageUrl"
              class="h-32 mx-auto rounded-xl object-cover"
            />
          </div>
          <button
            @click="submitForm"
            :disabled="isSaving || isUploading"
            class="w-full p-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 disabled:bg-gray-300"
          >
            {{ isSaving ? "MENYIMPAN..." : "POST KE TOKO" }}
          </button>
        </div>
      </div>

      <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <h3 class="font-bold mb-4">Stok Barang ({{ products.length }})</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr
                class="text-[10px] text-gray-400 uppercase font-black border-b"
              >
                <th class="pb-4">Barang</th>
                <th class="pb-4">Harga</th>
                <th class="pb-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody v-if="products && products.length > 0">
              <tr
                v-for="product in products"
                :key="product.id"
                class="border-b last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td class="py-4">
                  <div class="flex items-center gap-3">
                    <img
                      :src="product.image"
                      class="w-10 h-10 rounded-lg object-cover border"
                    />
                    <div>
                      <p class="font-bold text-sm text-gray-700 leading-none">
                        {{ product.name }}
                      </p>
                      <p class="text-[10px] text-gray-400 uppercase mt-1">
                        {{ product.category }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="py-4 text-sm font-medium text-gray-600">
                  Rp {{ product.price.toLocaleString() }}
                </td>
                <td class="py-4 text-center">
                  <div class="flex justify-center gap-2">
                    <button
                      @click="startEdit(product)"
                      class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-600 hover:text-white transition-all uppercase"
                    >
                      Edit
                    </button>

                    <button
                      @click="deleteProduct(product.id)"
                      class="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-bold text-[10px] hover:bg-red-600 hover:text-white transition-all uppercase"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
