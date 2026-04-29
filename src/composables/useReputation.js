// src/composables/useReputation.js
import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../lib/supabase";

export function useReputation() {
  const now = ref(new Date().getTime());
  let timerInterval = null;

  onMounted(() => {
    timerInterval = setInterval(() => {
      now.value = new Date().getTime();
    }, 1000);
  });

  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  const getTimer = (item) => {
    const target =
      item.fallback_decision_status === "awaiting"
        ? item.fallback_decision_deadline
        : item.fallback_deadline;

    if (!target) return "--:--:--";
    try {
      let cleanDate = target.replace(" ", "T");
      if (!cleanDate.includes("Z") && !cleanDate.includes("+"))
        cleanDate += "Z";
      const deadline = new Date(cleanDate).getTime();
      const diff = deadline - now.value;
      if (diff <= 0) return "EXPIRED";

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    } catch (e) {
      return "ERR";
    }
  };

  const executePenalty = async (item, callback) => {
    // KUNCI GLOBAL
    if (item.isProcessing) return;
    item.isProcessing = true;

    try {
      const { error } = await supabase.rpc("execute_reputation_penalty", {
        p_product_id: String(item.id),
      });

      if (!error) {
        if (callback) await callback();
      }
    } catch (err) {
      console.error(err);
    }
    // Note: Kita gak set item.isProcessing = false biar gak loop di session ini
  };

  return { now, getTimer, executePenalty };
}
