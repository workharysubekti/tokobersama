import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import ProductDetail from "./views/ProductDetail.vue";
import Login from "./views/Login.vue";
import { supabase } from "./lib/supabase.js";

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
    component: () => import("../src/layouts/AdminLayout.vue"),
    meta: { requiresAdmin: true },
    children: [
      {
        path: "",
        name: "AdminDashboard",
        component: () => import("../src/views/admin/Dashboard.vue"),
      },
      {
        path: "users",
        name: "AdminUsers",
        component: () => import("../src/views/admin/Users.vue"),
      },
      {
        path: "tickets",
        name: "AdminTickets",
        component: () => import("../src/views/admin/Tickets.vue"),
      },
    ],
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

router.beforeEach(async (to, from, next) => {
  // 1. Ambil session user dari Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 2. Jika route butuh Admin
  if (to.meta.requiresAdmin) {
    if (!session) {
      return next("/login"); // Belum login? Tendang ke Login
    }

    // 3. Cek apakah user ini Admin di tabel profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (profile && profile.is_admin) {
      next(); // OK, silakan masuk bos!
    } else {
      next("/"); // Bukan admin? Tendang ke Home
    }
  } else {
    next(); // Route biasa, silakan lewat
  }
});
export default router;
