import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import ProductDetail from "./views/ProductDetail.vue";
import CheckoutView from "./views/CheckoutView.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/product/:id", component: ProductDetail, props: true },
  { path: "/checkout", component: CheckoutView }, // :id itu dinamis, bisa 1, 2, dst.
  {
    path: "/search",
    name: "Search",
    component: () => import("./views/SearchPage.vue"),
  },
  { path: "/profile", component: () => import("../src/views/ProfileView.vue") },
  {
    path: "/notifications",
    component: () => import("../src/views/NotificationView.vue"),
  },
  {
    path: "/messages",
    component: () => import("../src/views/MessageView.vue"),
  },
  {
    path: "/admin",
    component: () => import("../src/components/AdminPanel.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
