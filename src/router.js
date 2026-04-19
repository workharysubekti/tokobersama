import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import ProductDetail from "./views/ProductDetail.vue";
import Login from "./views/Login.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/product/:id", component: ProductDetail, props: true },
  {
    path: "/search",
    name: "Search",
    component: () => import("./views/SearchPage.vue"),
  },
  { path: "/profile", component: () => import("../src/views/ProfileView.vue") },
  {
    path: "/my-bids",
    name: "MyBids",
    component: () => import("./views/BidsView.vue"),
  },
  {
    path: "/messages",
    component: () => import("../src/views/MessageView.vue"),
  },
  {
    path: "/admin",
    component: () => import("../src/components/AdminPanel.vue"),
  },
  { path: "/login", component: Login },
  {
    path: "/admin-tambah",
    name: "AdminTambah",
    component: () => import("../src/views/Home.vue"), // Sementara arahkan ke Home dulu biar gak error
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
