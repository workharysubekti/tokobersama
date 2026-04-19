// src/stores/searchStore.js
import { defineStore } from "pinia";

export const useSearchStore = defineStore("search", {
  state: () => ({
    searchQuery: "", // Pastikan ada string kosong di sini
  }),
  actions: {
    setSearch(query) {
      this.searchQuery = query;
    },
  },
});
