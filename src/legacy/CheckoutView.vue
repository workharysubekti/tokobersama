<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// --- State Alamat ---
const isEditingAddress = ref(true);
const saveAddressLocal = ref(false);
const addressData = ref({
  nama: "",
  telepon: "",
  detail: "",
});

// --- State Cart ---
const cartItems = ref([]);
const ongkir = ref(15000);

onMounted(() => {
  // 1. Load Alamat
  const savedAddress = localStorage.getItem("user_address");
  if (savedAddress) {
    addressData.value = JSON.parse(savedAddress);
    isEditingAddress.value = false;
  }

  // 2. Load Data Keranjang dari Sidebar
  const savedCart = localStorage.getItem("temp_cart");
  if (savedCart) {
    cartItems.value = JSON.parse(savedCart);
  } else {
    // Kalau cart kosong, balikin ke home
    alert("Keranjang kamu kosong!");
    router.push("/");
  }
});

const saveAddress = () => {
  if (
    addressData.value.nama &&
    addressData.value.detail &&
    addressData.value.telepon
  ) {
    if (saveAddressLocal.value) {
      localStorage.setItem("user_address", JSON.stringify(addressData.value));
    }
    isEditingAddress.value = false;
  } else {
    alert("Mohon lengkapi data alamat!");
  }
};

// --- Logic Perhitungan ---
const totalQty = computed(() => {
  return cartItems.value.reduce((acc, item) => acc + item.quantity, 0);
});

const subtotal = computed(() => {
  return cartItems.value.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
});

const totalTagihan = computed(() => {
  return subtotal.value + ongkir.value;
});

const handlePayment = () => {
  if (isEditingAddress.value) {
    alert("Tolong simpan alamat pengiriman dulu ya!");
    return;
  }
  alert("Pesanan diterima! Lanjut ke modul pembayaran...");
  // Di sini nanti hapus temp_cart kalau sudah bayar
  // localStorage.removeItem("temp_cart");
};
</script>

<template>
  <div class="bg-gray-50 min-h-screen pb-10">
    <div class="container mx-auto px-4 py-8">
      <div class="flex items-center gap-4 mb-8">
        <button @click="router.back()" class="hover:text-blue-500 transition">
          <span class="material-icons">←</span>
        </button>
        <h1 class="text-2xl font-bold text-gray-800">Checkout</h1>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 class="font-bold mb-4 flex items-center text-gray-800">
              <span class="material-icons text-blue-500 mr-2"
                >Alamat Pengiriman</span
              >
            </h2>

            <div v-if="isEditingAddress" class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  v-model="addressData.nama"
                  type="text"
                  placeholder="Nama Penerima"
                  class="p-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <input
                  v-model="addressData.telepon"
                  type="text"
                  placeholder="Nomor Telepon"
                  class="p-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <textarea
                v-model="addressData.detail"
                placeholder="Alamat Lengkap (Jalan, No Rumah, Kec/Kota)"
                class="w-full p-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                rows="3"
              ></textarea>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveLocal"
                  v-model="saveAddressLocal"
                />
                <label for="saveLocal" class="text-xs text-gray-500"
                  >Simpan alamat di browser ini</label
                >
              </div>
              <button
                @click="saveAddress"
                class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                Gunakan Alamat Ini
              </button>
            </div>

            <div
              v-else
              class="flex justify-between items-start pl-6 border-l-2 border-blue-500"
            >
              <div>
                <p class="font-bold text-gray-800">
                  {{ addressData.nama }}
                  <span class="text-gray-500 font-normal text-sm"
                    >({{ addressData.telepon }})</span
                  >
                </p>
                <p class="text-sm text-gray-600 mt-1">
                  {{ addressData.detail }}
                </p>
              </div>
              <button
                @click="isEditingAddress = true"
                class="text-blue-500 text-sm font-semibold hover:underline"
              >
                Ubah
              </button>
            </div>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 class="font-bold mb-4 text-gray-800">Produk yang Dibeli</h2>
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="flex gap-4 py-4 border-b last:border-0"
            >
              <img
                :src="item.image"
                class="w-20 h-20 object-cover rounded-lg bg-gray-50"
              />
              <div class="flex-1">
                <h3 class="text-sm font-medium text-gray-800 line-clamp-2">
                  {{ item.name }}
                </h3>
                <div class="flex justify-between items-center mt-3">
                  <p class="text-blue-600 font-bold">
                    Rp{{ item.price.toLocaleString("id-ID") }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ item.quantity }} Barang
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div
            class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24"
          >
            <h2 class="font-bold mb-4 text-gray-800">Ringkasan Belanja</h2>
            <div class="space-y-3 text-sm text-gray-600 mb-6">
              <div class="flex justify-between">
                <span>Total Harga ({{ totalQty }} barang)</span>
                <span class="font-medium text-gray-800"
                  >Rp{{ subtotal.toLocaleString("id-ID") }}</span
                >
              </div>
              <div class="flex justify-between">
                <span>Total Ongkos Kirim</span>
                <span class="font-medium text-gray-800"
                  >Rp{{ ongkir.toLocaleString("id-ID") }}</span
                >
              </div>
              <div
                class="border-t pt-4 flex justify-between font-bold text-lg text-gray-900"
              >
                <span>Total Tagihan</span>
                <span class="text-blue-500"
                  >Rp{{ totalTagihan.toLocaleString("id-ID") }}</span
                >
              </div>
            </div>
            <button
              @click="handlePayment"
              class="w-full bg-blue-500 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-100"
            >
              Pilih Pembayaran
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
