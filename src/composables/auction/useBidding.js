// src/composables/auction/useBidding.js
import { ref, computed, watch } from "vue";
import { supabase } from "../../lib/supabase.js";
import { notify } from "../../utils/notify.js";
import { getRankDetails } from "../../utils/rankUtils.js";

export function useBidding(product, recentBids, userProfile) {
  const bidAmount = ref(0);
  const isSubmitting = ref(false);
  const isCooldown = ref(false);
  const showDepositModal = ref(false);

  // --- LOGIKA RECLAIM (KABEL YANG TADI PUTUS) ---
  const isOutbid = computed(() => {
    // 1. Kalau gak ada bid atau user gak login, gak usah merah
    if (
      !recentBids.value ||
      recentBids.value.length === 0 ||
      !userProfile.value
    )
      return false;

    // 2. Cek apakah penawar tertinggi (Rank #1) BUKAN kita
    const topBidderId = recentBids.value[0].user_id;
    const isNotRank1 = topBidderId !== userProfile.value.id;

    // 3. Cek apakah kita pernah nge-bid di barang ini (pernah ada di list)
    const haveIBidBefore = recentBids.value.some(
      (bid) => bid.user_id === userProfile.value.id,
    );

    // 4. Kalau kita pernah ngebid tapi sekarang bukan nomor 1 = KENA SALIP (MERAH!)
    return isNotRank1 && haveIBidBefore;
  });

  // --- 1. FORMATTER TITIK (Balikin fungsi yang hilang) ---
  const formattedBidAmount = computed({
    get() {
      if (!bidAmount.value) return "";
      return new Intl.NumberFormat("id-ID").format(bidAmount.value);
    },
    set(newValue) {
      const number = Number(newValue.replace(/\./g, ""));
      if (!isNaN(number)) bidAmount.value = number;
    },
  });

  // --- 2. WATCHER HARGA (Biar input gak 0 pas loading kelar) ---
  watch(
    () => product.value,
    (newProd) => {
      if (newProd && bidAmount.value === 0) {
        const current = newProd.current_bid || newProd.starting_bid;
        bidAmount.value = Number(current) + 10000;
      }
    },
    { immediate: true },
  );

  const userRank = computed(() =>
    getRankDetails(
      userProfile.value?.reputation || 0,
      !!userProfile.value?.is_admin,
    ),
  );

  const depositPercentage = computed(() => {
    const rep = userProfile.value?.reputation || 0;
    if (userProfile.value?.is_admin) return 0;
    if (rep < 50) return 30;
    if (rep >= 1200) return 0;
    if (rep >= 800) return 5;
    if (rep >= 400) return 10;
    if (rep >= 200) return 15;
    return 20;
  });

  const requiredDeposit = computed(
    () => (bidAmount.value * depositPercentage.value) / 100,
  );
  const needsDeposit = computed(() => {
    if (userProfile.value?.is_admin) return false;
    if ((userProfile.value?.reputation || 0) < 50) return true;
    return bidAmount.value > userRank.value.limit;
  });

  const executeBidTransaction = async (onSuccess) => {
    isSubmitting.value = true;
    const oldEnd = new Date(product.value.end_time).getTime();

    const { data, error } = await supabase.rpc("execute_bid_v1", {
      p_product_id: product.value.id,
      p_user_id: userProfile.value.id,
      p_bid_amount: bidAmount.value,
    });

    if (error) {
      notify.error("Gagal", error.message);
    } else {
      product.value.end_time = data.new_end_time;
      product.value.current_bid = data.new_bid;
      bidAmount.value = Number(data.new_bid) + 10000;
      onSuccess(new Date(data.new_end_time).getTime() > oldEnd + 1000);
    }
    isSubmitting.value = false;
    showDepositModal.value = false;
  };

  return {
    bidAmount,
    formattedBidAmount,
    isSubmitting,
    isCooldown,
    isOutbid,
    showDepositModal,
    userRank,
    requiredDeposit,
    needsDeposit,
    executeBidTransaction,
  };
}
