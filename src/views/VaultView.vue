<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import {
  ShoppingBagIcon,
  TagIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  CircleStackIcon,
  ChevronRightIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const loading = ref(true);
const activeTab = ref("collection");

const collection = ref([]); // Menang lelang
const listings = ref([]); // Jual sendiri

const fetchVaultData = async () => {
  loading.value = true;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    router.push("/login");
    return;
  }

  const userId = session.user.id;

  try {
    // 1. Koleksi dari tabel products (winner_id = user)
    const { data: wonItems } = await supabase
      .from("products")
      .select("*")
      .eq("winner_id", userId)
      .eq("status", "closed");

    collection.value = wonItems || [];

    // 2. Listing dari tabel products (owner_id = user)
    const { data: myItems } = await supabase
      .from("products")
      .select("*")
      .eq("owner_id", userId);

    listings.value = myItems || [];
  } catch (error) {
    console.error("Gagal mengambil data vault:", error);
  } finally {
    loading.value = false;
  }
};

const totalVaultValue = computed(() => {
  return collection.value.reduce(
    (acc, item) => acc + (item.current_bid || 0),
    0,
  );
});

const formatCurrency = (val) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

onMounted(fetchVaultData);
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] pt-24 pb-32 px-6 text-white font-sans">
    <div class="max-w-2xl mx-auto">
      <div class="mb-10 text-center">
        <h1 class="text-2xl font-[1000] italic uppercase tracking-tighter mb-4">
          The <span class="text-yellow-500">Vault</span>
        </h1>

        <div
          class="bg-gradient-to-br from-yellow-500 to-yellow-600 p-[1px] rounded-[30px] inline-block w-full shadow-[0_20px_50px_rgba(234,179,8,0.1)]"
        >
          <div
            class="bg-[#0f0f0f] rounded-[29px] p-6 flex items-center justify-between overflow-hidden relative"
          >
            <div class="absolute -right-4 -top-4 opacity-5">
              <CircleStackIcon class="w-32 h-32 text-yellow-500" />
            </div>
            <div class="text-left relative z-10">
              <p
                class="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] italic mb-1"
              >
                Estimated Asset Value
              </p>
              <h2 class="text-3xl font-[1000] italic tracking-tighter">
                {{ formatCurrency(totalVaultValue) }}
              </h2>
            </div>
            <div
              class="bg-yellow-500/10 p-3 rounded-2xl border border-yellow-500/20"
            >
              <ShoppingBagIcon class="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      <div
        class="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 mb-8"
      >
        <button
          @click="activeTab = 'collection'"
          :class="
            activeTab === 'collection'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
              : 'text-gray-500'
          "
          class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center justify-center gap-2"
        >
          <ArchiveBoxIcon class="w-4 h-4" /> Collection ({{
            collection.length
          }})
        </button>
        <button
          @click="activeTab = 'listings'"
          :class="
            activeTab === 'listings'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
              : 'text-gray-500'
          "
          class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center justify-center gap-2"
        >
          <TagIcon class="w-4 h-4" /> Listings ({{ listings.length }})
        </button>
      </div>

      <div v-if="!loading">
        <div v-if="activeTab === 'collection'" class="grid grid-cols-1 gap-4">
          <div
            v-for="item in collection"
            :key="item.id"
            @click="router.push(`/product/${item.id}`)"
            class="bg-white/[0.02] border border-white/5 p-4 rounded-[25px] flex items-center gap-4 hover:bg-white/[0.04] transition-all group cursor-pointer"
          >
            <div
              class="w-20 h-20 bg-black rounded-2xl overflow-hidden border border-white/10 shrink-0"
            >
              <img
                :src="item.image_url"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div class="flex-1">
              <h3
                class="text-sm font-black uppercase italic leading-tight mb-1"
              >
                {{ item.title }}
              </h3>
              <p
                class="text-[10px] text-gray-500 font-bold uppercase tracking-widest"
              >
                Won for {{ formatCurrency(item.current_bid) }}
              </p>
              <div
                class="mt-2 inline-block bg-green-500/10 text-green-500 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter"
              >
                Acquired
              </div>
            </div>
            <ChevronRightIcon class="w-5 h-5 text-gray-700" />
          </div>
          <div
            v-if="collection.length === 0"
            class="text-center py-20 opacity-30"
          >
            <ArchiveBoxIcon class="w-12 h-12 mx-auto mb-4" />
            <p class="text-xs font-bold uppercase tracking-[0.2em]">
              Vault Empty
            </p>
          </div>
        </div>

        <div v-if="activeTab === 'listings'" class="grid grid-cols-1 gap-4">
          <div
            v-for="item in listings"
            :key="item.id"
            @click="router.push(`/product/${item.id}`)"
            class="bg-white/[0.02] border border-white/5 p-4 rounded-[25px] flex items-center gap-4 hover:bg-white/[0.04] transition-all group cursor-pointer"
          >
            <div
              class="w-20 h-20 bg-black rounded-2xl overflow-hidden border border-white/10 shrink-0"
            >
              <img
                :src="item.image_url"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div class="flex-1">
              <h3
                class="text-sm font-black uppercase italic leading-tight mb-1"
              >
                {{ item.title }}
              </h3>
              <p
                class="text-[10px] text-yellow-500 font-bold uppercase tracking-widest"
              >
                Floor: {{ formatCurrency(item.current_bid) }}
              </p>
              <div
                :class="
                  item.status === 'active'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-gray-500/10 text-gray-500'
                "
                class="mt-2 inline-block text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter"
              >
                {{ item.status === "active" ? "Live Auction" : "Ended" }}
              </div>
            </div>
            <ChevronRightIcon class="w-5 h-5 text-gray-700" />
          </div>
          <div
            v-if="listings.length === 0"
            class="text-center py-20 opacity-30"
          >
            <TagIcon class="w-12 h-12 mx-auto mb-4" />
            <p class="text-xs font-bold uppercase tracking-[0.2em]">
              No Active Listings
            </p>
          </div>
        </div>
      </div>

      <div v-else class="flex justify-center py-40">
        <ArrowPathIcon class="w-10 h-10 text-yellow-500 animate-spin" />
      </div>
    </div>
  </div>
</template>
