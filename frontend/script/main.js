import { router } from './router.js';
import { store } from './store.js';

const { createApp } = window.Vue;

createApp({}).use(store).use(router).mount('#app');
