export default {
    template: `
    <footer class="site-footer">
        <div class="footer-brand">
            <router-link class="footer-logo-link" to="/">
                <img class="footer-logo" src="/api/images/key/site_logo/file" alt="Diamond Blackstar logo">
                <span class="footer-brand-name">Diamond Blackstar</span>
            </router-link>
            <p class="footer-description">
                Ювелирные изделия премиум-класса для себя, подарков и особых моментов.
            </p>
        </div>

        <nav class="footer-section" aria-label="Навигация в футере">
            <h2 class="footer-title">Навигация</h2>
            <router-link to="/">Главная</router-link>
            <router-link to="/catalog">Каталог</router-link>
            <router-link to="/discount">Скидки</router-link>
            <router-link to="/favorites">Избранное</router-link>
        </nav>

        <address class="footer-section footer-contacts">
            <h2 class="footer-title">Контакты</h2>
            <span>Акулов Валентин</span>
            <a href="tel:+375298170804">+375 29 817 08 04</a>
            <a href="mailto:akula070307@gmail.com">akula070307@gmail.com</a>
        </address>

        <div class="footer-section">
            <h2 class="footer-title">Социальные сети</h2>
            <div class="footer-socials" aria-label="Социальные сети">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                    IG
                </a>
                <a href="https://t.me" target="_blank" rel="noreferrer" aria-label="Telegram">
                    TG
                </a>
                <a href="https://vk.com" target="_blank" rel="noreferrer" aria-label="VK">
                    VK
                </a>
            </div>
        </div>
    </footer>
    `
};
