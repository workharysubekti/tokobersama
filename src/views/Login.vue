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
  ShieldCheckIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const isLogin = ref(true);
const loading = ref(false);

// Form States
const email = ref("");
const password = ref("");
const username = ref("");
const displayName = ref("");
const captchaToken = ref(null);

// Password Validation (8+ chars, mengandung huruf & angka)
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
    // Validasi Captcha sekarang berlaku untuk Login DAN Register
    if (!captchaToken.value) {
      throw new Error("Tolong selesaikan Captcha dulu ya, Mas!");
    }

    if (isLogin.value) {
      // --- LOGIKA LOGIN ---
      let loginEmail = email.value;

      // Jika input bukan email (tidak ada @), cari email berdasarkan username
      if (!email.value.includes("@")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", email.value.toLowerCase())
          .single();

        if (profile) {
          loginEmail = profile.email;
        } else {
          throw new Error("Username tidak ditemukan.");
        }
      }

      // Pastikan mengirimkan captchaToken saat login
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password.value,
        options: {
          captchaToken: captchaToken.value,
        },
      });

      if (error) throw error;

      notify.success("Gacor!", "Selamat datang kembali!");
      router.push("/").then(() => window.location.reload());
    } else {
      // --- LOGIKA REGISTER ---

      // 1. Validasi Password
      if (!isPasswordValid(password.value)) {
        throw new Error(
          "Password wajib 8+ karakter dengan campuran HURUF dan ANGKA!",
        );
      }

      // 2. IP Check (Anti-Bot)
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const { ip } = await ipRes.json();

      const { data: existingIP } = await supabase
        .from("profiles")
        .select("id")
        .eq("last_ip", ip)
        .limit(1);

      if (existingIP && existingIP.length > 0) {
        throw new Error("IP Anda sudah terdaftar (Kebijakan 1 Akun/IP).");
      }

      // 3. Proses SignUp (Dengan Captcha)
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

      notify.success(
        "Verifikasi Email",
        "Pendaftaran berhasil! Cek email Mas buat aktivasi.",
      );
      isLogin.value = true;
    }
  } catch (e) {
    notify.error("Autentikasi Gagal", e.message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="fixed inset-0 h-screen w-full bg-[#0a0a0a] flex items-center justify-center px-4 overflow-hidden z-[110]"
  >
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 blur-[150px] -z-10"
    ></div>

    <div
      class="max-w-md w-full bg-gray-900/50 backdrop-blur-xl p-8 md:p-10 rounded-[40px] border border-white/5 shadow-2xl overflow-y-auto max-h-[95vh]"
    >
      <div class="text-center mb-8">
        <h2
          class="text-3xl font-[1000] text-white italic tracking-tighter uppercase leading-none"
        >
          {{ isLogin ? "Access" : "Create" }}
          <span class="text-yellow-500">Vault</span>
        </h2>
        <p
          class="text-gray-500 text-[10px] mt-3 font-black uppercase tracking-[0.3em] italic leading-none"
        >
          {{
            isLogin
              ? "TokoBersama Auction Platform"
              : "Secure your collector identity"
          }}
        </p>
      </div>

      <button
        @click="handleGoogleLogin"
        :disabled="loading"
        class="w-full mb-6 flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-black py-4 rounded-2xl font-black italic uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          class="w-5 h-5"
        />
        {{ loading ? "Connecting..." : "Continue with Google" }}
      </button>

      <div class="flex items-center gap-4 mb-6">
        <div class="h-[1px] flex-1 bg-white/5"></div>
        <span class="text-[8px] font-black text-gray-600 uppercase italic"
          >Or Manual Entry</span
        >
        <div class="h-[1px] flex-1 bg-white/5"></div>
      </div>

      <form @submit.prevent="handleAuth" class="space-y-4">
        <template v-if="!isLogin">
          <div class="relative group">
            <IdentificationIcon
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-yellow-500 transition-colors"
            />
            <input
              v-model="displayName"
              type="text"
              placeholder="DISPLAY NAME (CONTOH: BUDI)"
              required
              class="w-full bg-black/60 border border-white/5 p-4 pl-12 text-xs font-bold text-white focus:border-yellow-500 outline-none transition-all uppercase italic rounded-2xl"
            />
          </div>
          <div class="relative group">
            <UserIcon
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-yellow-500 transition-colors"
            />
            <input
              v-model="username"
              type="text"
              placeholder="USERNAME UNIK"
              required
              class="w-full bg-black/60 border border-white/5 p-4 pl-12 text-xs font-bold text-white focus:border-yellow-500 outline-none transition-all lowercase rounded-2xl"
            />
          </div>
        </template>

        <div class="relative group">
          <EnvelopeIcon
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-yellow-500 transition-colors"
          />
          <input
            v-model="email"
            :type="isLogin ? 'text' : 'email'"
            :placeholder="isLogin ? 'USERNAME ATAU EMAIL' : 'ALAMAT EMAIL'"
            required
            class="w-full bg-black/60 border border-white/5 p-4 pl-12 text-xs font-bold text-white focus:border-yellow-500 outline-none transition-all rounded-2xl"
          />
        </div>

        <div class="relative group">
          <LockClosedIcon
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-yellow-500 transition-colors"
          />
          <input
            v-model="password"
            type="password"
            placeholder="PASSWORD"
            required
            class="w-full bg-black/60 border border-white/5 p-4 pl-12 text-xs font-bold text-white focus:border-yellow-500 outline-none transition-all rounded-2xl"
          />
        </div>

        <div
          class="flex flex-col items-center py-2 bg-white/5 rounded-2xl border border-white/5"
        >
          <VueHcaptcha
            sitekey="79c28c58-78ee-4b60-98c2-86acead28556"
            @verify="onCaptchaVerified"
            @expired="onCaptchaExpired"
            theme="dark"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-yellow-500 py-4 font-[1000] uppercase italic tracking-widest text-black rounded-2xl hover:bg-white transition-all active:scale-95 disabled:opacity-50 shadow-[0_10px_20px_rgba(234,179,8,0.2)]"
        >
          {{
            loading
              ? "Processing..."
              : isLogin
                ? "Establish Session"
                : "Register Account"
          }}
        </button>
      </form>

      <div class="mt-8 text-center border-t border-white/5 pt-6">
        <button
          @click="isLogin = !isLogin"
          class="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors italic"
        >
          {{
            isLogin
              ? "New member? Create TOKOBERSAMA ID"
              : "Already verified? Enter TOKOBERSAMA"
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.max-h-\[95vh\] {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.max-h-\[95vh\]::-webkit-scrollbar {
  display: none;
}
</style>
