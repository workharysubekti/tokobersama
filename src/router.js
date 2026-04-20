import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import ProductDetail from "./views/ProductDetail.vue";
import Login from "./views/Login.vue";

const routes = [
  { path: "/", component: Home, meta: { showBottomNav: true } },
  {
    path: "/product/:id",
    component: ProductDetail,
    props: true,
    meta: { showBottomNav: true },
  },
  {
    path: "/search",
    name: "Search",
    component: () => import("./views/SearchPage.vue"),
    meta: { showBottomNav: true },
  },
  {
    path: "/profile",
    component: () => import("../src/views/ProfileView.vue"),
    meta: { showBottomNav: true },
  },
  {
    path: "/my-bids",
    name: "MyBids",
    component: () => import("./views/BidsView.vue"),
    meta: { showBottomNav: true },
  },
  {
    path: "/messages",
    component: () => import("../src/views/MessageView.vue"),
    meta: { showBottomNav: true },
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
