import Home from './components/Home.js';
import Auth from './components/Auth.js';
import Profile from './components/Profile.js';
import Catalog from './components/Catalog.js';
import ItemDetails from './components/ItemDetails.js';
import Favorites from './components/Favorites.js';
import Cart from './components/Cart.js';
import Discount from './components/Discount.js';
import Admin from './components/Admin.js';
import { store } from './store.js';


const { createRouter, createWebHistory } = window.VueRouter;

function updatePageStyle(path) {
    const pageStyle = document.getElementById('page-style');

    if (!pageStyle) {
        return;
    }

    pageStyle.href = path.startsWith('/auth') ? '/style.css' : '/stylemain.css';
}

const routes = [
    { path: '/', component: Home },
    { path: '/catalog', component: Catalog },
    { path: '/catalog/:id', component: ItemDetails },
    { path: '/discount', component: Discount },
    { path: '/favorites', component: Favorites, meta: { requiresAuth: true } },
    { path: '/cart', component: Cart, meta: { requiresAuth: true } },
    { path: '/auth/login', component: Auth, props: { mode: 'login' } },
    { path: '/auth/register', component: Auth, props: { mode: 'register' } },
    { path: '/profile', component: Profile, meta: { requiresAuth: true } },
    { path: '/admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } },
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to) => {
    if (to.meta.requiresAuth && !store.getters.isAuthenticated) {
        return '/auth/login';
    }

    if (to.meta.requiresAdmin && store.state.user && !store.getters.isAdmin) {
        return '/profile';
    }

    if ((to.path === '/auth/login' || to.path === '/auth/register') && store.getters.isAuthenticated) {
        return '/profile';
    }
});

updatePageStyle(window.location.pathname);

router.afterEach((to) => {
    updatePageStyle(to.path);
});
