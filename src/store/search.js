// src/stores/search.js
import { defineStore } from "pinia";

export const useSearchStore = defineStore("search", {
  state: () => ({
    query: "",
    category: "SEMUA",
  }),
  actions: {
    setQuery(val) {
      this.query = val;
    },
    setCategory(val) {
      this.category = val;
    },
  },
});
