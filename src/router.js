import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import ProductDetail from "./views/ProductDetail.vue";
import CheckoutView from "./views/CheckoutView.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/product/:id", component: ProductDetail, props: true },
  { path: "/checkout", component: CheckoutView }, // :id itu dinamis, bisa 1, 2, dst.
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
