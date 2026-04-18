<script setup>
import { useCart } from "../store/cart.js";
import { computed } from "vue";
import { useRouter } from "vue-router"; // 1. Tambahkan import ini

const router = useRouter(); // 2. Inisialisasi router
const { cart, removeFromCart, decreaseQuantity, increaseQuantity, totalItems } =
  useCart();

const emit = defineEmits(["close", "close-sidebar"]);

// 3. Pastikan fungsi ini memanggil router dengan benar
const handleCheckout = () => {
  localStorage.setItem("temp_cart", JSON.stringify(cart.value));
  emit("close");
  router.push("/checkout");
};

const totalPrice = computed(() => {
  return cart.value.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
});

const handleClose = () => {
  emit("close");
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end">
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      @click="handleClose"
    ></div>

    <div
      class="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
    >
      <div class="p-6 border-b flex justify-between items-center bg-slate-50">
        <div>
          <h2 class="text-2xl font-black text-slate-900">Keranjangku</h2>
          <p class="text-sm text-slate-500 font-medium">
            {{ totalItems }} Barang terpilih
          </p>
        </div>
        <button
          @click="handleClose"
          class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 transition-all text-slate-400"
        >
          <span class="text-2xl">×</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div
          v-if="cart.length === 0"
          class="h-full flex flex-col items-center justify-center text-center"
        >
          <div class="text-6xl mb-4">🛒</div>
          <h3 class="font-bold text-gray-800">
            Wah, keranjang masih kosong nih.
          </h3>
          <p class="text-sm text-gray-500 mt-1 mb-6">
            Ayo Segera Belanja Kebutuhanmu!
          </p>
          <button
            @click="handleClose"
            class="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-100 transition-transform active:scale-95"
          >
            Mulai Belanja
          </button>
        </div>

        <div v-else class="space-y-6">
          <div v-for="item in cart" :key="item.id" class="flex gap-4 group">
            <div
              class="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0"
            >
              <img
                :src="item.image"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            <div class="flex-1 flex flex-col justify-between">
              <div>
                <h4 class="font-bold text-slate-800 leading-tight">
                  {{ item.name }}
                </h4>
                <p class="text-blue-600 font-black mt-1">
                  Rp {{ (item.price * item.quantity).toLocaleString() }}
                </p>
              </div>

              <div class="flex items-center justify-between mt-2">
                <div
                  class="flex items-center gap-3 bg-slate-100 p-1 rounded-xl"
                >
                  <button
                    @click="decreaseQuantity(item.id)"
                    class="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-red-500 hover:text-white transition-all font-bold"
                  >
                    -
                  </button>
                  <span class="text-sm font-black w-4 text-center">{{
                    item.quantity
                  }}</span>
                  <button
                    @click="increaseQuantity(item.id)"
                    class="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all font-bold"
                  >
                    +
                  </button>
                </div>

                <button
                  @click="removeFromCart(item.id)"
                  class="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="cart.length > 0" class="p-6 border-t bg-slate-50 space-y-4">
        <div class="flex justify-between items-center">
          <span class="font-bold text-slate-500">Total Bayar</span>
          <span class="font-black text-2xl text-blue-600">
            Rp {{ totalPrice.toLocaleString() }}
          </span>
        </div>

        <button
          @click="handleCheckout"
          class="w-full bg-blue-600 text-white text-center py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          Checkout Sekarang
        </button>
      </div>
    </div>
  </div>
</template>
