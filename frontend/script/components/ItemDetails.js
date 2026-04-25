import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="item-page">
        <app-header mode="catalog"></app-header>

        <main class="home-content">
            <p v-if="isLoading" class="collection-state">Загружаем карточку украшения...</p>
            <p v-else-if="errorMessage" class="collection-state">{{ errorMessage }}</p>

            <template v-else-if="item">
                <section class="item-breadcrumbs">
                    <router-link to="/catalog">Каталог</router-link>
                    <span>/</span>
                    <span>{{ item.title }}</span>
                </section>

                <section class="item-details-card">
                    <div class="item-gallery">
                        <div class="item-media">
                            <img :src="item.imageUrl" :alt="item.title">
                        </div>
                    </div>

                    <div class="item-summary">
                        <div class="product-meta">
                            <span class="product-category">{{ getCategoryLabel(item.category) }}</span>
                            <span v-if="item.isPopular" class="product-badge">Популярное</span>
                        </div>

                        <div class="item-headline">
                            <p class="hero-kicker">Карточка товара</p>
                            <h1 class="item-title">{{ item.title }}</h1>
                        </div>

                        <p class="item-price">{{ formatPrice(item.price) }}</p>

                        <p class="item-description">{{ item.description }}</p>

                        <div class="item-highlights">
                            <article class="item-highlight">
                                <span class="profile-label">Категория</span>
                                <strong>{{ getCategoryLabel(item.category) }}</strong>
                            </article>
                            <article class="item-highlight">
                                <span class="profile-label">Статус</span>
                                <strong>{{ item.isPopular ? 'Популярный товар' : 'Доступен в каталоге' }}</strong>
                            </article>
                            <article class="item-highlight">
                                <span class="profile-label">Артикул</span>
                                <strong>DB-{{ String(item.id).padStart(4, '0') }}</strong>
                            </article>
                        </div>

                        <div class="item-actions">
                            <button
                                type="button"
                                class="detail-action primary"
                                disabled
                                title="Функция появится позже"
                            >
                                Добавить в корзину
                            </button>
                            <button
                                type="button"
                                class="detail-action secondary"
                                disabled
                                title="Функция появится позже"
                            >
                                Добавить в избранное
                            </button>
                        </div>

                        <p class="item-note">
                            Кнопки пока отображаются как элементы интерфейса и будут подключены позже.
                        </p>
                    </div>
                </section>

                <section v-if="relatedItems.length" class="collection-section">
                    <div class="collection-heading item-related-heading">
                        <div>
                            <p class="hero-kicker">Похожие изделия</p>
                            <h2 class="collection-title">Украшения в том же настроении</h2>
                        </div>
                        <p class="collection-copy">
                            Подобрали ещё несколько украшений из той же категории.
                        </p>
                    </div>

                    <div class="collection-grid">
                        <article
                            v-for="relatedItem in relatedItems"
                            :key="relatedItem.id"
                            class="product-card"
                        >
                            <div class="product-media">
                                <img :src="relatedItem.imageUrl" :alt="relatedItem.title">
                            </div>
                            <div class="product-body">
                                <div class="product-meta">
                                    <span class="product-category">{{ getCategoryLabel(relatedItem.category) }}</span>
                                    <span v-if="relatedItem.isPopular" class="product-badge">Популярное</span>
                                </div>
                                <h2 class="product-title">{{ relatedItem.title }}</h2>
                                <p class="product-description">{{ relatedItem.description }}</p>
                                <div class="product-footer product-footer-actions">
                                    <strong class="product-price">{{ formatPrice(relatedItem.price) }}</strong>
                                    <router-link
                                        class="detail-link"
                                        :to="'/catalog/' + relatedItem.id"
                                    >
                                        Подробнее
                                    </router-link>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>
            </template>
        </main>
    </div>
    `,

    data() {
        return {
            item: null,
            relatedItems: [],
            isLoading: false,
            errorMessage: ''
        };
    },

    mounted() {
        this.loadPageData();
    },

    watch: {
        '$route.params.id'() {
            this.loadPageData();
        }
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

        async loadPageData() {
            this.isLoading = true;
            this.errorMessage = '';
            this.item = null;
            this.relatedItems = [];

            try {
                const itemId = this.$route.params.id;
                const itemResponse = await fetch(`/api/items/${itemId}`);
                const itemResult = await itemResponse.json();

                if (!itemResponse.ok || itemResult.status !== 'ok' || !itemResult.item) {
                    this.errorMessage = 'Не удалось загрузить товар.';
                    return;
                }

                this.item = itemResult.item;
                await this.loadRelatedItems(itemId);
            } catch (err) {
                this.errorMessage = 'Не удалось загрузить товар.';
            } finally {
                this.isLoading = false;
            }
        },

        async loadRelatedItems(itemId) {
            try {
                const relatedResponse = await fetch(`/api/items?related=${itemId}`);
                const relatedResult = await relatedResponse.json();

                if (!relatedResponse.ok || relatedResult.status !== 'ok') {
                    return;
                }

                this.relatedItems = Array.isArray(relatedResult.items)
                    ? relatedResult.items.slice(0, 3)
                    : [];
            } catch (err) {
                this.relatedItems = [];
            }
        }
    }
};
