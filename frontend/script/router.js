import Home from './components/Home.js';
import Auth from './components/Auth.js';


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
    { path: '/auth/login', component: Auth, props: { mode: 'login' } },
    { path: '/auth/register', component: Auth, props: { mode: 'register' } },
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

updatePageStyle(window.location.pathname);

router.afterEach((to) => {
    updatePageStyle(to.path);
});
