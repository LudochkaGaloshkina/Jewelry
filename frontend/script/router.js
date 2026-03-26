import Home from './components/Home.js';


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
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

updatePageStyle(window.location.pathname);

router.afterEach((to) => {
    updatePageStyle(to.path);
});
