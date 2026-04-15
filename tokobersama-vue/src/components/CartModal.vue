<script setup>
defineProps(["cart", "isCartOpen"]);
const emit = defineEmits(["close", "remove"]);
</script>

<template>
  <div v-if="isCartOpen" class="fixed inset-0 z-[100] overflow-hidden">
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      @click="isCartOpen = false"
    ></div>

    <div
      class="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl p-6 flex flex-col"
    >
      <div class="flex items-center justify-between mb-8">
        <h3 class="text-xl font-black">Keranjangku</h3>
        <button @click="emit('close')" class="text-2xl text-slate-400">
          &times;
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-4 pr-2">
        <div
          v-for="(item, index) in cart"
          :key="item.cartId"
          class="flex gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100"
        >
          <img
            :src="item.image"
            class="w-16 h-16 rounded-xl object-cover bg-white"
          />

          <div class="flex-1">
            <h4 class="text-xs font-black text-slate-900 leading-tight mb-1">
              {{ item.name }}
            </h4>
            <p class="text-[10px] font-bold text-blue-600">
              Rp{{ item.price.toLocaleString() }}
            </p>
          </div>

          <button
            @click="emit('remove', item.CartId)"
            class="text-red-400 text-xs"
          >
            🗑️
          </button>
        </div>

        <div v-if="cart.length === 0" class="text-center py-20">
          <span class="text-4xl opacity-20">🛒</span>
          <p class="text-xs text-slate-400 font-bold mt-4">KERANJANG KOSONG</p>
        </div>
      </div>

      <div
        v-if="cart.length > 0"
        class="pt-4 border-t border-dashed border-gray-200"
      >
        <div class="flex justify-between items-center mb-4">
          <span class="text-xs font-bold text-slate-400"
            >Total Pembayaran:</span
          >
          <span class="text-lg font-black text-blue-600">
            Rp{{
              cart.reduce((acc, item) => acc + item.price, 0).toLocaleString()
            }}
          </span>
        </div>
        <button
          class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-xs active:scale-95 transition-all"
        >
          CHECKOUT SEKARANG
        </button>
      </div>
    </div>
  </div>
</template>
