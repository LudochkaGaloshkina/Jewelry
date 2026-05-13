import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page not-found-page">
        <app-header mode="default"></app-header>

        <main class="home-content not-found-content">
            <section class="not-found-panel">
                <p class="hero-kicker">404</p>
                <h1 class="profile-title">Страница не найдена</h1>
                <p class="profile-description">
                    Такого адреса на сайте нет или страница была перемещена.
                </p>
                <div class="profile-actions">
                    <router-link class="detail-link profile-link-button" to="/">
                        На главную
                    </router-link>
                    <router-link class="detail-link profile-link-button" to="/catalog">
                        Открыть каталог
                    </router-link>
                </div>
            </section>
        </main>
    </div>
    `
};
