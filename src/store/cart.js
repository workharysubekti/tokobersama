import { ref, computed } from "vue";

// 1. STATE GLOBAL (Tetap di luar agar data tidak hilang saat pindah halaman)
const cart = ref([]);
const showToast = ref(false);
const toastMsg = ref("");

// 2. HELPER: Fungsi pemicu Toast (Bisa dipakai semua fungsi lain)
const triggerToast = (msg) => {
  toastMsg.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
};

// 3. LOGIKA UTAMA (Berdiri sendiri-sendiri)
const removeFromCart = (id) => {
  cart.value = cart.value.filter((item) => item.id !== id);
};

const decreaseQuantity = (id) => {
  const item = cart.value.find((item) => item.id === id);
  if (item) {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      removeFromCart(id);
    }
  }
};

const increaseQuantity = (id) => {
  const item = cart.value.find((item) => item.id === id);
  // Cek apakah item ada DAN jumlahnya masih di bawah 10
  if (item) {
    if (item.quantity < 10) {
      item.quantity++;
    } else {
      triggerToast("Kuantitas tidak boleh lebih dari 10");
    }
  }
};

const addToCart = (product) => {
  const existingItem = cart.value.find((item) => item.id === product.id);

  if (existingItem) {
    if (existingItem.quantity < 10) {
      existingItem.quantity++;
    } else {
      triggerToast("Kuantitas tidak boleh lebih dari 10");
    }
  } else {
    cart.value.push({ ...product, quantity: 1 });
    triggerToast(`Berhasil menambah ${product.name}`);
  }
};

// 4. COMPUTED: Hitung total item di keranjang
const totalItems = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0);
});

// 5. EXPORT: Gerbang utama untuk dipakai di Vue Component
export function useCart() {
  return {
    cart,
    showToast,
    toastMsg,
    addToCart,
    removeFromCart,
    decreaseQuantity,
    increaseQuantity,
    totalItems,
  };
}
