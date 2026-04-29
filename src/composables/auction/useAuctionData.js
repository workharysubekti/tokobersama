// src/composables/auction/useAuctionData.js
import { ref, computed } from "vue";
import { supabase } from "../../lib/supabase.js";

export function useAuctionData(productId, userProfile) {
  const product = ref(null);
  const recentBids = ref([]);
  const transaction = ref(null);
  const loading = ref(true);

  // --- LOGIKA SETTLEMENT & ROLE ---
  const isWinner = computed(() => {
    return (
      product.value?.status === "closed" &&
      userProfile.value?.id === product.value?.winner_id
    );
  });

  const isSeller = computed(() => {
    return userProfile.value?.id === product.value?.owner_id;
  });

  const rankedBids = computed(() => {
    if (!recentBids.value.length) return [];
    const seen = new Set();
    return recentBids.value
      .filter((b) => {
        if (seen.has(b.user_id)) return false;
        seen.add(b.user_id);
        return true;
      })
      .slice(0, 8);
  });

  const fetchBids = async () => {
    const { data } = await supabase
      .from("bids")
      .select("*, profiles(username, full_name, avatar_url, reputation)")
      .eq("product_id", productId)
      .order("amount", { ascending: false })
      .limit(50);
    if (data) {
      recentBids.value = data;
      if (data.length > 0 && product.value)
        product.value.current_bid = data[0].amount;
    }
  };

  const fetchTransaction = async () => {
    if (!userProfile.value?.id) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("product_id", productId)
      .eq("buyer_id", userProfile.value.id)
      .maybeSingle();
    if (data) transaction.value = data;
  };

  const fetchProductDetail = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "*, profiles!owner_id(username, full_name, avatar_url, reputation), fallback_stage, fallback_status, fallback_deadline",
      )
      .eq("id", productId)
      .maybeSingle();
    if (data) {
      product.value = data;
      await fetchBids();
      await fetchTransaction();
    }
    loading.value = false;
    return { data, error };
  };
  // Tambahkan 'allImages' di return useAuctionData.js
  const allImages = computed(() => {
    if (!product.value) return [];
    const images = [];
    if (product.value.image_url) images.push(product.value.image_url);
    const extra = product.value.additional_images;
    if (extra) {
      try {
        const parsed = typeof extra === "string" ? JSON.parse(extra) : extra;
        if (Array.isArray(parsed)) images.push(...parsed);
      } catch (e) {
        images.push(extra);
      }
    }
    return images.filter((url) => url && url.trim() !== "");
  });

  return {
    product,
    recentBids,
    transaction,
    loading,
    rankedBids,
    allImages,
    isWinner,
    isSeller,
    fetchProductDetail,
    fetchBids,
    fetchTransaction,
  };
}
