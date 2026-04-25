import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page discount-page">
        <app-header mode="catalog"></app-header>

        <main class="home-content">
            <section class="favorites-hero">
                <div>
                    <p class="hero-kicker">Special Offers</p>
                    <h1 class="profile-title">Украшения со скидкой</h1>
                </div>
                <p class="profile-description">
                    Актуальные акцентные предложения Diamond Blackstar с выгодной ценой прямо сейчас.
                </p>
            </section>

            <section class="collection-section favorites-section">
                <div class="catalog-meta favorites-meta">
                    <p class="catalog-count">
                        {{ isLoading ? 'Загрузка...' : 'Предложений: ' + items.length }}
                    </p>
                    <router-link class="detail-link" to="/catalog">
                        Открыть весь каталог
                    </router-link>
                </div>

                <p v-if="errorMessage" class="collection-state">{{ errorMessage }}</p>
                <p v-else-if="isLoading" class="collection-state">Подбираем актуальные скидки...</p>
                <p v-else-if="items.length === 0" class="collection-state">
                    Сейчас скидочных предложений нет.
                </p>

                <div v-else class="collection-grid catalog-grid">
                    <article
                        v-for="item in items"
                        :key="item.id"
                        class="product-card"
                    >
                        <div class="product-media">
                            <img :src="item.imageUrl" :alt="item.title">
                        </div>
                        <div class="product-body">
                            <div class="product-meta">
                                <span class="product-category">{{ getCategoryLabel(item.category) }}</span>
                                <span class="product-badge product-badge-discount">Скидка -{{ item.discountPercent }}%</span>
                            </div>
                            <h2 class="product-title">{{ item.title }}</h2>
                            <p class="product-description">{{ item.description }}</p>
                            <div class="product-footer product-footer-actions">
                                <div class="product-price-group">
                                    <strong class="product-price">{{ formatPrice(item.finalPrice) }}</strong>
                                    <span class="product-price-old">{{ formatPrice(item.originalPrice) }}</span>
                                </div>
                                <router-link
                                    class="detail-link"
                                    :to="'/catalog/' + item.id"
                                >
                                    Подробнее
                                </router-link>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    </div>
    `,

    data() {
        return {
            items: [],
            isLoading: false,
            errorMessage: ''
        };
    },

    mounted() {
        this.loadDiscountItems();
    },

    methods: {
        getCategoryLabel(category) {
            const labels = {
                Rings: 'Кольца',
                Earrings: 'Серьги',
                Bracelets: 'Браслеты',
                Necklaces: 'Колье',
                Pendants: 'Подвески'
            };

            return labels[category] || category;
        },

        formatPrice(value) {
            const amount = Number(value);

            if (Number.isNaN(amount)) {
                return value;
            }

            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'BYN',
                maximumFractionDigits: 0
            }).format(amount);
        },

        async loadDiscountItems() {
            this.isLoading = true;
            this.errorMessage = '';

            try {
                const response = await fetch('/api/items?discount=true');
                const result = await response.json();

                if (!response.ok || result.status !== 'ok') {
                    this.errorMessage = 'Не удалось загрузить скидочные товары.';
                    return;
                }

                this.items = Array.isArray(result.items) ? result.items : [];
            } catch (err) {
                this.errorMessage = 'Не удалось загрузить скидочные товары.';
            } finally {
                this.isLoading = false;
            }
        }
    }
};
