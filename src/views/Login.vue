<script setup>
import { ref } from "vue";
import { supabase } from "../lib/supabase.js";
import { useRouter } from "vue-router";
import { notify } from "../utils/notify";
import VueHcaptcha from "@hcaptcha/vue3-hcaptcha";
import {
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
  IdentificationIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const isLogin = ref(true);
const loading = ref(false);
const showPassword = ref(false);
const hcaptchaWidget = ref(null); // Untuk auto-reset captcha

const email = ref("");
const password = ref("");
const username = ref("");
const displayName = ref("");
const captchaToken = ref(null);

const isPasswordValid = (pw) => {
  return /[A-Za-z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 8;
};

const onCaptchaVerified = (token) => {
  captchaToken.value = token;
};

const onCaptchaExpired = () => {
  captchaToken.value = null;
};

const handleGoogleLogin = async () => {
  loading.value = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  } catch (e) {
    notify.error("Google Auth Error", e.message);
  } finally {
    loading.value = false;
  }
};

const handleAuth = async () => {
  loading.value = true;
  try {
    if (!captchaToken.value) {
      throw new Error("Selesaikan Captcha dulu ya, Mas!");
    }

    if (isLogin.value) {
      // LOGIKA LOGIN
      let loginEmail = email.value;
      if (!email.value.includes("@")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", email.value.toLowerCase())
          .single();

        if (profile) loginEmail = profile.email;
        else throw new Error("Username tidak terdaftar.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password.value,
        options: { captchaToken: captchaToken.value },
      });

      if (error) throw error;
      notify.success("Gacor!", "Selamat datang kembali.");
      router.push("/").then(() => window.location.reload());
    } else {
      // LOGIKA REGISTER
      if (!isPasswordValid(password.value)) {
        throw new Error("Password wajib 8+ karakter (Huruf + Angka).");
      }

      const ipRes = await fetch("https://api.ipify.org?format=json");
      const { ip } = await ipRes.json();

      const { data: existingIP } = await supabase
        .from("profiles")
        .select("id")
        .eq("last_ip", ip)
        .limit(1);

      if (existingIP?.length > 0) throw new Error("Maksimal 1 Akun per IP.");

      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          captchaToken: captchaToken.value,
          data: {
            username: username.value.toLowerCase().trim(),
            full_name: displayName.value,
            last_ip: ip,
          },
        },
      });

      if (error) throw error;
      notify.success("Cek Inbox!", "Verifikasi sudah dikirim ke email Mas.");
      isLogin.value = true;
    }
  } catch (e) {
    notify.error("Gagal", e.message);
    // RESET CAPTCHA JIKA SALAH INPUT
    hcaptchaWidget.value?.reset();
    captchaToken.value = null;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="fixed inset-0 h-screen w-full bg-[#050505] flex items-center justify-center px-6 overflow-hidden z-[110]"
  >
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-yellow-500/5 blur-[100px] -z-10"
    ></div>

    <div
      class="max-w-[360px] w-full bg-[#0d0d0d]/90 backdrop-blur-3xl p-8 rounded-[35px] border border-white/5 shadow-2xl overflow-y-auto max-h-[95vh] no-scrollbar"
    >
      <div class="text-center mb-8">
        <h2
          class="text-2xl font-[1000] text-white italic tracking-tighter uppercase leading-none"
        >
          {{ isLogin ? "Vault" : "Join" }}
          <span class="text-yellow-500">Access</span>
        </h2>
        <p
          class="text-[8px] mt-2 font-black uppercase tracking-[0.4em] text-gray-600 italic"
        >
          Member Identification Required
        </p>
      </div>

      <button
        @click="handleGoogleLogin"
        :disabled="loading"
        class="w-full mb-5 flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-black py-3.5 rounded-2xl font-black italic uppercase transition-all active:scale-95 disabled:opacity-50"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          class="w-4 h-4 shrink-0"
        />
        <span class="text-[9px] tracking-[0.2em]">Google Login</span>
      </button>

      <div class="flex items-center gap-3 mb-5 opacity-20">
        <div class="h-[1px] flex-1 bg-white"></div>
        <span class="text-[6px] font-black text-white uppercase italic"
          >Manual</span
        >
        <div class="h-[1px] flex-1 bg-white"></div>
      </div>

      <form @submit.prevent="handleAuth" class="space-y-3.5">
        <template v-if="!isLogin">
          <div class="relative group">
            <IdentificationIcon
              class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-yellow-500 transition-colors"
            />
            <input
              v-model="displayName"
              type="text"
              placeholder="DISPLAY NAME"
              required
              class="w-full bg-black/50 border border-white/5 p-4 pl-12 text-[10px] font-bold text-white focus:border-yellow-500/50 outline-none transition-all rounded-2xl uppercase italic"
            />
          </div>
          <div class="relative group">
            <UserIcon
              class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-yellow-500 transition-colors"
            />
            <input
              v-model="username"
              type="text"
              placeholder="USERNAME"
              required
              class="w-full bg-black/50 border border-white/5 p-4 pl-12 text-[10px] font-bold text-white focus:border-yellow-500/50 outline-none transition-all rounded-2xl lowercase"
            />
          </div>
        </template>

        <div class="relative group">
          <EnvelopeIcon
            class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-yellow-500 transition-colors"
          />
          <input
            v-model="email"
            :type="isLogin ? 'text' : 'email'"
            :placeholder="isLogin ? 'USERNAME / EMAIL' : 'EMAIL ADDRESS'"
            required
            class="w-full bg-black/50 border border-white/5 p-4 pl-12 text-[10px] font-bold text-white focus:border-yellow-500/50 outline-none transition-all rounded-2xl"
          />
        </div>

        <div class="relative group">
          <LockClosedIcon
            class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-yellow-500 transition-colors"
          />
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="PASSWORD"
            required
            class="w-full bg-black/50 border border-white/5 p-4 pl-12 pr-12 text-[10px] font-bold text-white focus:border-yellow-500/50 outline-none transition-all rounded-2xl"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors"
          >
            <EyeIcon v-if="!showPassword" class="w-4 h-4" />
            <EyeSlashIcon v-else class="w-4 h-4" />
          </button>
        </div>

        <div class="flex justify-center py-2">
          <VueHcaptcha
            ref="hcaptchaWidget"
            sitekey="79c28c58-78ee-4b60-98c2-86acead28556"
            @verify="onCaptchaVerified"
            @expired="onCaptchaExpired"
            theme="dark"
            size="compact"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          :class="
            isLogin
              ? 'bg-white text-black hover:bg-yellow-500'
              : 'bg-yellow-500 text-black hover:bg-white'
          "
          class="w-full py-4 font-[1000] uppercase italic tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50 text-[10px] shadow-xl"
        >
          {{ loading ? "WAIT..." : isLogin ? "LOGIN" : "SIGN UP NOW" }}
        </button>
      </form>

      <div class="mt-8 text-center">
        <p
          class="text-[7px] font-black text-gray-700 uppercase tracking-widest mb-3 italic"
        >
          Alternative Access
        </p>
        <button
          @click="isLogin = !isLogin"
          class="text-[9px] font-black uppercase tracking-widest transition-all italic underline decoration-yellow-500/30 underline-offset-4"
          :class="isLogin ? 'text-yellow-500' : 'text-white'"
        >
          {{
            isLogin ? "Don't have an ID? Create One" : "Back to Login Portal"
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Hcaptcha Mobile adjustment */
:deep(iframe) {
  transform: scale(0.9);
  transform-origin: center;
}
</style>
