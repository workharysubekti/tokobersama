// src/composables/auction/useAuctionData.js
import { ref, computed, onUnmounted } from "vue";
import { supabase } from "../../lib/supabase.js";
import { notify } from "../../utils/notify.js";

export function useAuctionData(productId, userProfile) {
  const product = ref(null);
  const recentBids = ref([]);
  const transaction = ref(null);
  const loading = ref(true);
  let bidSubscription = null;

  // --- UI STATES (Image Gallery) ---
  const activeImgIndex = ref(0);
  const touchStartX = ref(0);
  const touchEndX = ref(0);

  // --- LOGIKA ROLE & WINNER ---
  const isWinner = computed(
    () =>
      product.value?.status === "closed" &&
      userProfile.value?.id === product.value?.winner_id,
  );
  const isSeller = computed(
    () => userProfile.value?.id === product.value?.owner_id,
  );

  // --- LOGIKA RANKING ---
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

  // --- LOGIKA ALL IMAGES ---
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

  // --- FUNGSI FETCHING ---
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
    transaction.value = data || null;
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

  // --- REAL-TIME ENGINE (INI YANG BIKIN JOSS) ---
  const subscribeToAuction = (callback) => {
    if (bidSubscription) supabase.removeChannel(bidSubscription);
    bidSubscription = supabase
      .channel(`live-auction-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `product_id=eq.${productId}`,
        },
        async () => {
          await fetchBids();
          if (callback) callback("NEW_BID");
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `id=eq.${productId}`,
        },
        (payload) => {
          product.value = { ...product.value, ...payload.new };
          if (callback) callback("PRODUCT_UPDATE");
        },
      )
      .subscribe();
  };

  // --- MOBILE SWIPE LOGIC (SOLUSI GAMBAR) ---
  const handleTouchStart = (e) => {
    touchStartX.value = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    touchEndX.value = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX.value - touchEndX.value;
    if (swipeDistance > 50) {
      // Swipe Kiri (Next)
      activeImgIndex.value =
        (activeImgIndex.value + 1) % allImages.value.length;
    } else if (swipeDistance < -50) {
      // Swipe Kanan (Prev)
      activeImgIndex.value =
        (activeImgIndex.value - 1 + allImages.value.length) %
        allImages.value.length;
    }
  };

  // --- AKSI TRANSAKSI ---
  const handleFallback = async (choice) => {
    try {
      const { error } = await supabase.rpc("handle_fallback_choice", {
        p_product_id: productId,
        p_choice: choice,
      });
      if (error) throw error;
      await fetchProductDetail();
      notify.success(
        choice === "accepted" ? "Berhasil!" : "Dilepaskan",
        choice === "accepted" ? "Item milikmu!" : "Item dilepaskan.",
      );
    } catch (err) {
      notify.error("Gagal", err.message);
    }
  };

  const confirmPayment = async (method) => {
    try {
      const { error } = await supabase.rpc("confirm_auction_payment", {
        p_transaction_id: transaction.value.id,
        p_product_id: productId,
        p_user_id: userProfile.value.id,
        p_payment_method: method,
        p_reputation_reward: 25,
      });
      if (error) throw error;
      await fetchProductDetail();
      notify.success("Berhasil!", "Pembayaran terkonfirmasi!");
    } catch (err) {
      notify.error("Gagal", err.message);
    }
  };

  onUnmounted(() => {
    if (bidSubscription) supabase.removeChannel(bidSubscription);
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
    activeImgIndex,
    handleTouchStart,
    handleTouchEnd, // UI Logic
    fetchProductDetail,
    subscribeToAuction,
    handleFallback,
    confirmPayment,
  };
}
