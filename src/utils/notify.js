// src/utils/notify.js
import Swal from "sweetalert2";

// Konfigurasi Standar Tema TokoBersama
const Toast = Swal.mixin({
  background: "#111827",
  color: "#ffffff",
  confirmButtonColor: "#EAB308", // Kuning Emas
  cancelButtonColor: "#374151",
  buttonsStyling: true,
  customClass: {
    popup: "rounded-[20px] border border-gray-800",
    title: "font-black italic uppercase tracking-wider",
  },
});

export const notify = {
  // Notif Sukses (Bisa hilang sendiri)
  success(title, text = "") {
    Toast.fire({
      icon: "success",
      title,
      text,
      timer: 2000,
      showConfirmButton: false,
    });
  },

  // Notif Error/Gagal
  error(title, text = "") {
    Toast.fire({
      icon: "error",
      title,
      text,
    });
  },

  // Notif Peringatan
  warn(title, text = "") {
    Toast.fire({
      icon: "warning",
      title,
      text,
    });
  },

  // Notif Konfirmasi/Input (Buat ngebid)
  async confirmBid(currentBid) {
    return await Toast.fire({
      title: "PASANG BID",
      input: "number",
      inputLabel: `Minimal Bid: Rp ${(currentBid + 50000).toLocaleString()}`,
      inputPlaceholder: "Masukkan angka penawaran...",
      showCancelButton: true,
      confirmButtonText: "GAS BID!",
      cancelButtonText: "BATAL",
      inputValidator: (value) => {
        if (!value || value <= currentBid) {
          return "Tawaran harus lebih tinggi dari harga sekarang!";
        }
      },
    });
  },
};
