import Home from './components/Home.js';
import Auth from './components/Auth.js';
import Profile from './components/Profile.js';
import Catalog from './components/Catalog.js';
import ItemDetails from './components/ItemDetails.js';
import Favorites from './components/Favorites.js';
import Discount from './components/Discount.js';
import Admin from './components/Admin.js';


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
    const token = sessionStorage.getItem('authToken');
    const rawUser = sessionStorage.getItem('currentUser');
    let currentUser = null;

    try {
        currentUser = rawUser ? JSON.parse(rawUser) : null;
    } catch (err) {
        currentUser = null;
    }

    if (to.meta.requiresAuth && !token) {
        return '/auth/login';
    }

    if (to.meta.requiresAdmin && currentUser && currentUser.role !== 'admin') {
        return '/profile';
    }

    if ((to.path === '/auth/login' || to.path === '/auth/register') && token) {
        return '/profile';
    }
});

updatePageStyle(window.location.pathname);

router.afterEach((to) => {
    updatePageStyle(to.path);
});
