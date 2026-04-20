<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { ShoppingBagIcon, TagIcon, ArrowPathIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(true);
const activeTab = ref("collection");
const collection = ref([]); 
const listings = ref([]); 

const fetchVaultData = async () => {
  if (!props.userProfile) {
    router.push("/login");
    return;
  }
  loading.value = true;
  try {
    const userId = props.userProfile.id;
    // Ambil data Koleksi & Listing sekaligus
    const [won, mine] = await Promise.all([
      supabase.from("products").select("*").eq("winner_id", userId).eq("status", "closed"),
      supabase.from("products").select("*").eq("owner_id", userId)
    ]);
    collection.value = won.data || [];
    listings.value = mine.data || [];
  } finally {
    loading.value = false;
  }
};

onMounted(fetchVaultData);
</script>
