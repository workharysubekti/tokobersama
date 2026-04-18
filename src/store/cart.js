import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useCartStore = defineStore("cart", () => {
  // --- STATE ---
  const cart = ref([]);
  const showToast = ref(false);
  const toastMsg = ref("");

  // --- ACTIONS ---
  const triggerToast = (msg) => {
    toastMsg.value = msg;
    showToast.value = true;
    // Gunakan durasi yang konsisten
    setTimeout(() => {
      showToast.value = false;
    }, 3000);
  };

  const addToCart = (product) => {
    if (!product) return;

    const existingItem = cart.value.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity < 10) {
        existingItem.quantity++;
        // TAMBAHKAN INI BIAR TOAST MUNCUL SAAT QUANTITY BERTAMBAH
        triggerToast(`${product.name} ditambahkan lagi!`);
      } else {
        triggerToast("Maksimal 10 barang ya!");
      }
    } else {
      // Tambah produk baru dengan quantity 1
      cart.value.push({ ...product, quantity: 1 });
      // PASTIKAN INI TERPANGGIL
      triggerToast(`Berhasil menambah ${product.name}`);
    }
  };

  const removeFromCart = (id) => {
    const item = cart.value.find((p) => p.id === id);
    if (item) triggerToast(`${item.name} dihapus.`);
    cart.value = cart.value.filter((item) => item.id !== id);
  };

  const increaseQuantity = (id) => {
    const item = cart.value.find((item) => item.id === id);
    if (item && item.quantity < 10) item.quantity++;
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

  // --- GETTERS ---
  const totalItems = computed(() => {
    return cart.value.reduce((total, item) => total + item.quantity, 0);
  });

  const totalPrice = computed(() => {
    return cart.value.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  });

  return {
    cart,
    showToast,
    toastMsg,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    totalItems,
    totalPrice,
  };
});
