<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { UserCircleIcon, PhotoIcon, ArrowPathIcon, Cog6ToothIcon } from "@heroicons/vue/24/outline";

const props = defineProps({ userProfile: Object });
const router = useRouter();
const loading = ref(false);
const isEditing = ref(false);

const editForm = ref({
  full_name: props.userProfile?.full_name || "",
  bio: props.userProfile?.bio || "",
  avatar_url: props.userProfile?.avatar_url || "",
});

const handleUpdate = async () => {
  loading.value = true;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: editForm.value.full_name,
      bio: editForm.value.bio,
    })
    .eq("id", props.userProfile.id);

  if (!error) {
    isEditing.value = false;
    // Trik: Reload kecil agar App.vue ambil data terbaru
    window.location.reload(); 
  }
  loading.value = false;
};
</script>
