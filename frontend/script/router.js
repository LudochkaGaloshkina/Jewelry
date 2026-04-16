import Home from './components/Home.js';
import Auth from './components/Auth.js';
import Profile from './components/Profile.js';
import Catalog from './components/Catalog.js';


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
    { path: '/auth/login', component: Auth, props: { mode: 'login' } },
    { path: '/auth/register', component: Auth, props: { mode: 'register' } },
    { path: '/profile', component: Profile, meta: { requiresAuth: true } },
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to) => {
    const token = sessionStorage.getItem('authToken');

    if (to.meta.requiresAuth && !token) {
        return '/auth/login';
    }

    if ((to.path === '/auth/login' || to.path === '/auth/register') && token) {
        return '/profile';
    }
});

updatePageStyle(window.location.pathname);

router.afterEach((to) => {
    updatePageStyle(to.path);
});
