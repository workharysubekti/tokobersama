// src/utils/format.js

/**
 * Fungsi untuk mengubah angka menjadi format Rupiah (IDR)
 * Contoh: 10000 -> Rp 10.000
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price || 0);
};
