import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../lib/supabase";

export const usePresenceStore = defineStore("presence", () => {
  const onlineUsers = ref({});
  const globalChannel = ref(null);
  const currentUserId = ref(null);

  const initPresence = async (userId) => {
    if (!userId) return;
    currentUserId.value = userId;

    if (globalChannel.value) {
      await supabase.removeChannel(globalChannel.value);
      globalChannel.value = null;
    }

    globalChannel.value = supabase.channel("global-presence-room", {
      config: { presence: { key: userId } },
    });

    globalChannel.value
      .on("presence", { event: "sync" }, () => {
        onlineUsers.value = globalChannel.value.presenceState();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await globalChannel.value.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });
  };

  const refreshConnection = async () => {
    if (currentUserId.value) {
      await initPresence(currentUserId.value);
    }
  };

  const isUserOnline = (targetId) => {
    return !!onlineUsers.value[targetId];
  };

  return { onlineUsers, initPresence, refreshConnection, isUserOnline };
});
