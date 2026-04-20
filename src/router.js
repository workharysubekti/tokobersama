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
    name: "Messages",
    component: () => import("./views/MessagesView.vue"),
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
  {
    path: "/vault",
    component: () => import("../src/views/VaultView.vue"),
    meta: { showBottomNav: true },
  },
  {
    path: "/create-listing",
    component: () => import("../src/views/CreateListing.vue"),
  },
  {
    path: "/user/:username",
    name: "PublicProfile",
    component: () => import("../src/views/PublicProfileView.vue"),
    meta: { showBottomNav: true },
  },
  {
    path: "/messages/:userId",
    name: "ChatDetail",
    component: () => import("../src/views/ChatDetailView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
