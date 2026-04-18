<script setup>
import { ref, computed, onMounted } from "vue";
import { productsData } from "../data/products.js";
import { supabase } from "../lib/supabase.js";
import ProductCard from "../components/ProductCard.vue";
import CartModal from "../components/CartModal.vue";
import Toast from "../components/Toast.vue";
import AdminPanel from "../components/AdminPanel.vue";

// --- GLOBAL STATE ---
const isLoading = ref(true);
const searchQuery = ref("");
const selectedCategory = ref("SEMUA");
const categories = ["GADGET", "PHOTOGRAPHY", "AUDIO"];

// --- UI STATE (Modal, Toast, Slider) ---
const currentSlide = ref(0);
const banners = [
  // Gak perlu ref kalau datanya statis
  "https://picsum.photos/id/250/800/800",
  "https://picsum.photos/id/447/800/800",
  "https://picsum.photos/id/26/800/800",
];

const toast = ref({ show: false, message: "" });
const isCartOpen = ref(false);
const isCheckoutOpen = ref(false);
const isEditMode = ref(false);

// --- DATA STATE ---
const products = ref([]);

// Fetch produk dari Supabase
const fetchProducts = async () => {
  const { data, error } = await supabase.from("products").select("*");
  if (error) {
    console.error("Error fetching products:", error);
    // Set ke array kosong kalau error
  } else {
    console.log("Fetched products:", data);
    products.value = data;
  }
};

// --- CART LOGIC ---
const cart = ref([]); // Kita pakai satu nama saja: cart
const cartCount = computed(() => cart.value.length);
const totalPrice = computed(() =>
  cart.value.reduce((total, item) => total + item.price, 0),
);

const addToCart = (product) => {
  cart.value.push({ ...product, cartId: Date.now() });

  // Trigger Toast (Logika simpel)
  toast.value = { show: true, message: `${product.name} masuk keranjang!` };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

const removeFromCart = (index) => {
  cart.value.splice(index, 1);
};

// --- FILTER LOGIC ---
const filteredProducts = computed(() => {
  if (!products.value || products.value.length === 0) return [];
  return products.value.filter((p) => {
    const s = searchQuery.value ? searchQuery.value.toLowerCase() : "";
    const productName = p.name ? p.name.toLowerCase() : "";

    const matchSearch = productName.includes(s);

    const productCategory = p.category ? p.category.toUpperCase() : "";
    const matchCategory =
      selectedCategory.value === "SEMUA" ||
      productCategory === selectedCategory.value.toUpperCase();

    return matchSearch && matchCategory;
  });
});

// --- LIFECYCLE & HELPERS ---
onMounted(async () => {
  await fetchProducts();
  // Slider Interval
  setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % banners.length;
  }, 3000);

  // Fake Loading
  setTimeout(() => {
    isLoading.value = false;
  }, 1500);
});

const openCartModal = () => {
  if (cartCount.value === 0) {
    toast.value = { show: true, message: "Keranjang masih kosong, Mas!" };
    setTimeout(() => {
      toast.value.show = false;
    }, 2000);
    return;
  }
  isCartOpen.value = true;
};

const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

//-- ADMIN PANEL LOGIC --
// Di dalam <script setup> App.vue
const isAdminOpen = ref(false);

// Fungsi Tambah Produk dari Admin
const handleAddProduct = async (newItem) => {
  try {
    // 1. Kirim data ke tabel Supabase
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: newItem.name,
          price: parseInt(newItem.price), // Pastikan harga disimpan sebagai angka
          category: newItem.category,
          image: newItem.image,
        },
      ])
      .select();

    if (error) throw error;

    // Update tampilan lokal
    if (data) {
      products.value.push(data[0]); // Tambahkan produk baru ke state lokal
      toast.value = { show: true, message: "Produk berhasil ditambahkan!" };
    }
  } catch (error) {
    console.error("Error adding product:", error.message);
    alert("Gagal Simpan Data: " + error.message);
  } finally {
    setTimeout(() => (toast.value.show = false), 2000);
  }
};

