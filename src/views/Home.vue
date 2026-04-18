<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useSearchStore } from "../store/search.js"; // Import Store Pencarian
import { useCartStore } from "../store/cart.js"; // Import Store Keranjang
import ProductCard from "../components/ProductCard.vue";
import AdminPanel from "../components/AdminPanel.vue";

// --- GLOBAL STATE ---
const searchStore = useSearchStore();
const cartStore = useCartStore();
const isLoading = ref(true);

// --- DATA STATE ---
const products = ref([]);
const categories = ["SEMUA", "GADGET", "PHOTOGRAPHY", "AUDIO"];

// --- UI STATE ---
const currentSlide = ref(0);
const banners = [
  "https://picsum.photos/id/250/800/800",
  "https://picsum.photos/id/447/800/800",
  "https://picsum.photos/id/26/800/800",
];

const isAdminOpen = ref(false);
const isEditMode = ref(false);
const editingProduct = ref(null);
const isFilterOpen = ref(false);

// --- FETCH DATA ---
const fetchProducts = async () => {
  const { data, error } = await supabase.from("products").select("*");
  if (error) {
    console.error("Error fetching products:", error);
  } else {
    products.value = data;
  }
};

// --- FILTER LOGIC (Data dari Pinia) ---
// --- FILTER LOGIC (Mengambil data dari SearchStore) ---
const filteredProducts = computed(() => {
  if (!products.value) return [];
  return products.value.filter((p) => {
    // Filter Nama (Search)
    const s = searchStore.query ? searchStore.query.toLowerCase() : "";
    const productName = p.name ? p.name.toLowerCase() : "";
    const matchSearch = productName.includes(s);

    // Filter Kategori
    const productCategory = p.category ? p.category.toUpperCase() : "";
    const matchCategory =
      searchStore.category === "SEMUA" ||
      productCategory === searchStore.category.toUpperCase();

    return matchSearch && matchCategory;
  });
});
// --- ACTIONS ---
const addToCart = (product) => {
  cartStore.addToCart(product); // Gunakan fungsi dari Pinia
};

// --- ADMIN LOGIC ---
const handleOpenAdmin = () => {
  const passcode = prompt("Masukkan passcode admin:");
  if (passcode === "zysoo1204") {
    isAdminOpen.value = true;
  } else {
    alert("Passcode salah!");
  }
};

const handleAddProduct = async (newItem) => {
  const { data, error } = await supabase
    .from("products")
    .insert([newItem])
    .select();
  if (!error && data) {
    products.value.push(data[0]);
  }
};

const handleDeleteProduct = async (id) => {
  if (!confirm("Hapus produk?")) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (!error) {
    products.value = products.value.filter((p) => p.id !== id);
  }
};

// --- LIFECYCLE ---
onMounted(async () => {
  await fetchProducts();
  setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % banners.length;
  }, 3000);
  setTimeout(() => (isLoading.value = false), 1000);
});

const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};
</script>

<template>
  <section id="hero-section" class="relative bg-white border-b overflow-hidden">
    <div
      class="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center"
    >
      <div class="space-y-6 animate-slide-in-left">
        <div
          class="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full font-semibold text-sm"
        >
          <span>🚀</span> Kebutuhan IT Terlengkap di Samarinda
        </div>
        <h2
          class="text-5xl md:text-7xl font-black text-slate-950 leading-tight tracking-tighter"
        >
          Solusi <span class="text-blue-600">Gadget & IT</span> Profesional
        </h2>
        <p class="text-slate-600 text-lg font-medium">
          Upgrade teknologimu di TOKOBERSAMA. Garansi resmi & pelayanan prima.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 pt-6">
          <button
            @click="scrollToSection('product-grid')"
            class="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            Belanja Sekarang 🛍️
          </button>
          <button
            @click="handleOpenAdmin"
            class="bg-gray-100 text-gray-600 px-6 py-4 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
          >
            Mode Admin ⚙️
          </button>
        </div>
      </div>

      <div
        class="relative group aspect-square bg-gray-200 rounded-4xl overflow-hidden shadow-2xl border-4 border-white"
      >
        <div
          class="flex h-full transition-transform duration-1000 ease-in-out"
          :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
        >
          <div v-for="(img, i) in banners" :key="i" class="min-w-full h-full">
            <img :src="img" class="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <section
    id="product-grid"
    class="bg-gray-50 mt-10 rounded-t-[40px] border-t border-gray-100 min-h-screen"
  >
    <div
      class="px-6 pt-12 pb-6 flex flex-col md:flex-row justify-between gap-6"
    >
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">
          Katalog Produk
        </h2>
        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">
          Pilihan Terbaik Untukmu
        </p>
      </div>

      <div class="relative">
        <button
          @click="isFilterOpen = !isFilterOpen"
          class="flex items-center gap-3 px-6 py-3 bg-white border rounded-2xl shadow-sm font-bold"
        >
          {{ searchStore.category }}
          <span
            :class="{ 'rotate-180': isFilterOpen }"
            class="transition-transform"
            >▼</span
          >
        </button>
        <transition name="toast-slide">
          <div
            v-if="isFilterOpen"
            class="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border p-2 z-50"
          >
            <button
              v-for="cat in categories"
              :key="cat"
              @click="
                searchStore.setCategory(cat);
                isFilterOpen = false;
              "
              class="w-full text-left px-4 py-2 hover:bg-blue-50 rounded-xl text-sm font-bold"
            >
              {{ cat }}
            </button>
          </div>
        </transition>
      </div>
    </div>

    <main
      class="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
    >
      <div
        v-if="isLoading"
        v-for="n in 5"
        :key="n"
        class="h-64 bg-gray-200 animate-pulse rounded-3xl"
      ></div>
      <ProductCard
        v-else
        v-for="item in filteredProducts"
        :key="item.id"
        :item="item"
        :add-to-cart="addToCart"
      />
    </main>
  </section>

  <AdminPanel
    v-if="isAdminOpen"
    :products="products"
    @close="isAdminOpen = false"
    @add-product="handleAddProduct"
    @delete-product="handleDeleteProduct"
  />
</template>
