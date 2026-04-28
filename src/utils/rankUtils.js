/**
 * TOKBER RANK & LIMIT SYSTEM V2 (MASTER)
 * Acuan Tunggal untuk Kasta, Batas Bid, dan Warna Premium
 */

export const RANKS = [
  { name: "MEMBER", min: 0, max: 199, limit: 5000000, color: "#22C55E" }, // Hijau (Fresh Start)
  {
    name: "INTERMEDIATE",
    min: 200,
    max: 399,
    limit: 40000000,
    color: "#3B82F6",
  }, // Biru (Established)
  { name: "EXPERT", min: 400, max: 799, limit: 100000000, color: "#06B6D4" }, // Cyan/Diamond (High Tier)
  { name: "MASTER", min: 800, max: 1199, limit: 500000000, color: "#F97316" }, // Elegant Orange (Pro)
  {
    name: "LEGEND",
    min: 1200,
    max: Infinity,
    limit: Infinity,
    color: "#FACC15",
  }, // Shining Gold (Top Tier)
];

export const getRankDetails = (reputation, isAdmin = false) => {
  // OWNER/ADMIN: Merah Berani
  if (isAdmin) {
    return {
      name: "OWNER",
      limit: Infinity,
      color: "#EF4444",
      nextRank: null,
      progress: 100,
    };
  }

  // Cari kasta berdasarkan reputasi
  const rank =
    RANKS.find((r) => reputation >= r.min && reputation <= r.max) || RANKS[0];

  const nextRankIndex = RANKS.indexOf(rank) + 1;
  const nextRank = RANKS[nextRankIndex] || null;

  // Hitung progress ke kasta selanjutnya
  let progress = 100;
  if (nextRank) {
    const range = nextRank.min - rank.min;
    const current = reputation - rank.min;
    progress = Math.min((current / range) * 100, 100);
  }

  return {
    ...rank,
    nextRank: nextRank ? nextRank.name : "MAX",
    progress: progress.toFixed(1),
  };
};