// Fungsi Hapus Produk dari Admin
const handleDeleteProduct = async (id) => {
  const confirmHapus = confirm("Yakin mau hapus produk ini dari Database?");
  if (!confirmHapus) return;

  try {
    const { data: produk } = await supabase
      .from("products")
      .select("image")
      .eq("id", id)
      .single();

    if (produk && produk.image) {
      // Ekstrak nama file dari URL
      const fileName = produk.image.split("/").pop();

      // Hapus gambar dari storage
      const { error: storageError } = await supabase.storage
        .from("product-images")
        .remove([fileName]);

      if (storageError) {
        console.error("Gagal hapus gambar dari storage:", storageError.message);
      }
    }

    const { error: dbError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;
    // Update tampilan lokal
    products.value = products.value.filter((p) => p.id !== id);
    toast.value = { show: true, message: "Produk berhasil dihapus!" };
    setTimeout(() => (toast.value.show = false), 2000);
  } catch (error) {
    alert("Gagal Hapus Data: " + error.message);
  }
};

// Passcode sementara karena belum ada database
const handleOpenAdmin = () => {
  const passcode = prompt("Masukkan passcode admin:");
  if (passcode === "zysoo1204") {
    isAdminOpen.value = true;
    toast.value = { show: true, message: "Selamat datang, Admin!" };
    setTimeout(() => (toast.value.show = false), 2000);
  } else {
    alert("Passcode salah, Ente bukan Admin!");
  }
};

// Tambahkan ini di dalam script setup Mas
const isModalOpen = ref(false);

//--Editing Form Product--
const isEditing = ref(false);
const currentProduct = ref(null);
const editingProduct = ref(null);
// Fungsi untuk membuka form edit dengan data produk yang dipilih
const openEditForm = (product) => {
  isEditMode.value = true;
  editingProduct.value = { ...product }; // Clone data untuk diedit
  isAdminOpen.value = true; // Pastikan admin panel terbuka
};

//Fungsi Reset kalau modal ditutup
const closeAdminPanel = () => {
  isEditMode.value = false;
  editingProduct.value = null;
  isAdminOpen.value = false;
};

// Fungsi untuk menyimpan perubahan produk setelah diedit
const handleUpdateProduct = async (updatedData) => {
  console.log("Data yang mau diupdate:", updatedData);
  try {
    //1. Update data di Supabase
    const { error } = await supabase
      .from("products")
      .update({
        name: updatedData.name,
        price: updatedData.price,
        category: updatedData.category,
        image: updatedData.image,
      })
      .eq("id", updatedData.id);

    if (error) throw error;

    // 2. Jika sukses di DB, baru uppdate di web
    const index = products.value.findIndex((p) => p.id === updatedData.id);
    if (index !== -1) {
      products.value[index] = { ...updatedData };
    }

    toast.value = { show: true, message: "Produk berhasil diperbarui!" };
    setTimeout(() => (toast.value.show = false), 2000);
    closeAdminPanel(); // Tutup form edit
  } catch (error) {
    toast.value = {
      show: true,
      message: "Gagal memperbarui produk: " + error.message,
    };
  }
};

// Tambahkan di bagian UI STATE
const isFilterOpen = ref(false);

// Contoh struktur data kategori dengan sub-kategori
const categoryMenu = [
  {
    name: "GADGET",
    subs: ["Smartphone", "Tablet", "Laptop", "Wearables"],
  },
  {
    name: "PHOTOGRAPHY",
    subs: ["Kamera", "Lensa", "Tripod", "Lighting"],
  },
  {
    name: "AUDIO",
    subs: ["Earphone", "Speaker", "Headphone"],
  },
];
</script>

<template>
  <section id="hero-section" class="relative bg-white border-b overflow-hidden">
    <div class="absolute inset-0 z-0">
      <div
        class="absolute inset-0 bg-linear-to-br from-blue-50/80 via-white to-white"
      ></div>
      <div
        class="absolute inset-0 opacity-[0.03]"
        style="
          background-image: url(&quot;data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3C/g%3E%3C/svg%3E&quot);
        "
      ></div>
      <div
        class="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl"
      ></div>
      <div
        class="absolute bottom-0 right-1/2 w-64 h-64 bg-slate-100/80 rounded-full blur-2xl"
      ></div>
    </div>

    <div
      class="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center"
    >
      <div class="space-y-6 animate-slide-in-left">
        <div
          class="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full font-semibold text-sm shadow-inner border border-blue-200"
        >
          <span>🚀</span> Kebutuhan IT Terlengkap di Samarinda
        </div>

        <h2
          class="text-5xl md:text-7xl font-black text-slate-950 leading-tight tracking-tighter"
        >
          Solusi
          <span class="text-blue-600 relative inline-block"
            >Gadget & IT
            <span
              class="absolute -bottom-2 left-0 right-0 h-1.5 bg-blue-200 rounded-full"
            ></span>
          </span>
          Profesional
        </h2>

        <p
          class="text-slate-600 text-lg md:text-xl leading-relaxed max-w-lg font-medium"
        >
          Upgrade teknologimu di TOKOBERSAMA. Temukan kamera, audio, dan
          perangkat IT terbaru dengan garansi resmi & pelayanan prima.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 pt-6">
          <button
            @click="scrollToSection('product-grid')"
            class="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Belanja Sekarang 🛍️
          </button>

          <button
            class="bg-white hover:bg-gray-50 text-gray-800 px-10 py-4 rounded-2xl font-bold text-lg border-2 border-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <a
              href="https://wa.me/6283153703725?text=Halo+Hary"
              target="_blank"
              class="bg-white ... flex items-center justify-center"
            >
              Tanya Admin 💬
            </a>
          </button>
        </div>
      </div>

      <div class="relative group mt-10 md:mt-0">
        <div
          class="absolute -inset-4 bg-blue-100/50 rounded-[40px] -rotate-3 scale-95 group-hover:rotate-0 transition-all duration-500 blur-sm"
        ></div>

        <div
          class="relative aspect-square bg-gray-200 rounded-4xl overflow-hidden shadow-2xl border-4 border-white"
        >
          <div
            class="flex h-full transition-transform duration-1000 ease-in-out"
            :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
          >
            <div
              v-for="(img, i) in banners"
              :key="i"
              class="min-w-full h-full shrink-0"
            >
              <img :src="img" class="w-full h-full object-cover" />
            </div>
          </div>

          <div
            class="absolute bottom-6 left-0 right-0 flex justify-center gap-2.5"
          >
            <div
              v-for="(_, i) in banners"
              :key="i"
              :class="[
                'h-2.5 rounded-full transition-all duration-500',
                currentSlide === i ? 'w-10 bg-white' : 'w-2.5 bg-white/50',
              ]"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="relative z-20 max-w-7xl mx-auto px-4 -mt-8">
    <div class="grid grid-cols-3 gap-3">
      <div
        class="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-900/10 border border-white flex flex-col items-center text-center transform hover:-translate-y-1 transition-transform"
      >
        <div
          class="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2"
        >
          <span class="text-xl">🚚</span>
        </div>
        <span
          class="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-tight"
          >Fast<br />Delivery</span
        >
      </div>

      <div
        class="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-900/10 border border-white flex flex-col items-center text-center transform hover:-translate-y-1 transition-transform"
      >
        <div
          class="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2"
        >
          <span class="text-xl">🛡️</span>
        </div>
        <span
          class="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-tight"
          >Garansi<br />Resmi</span
        >
      </div>

      <div
        class="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl shadow-blue-900/10 border border-white flex flex-col items-center text-center transform hover:-translate-y-1 transition-transform"
      >
        <div
          class="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mb-2"
        >
          <span class="text-xl">💎</span>
        </div>
        <span
          class="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-tight"
          >Premium<br />Quality</span
        >
      </div>
    </div>
  </div>

  <section
    id="product-grid"
    class="bg-gray-50 mt-10 rounded-t-[40px] border-t border-gray-100 min-h-screen"
  >
    <div
      class="px-6 pt-12 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6"
    >
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h2 class="text-2xl font-black text-slate-900 tracking-tight">
            Katalog Produk
          </h2>
          <span class="flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-blue-600"
            ></span>
          </span>
        </div>
        <p class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">
          Pilihan Terbaik Untukmu
        </p>
      </div>

      <div class="relative inline-block text-left">
        <button
          @click="isFilterOpen = !isFilterOpen"
          class="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
        >
          <div class="flex flex-col items-start">
            <span
              class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left"
              >Kategori</span
            >
            <span class="text-sm font-bold text-slate-900">{{
              selectedCategory
            }}</span>
          </div>
          <svg
            class="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-transform duration-300"
            :class="{ 'rotate-180': isFilterOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div
            v-if="isFilterOpen"
            class="absolute right-0 mt-3 w-72 origin-top-right bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[60]"
          >
            <button
              @click="
                selectedCategory = 'SEMUA';
                isFilterOpen = false;
              "
              class="w-full text-left px-4 py-3 rounded-2xl hover:bg-slate-50 font-bold text-sm text-slate-700"
            >
              🌟 Semua Produk
            </button>

            <div class="h-[1px] bg-slate-100 my-2 mx-4"></div>

            <div
              v-for="cat in categoryMenu"
              :key="cat.name"
              class="group/item relative"
            >
              <button
                @click="
                  selectedCategory = cat.name;
                  isFilterOpen = false;
                "
                class="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
              >
                <span class="font-bold text-sm uppercase">{{ cat.name }}</span>
                <svg
                  v-if="cat.subs.length"
                  class="w-4 h-4 opacity-50 rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <div
                class="hidden group-hover/item:block absolute right-full top-0 mr-2 w-48 bg-white rounded-3xl shadow-xl border border-slate-100 p-2 animate-in fade-in slide-in-from-right-2 duration-200"
              >
                <button
                  v-for="sub in cat.subs"
                  :key="sub"
                  @click="
                    selectedCategory = sub.toUpperCase();
                    isFilterOpen = false;
                  "
                  class="w-full text-right px-4 py-2 rounded-xl hover:bg-blue-50 text-xs font-semibold text-slate-600 hover:text-blue-600"
                >
                  {{ sub }}
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <main
      class="bg-gray-50/80 p-2 md:p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6"
    >
      <ProductCard
        v-for="item in filteredProducts"
        :key="item.id"
        :item="item"
        :add-to-cart="addToCart"
      />
    </main>
  </section>

  <footer class="bg-white border-t border-gray-100 pt-12 pb-24 px-6">
    <div class="max-w-7xl mx-auto space-y-8">
      <div class="space-y-4">
        <h1 class="text-2xl font-black italic text-blue-600 tracking-tighter">
          TOKOBERSAMA<span class="text-slate-900">.</span>
        </h1>
        <p class="text-sm text-slate-500 leading-relaxed max-w-xs">
          Solusi kebutuhan gadget dan photography terpercaya. Kualitas juara,
          harga bersahabat.
        </p>
        <div class="flex gap-4">
          <a
            href="#"
            class="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-xl"
            >📸</a
          >
          <a
            href="#"
            class="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-xl"
            >📱</a
          >
          <a
            href="#"
            class="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-xl"
            >💬</a
          >
        </div>
      </div>

      <div class="grid grid-cols-2 gap-8">
        <div class="space-y-3">
          <h4 class="font-bold text-slate-900 text-sm">Layanan</h4>
          <ul class="text-sm text-slate-400 space-y-2">
            <li>Bantuan</li>
            <li>Pengiriman</li>
            <li>Status Pesanan</li>
          </ul>
        </div>
        <div class="space-y-3">
          <h4 class="font-bold text-slate-900 text-sm">Tentang</h4>
          <ul class="text-sm text-slate-400 space-y-2">
            <li>Toko Kami</li>
            <li>Syarat & Ketentuan</li>
            <li>Kontak</li>
          </ul>
        </div>
      </div>

      <div class="pt-8 border-t border-gray-50 text-center">
        <p
          class="text-[10px] font-bold text-slate-300 uppercase tracking-widest"
        >
          © 2026 TOKOBERSAMA - Developed by Mas Hary
        </p>
      </div>
    </div>
  </footer>

  <!-- Toast Notifikasi -->
  <Toast :show="toast.show" :message="toast.message" />

  <!-- Admin Panel -->
  <AdminPanel
    v-if="isAdminOpen"
    :isEditMode="isEditMode"
    :editData="editingProduct"
    :products="products"
    @close="isAdminOpen = false"
    @add-product="handleAddProduct"
    @delete-product="handleDeleteProduct"
    @update-product="handleUpdateProduct"
    @edit-product="openEditForm"
  />
</template>

<style>
/* CSS buat ngilangin scrollbar biar mulus di HP */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/*Animasi Slide up*/
@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.animate-slide-in-left {
  animation: slide-in-left 0.8s ease-out;
}

.flex {
  display: flex;
}
.min-w-full {
  min-width: 100%;
}

/* Animasi masuk untuk setiap item grid */
main > div {
  animation: fade-in-up 0.5s ease-out forwards;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Animasi Toast */
:global(.toast-slide-enter-active) {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
:global(.toast-slide-leave-active) {
  transition: all 0.3s ease-in;
}
:global(.toast-slide-enter-from) {
  transform: translate(-50%, 100px); /* Muncul dari bawah banget */
  opacity: 0;
}
:global(.toast-slide-leave-to) {
  transform: translate(-50%, 20px) scale(0.9);
  opacity: 0;
}
</style>
