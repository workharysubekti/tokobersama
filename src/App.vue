<script setup>
import { ref, computed, onMounted } from "vue";
import { productsData } from "./data/products.js";
import Header from "./components/Header.vue";
import ProductCard from "./components/ProductCard.vue";
import CartModal from "./components/CartModal.vue";
import Toast from "./components/Toast.vue";
import AdminPanel from "./components/AdminPanel.vue";

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
const selectedProduct = ref(null);

// --- DATA STATE ---
const products = ref(productsData);

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
  if (!products.value) return [];
  return products.value.filter((p) => {
    const s = searchQuery.value.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(s);
    const matchCategory =
      selectedCategory.value === "SEMUA" ||
      p.category.toUpperCase() === selectedCategory.value;
    return matchSearch && matchCategory;
  });
});

// --- LIFECYCLE & HELPERS ---
onMounted(() => {
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
const handleAddProduct = (newItem) => {
  products.value.push(newItem);
  toast.value = { show: true, message: "Produk berhasil ditambahkan!" };
  setTimeout(() => (toast.value.show = false), 2000);
};

// Fungsi Hapus Produk dari Admin
const handleDeleteProduct = (id) => {
  if (confirm("Yakin mau hapus produk ini, Mas?")) {
    products.value = products.value.filter((p) => p.id !== id);
    toast.value = { show: true, message: "Produk berhasil dihapus!" };
    setTimeout(() => (toast.value.show = false), 2000);
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
</script>

<template>
  <Header
    :open-admin="handleOpenAdmin"
    :cart="cart"
    :open-cart-modal="openCartModal"
    v-model:search-query="searchQuery"
    v-model:selected-category="selectedCategory"
  />

  <section id="hero-section" class="relative bg-white border-b overflow-hidden">
    <div class="absolute inset-0 z-0">
      <div
        class="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-white"
      ></div>
      <div
        class="absolute inset-0 opacity-[0.03]"
        style="
          background-image: url(&quot;data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3C/g%3E%3C/svg%3E&quot;);
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
              href="https://wa.me/6283153703725?text=Halo+Hary+saya+mau+tanya+untuk+ketersediaan+bekerja"
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
          class="relative aspect-square bg-gray-200 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white"
        >
          <div
            class="flex h-full transition-transform duration-1000 ease-in-out"
            :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
          >
            <div
              v-for="(img, i) in banners"
              :key="i"
              class="min-w-full h-full flex-shrink-0"
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
    class="bg-gray-50 mt-10 rounded-t-[40px] border-t border-gray-100 min-h-screen"
  >
    <div class="px-6 pt-12 pb-6 flex items-end justify-between">
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

      <button
        class="text-[11px] font-black text-blue-600 bg-blue-100/50 px-4 py-2 rounded-xl active:scale-95 transition-all"
      >
        FILTER
      </button>
    </div>

    <div class="p-2 md:p-4"></div>

    <main
      id="product-grid"
      class="bg-gray-50/80 p-2 md:p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4"
    >
      <ProductCard
        v-for="item in filteredProducts"
        :key="item.id"
        :item="item"
        :add-to-cart="addToCart"
        :open-detail="openDetail"
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

  <div
    v-if="selectedProduct"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4"
  >
    <div
      @click="closeDetail"
      class="absolute inset-0 bg-black/80 backdrop-blur-sm"
    ></div>

    <div
      class="bg-white w-full max-w-lg rounded-3xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300"
    >
      <img :src="selectedProduct.image" class="w-full h-72 object-cover" />
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span
              class="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-600 rounded-lg uppercase tracking-wider"
            >
              {{ selectedProduct.category }}
            </span>
            <h2 class="text-2xl font-black mt-2">{{ selectedProduct.name }}</h2>
          </div>
          <p class="text-xl font-black text-blue-600">
            Rp {{ selectedProduct.price.toLocaleString() }}
          </p>
        </div>

        <p class="text-gray-500 text-sm leading-relaxed mb-6">
          Spesifikasi Pro: Produk ini adalah barang pilihan dari TOKOBERSAMA.
          dengan kondisi prima. Cocok untuk kebutuhan profesional maupun harian.
          Dijamin ori 100%!
        </p>

        <div class="flex gap-3">
          <button
            @click="closeDetail"
            class="flex-1 bg-gray-100 py-4 rounded-2xl font-bold"
          >
            Tutup
          </button>
          <button
            @click="
              addToCart(selectedProduct);
              closeDetail();
            "
            class="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black"
          >
            Tambah ke Keranjang
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Keranjang -->
  <CartModal
    :cart="cart"
    :is-cart-open="isCartOpen"
    @close="isCartOpen = false"
    @remove="removeFromCart"
  />

  <!-- Toast Notifikasi -->
  <Toast :show="toast.show" :message="toast.message" />

  <!-- Admin Panel -->
  <AdminPanel
    v-if="isAdminOpen"
    :products="products"
    @close="isAdminOpen = false"
    @add-product="handleAddProduct"
    @delete-product="handleDeleteProduct"
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
