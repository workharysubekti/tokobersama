// src/composables/auction/useAuctionTimer.js
import { ref, onUnmounted } from "vue";
import { supabase } from "../../lib/supabase.js";

export function useAuctionTimer(product) {
  const serverOffset = ref(0);
  const timeLeft = ref("");
  const isIntense = ref(false);
  const showExtensionBadge = ref(false);
  let timerInterval = null;

  const syncServerTime = async () => {
    try {
      const start = Date.now();
      const { data } = await supabase.rpc("get_server_time");
      const serverTime = data ? new Date(data).getTime() : Date.now();
      const latency = (Date.now() - start) / 2;
      serverOffset.value = serverTime - (Date.now() - latency);
    } catch (e) {
      serverOffset.value = 0;
    }
  };

  const updateTimer = () => {
    if (!product.value || !product.value.end_time) return;
    const end = new Date(product.value.end_time).getTime();
    const nowSynced = Date.now() + serverOffset.value;
    const diff = end - nowSynced;

    if (diff <= 0) {
      timeLeft.value =
        product.value.status === "active" ? "VALIDATING..." : "ENDED";
      isIntense.value = false;
      return;
    }

    isIntense.value = diff > 0 && diff <= 120000;

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    timeLeft.value =
      d > 0
        ? `${d}d ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        : `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
  };

  onUnmounted(() => clearInterval(timerInterval));

  return {
    timeLeft,
    isIntense,
    showExtensionBadge,
    syncServerTime,
    startTimer,
    updateTimer,
  };
}
