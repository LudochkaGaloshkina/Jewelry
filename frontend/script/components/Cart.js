import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page cart-page">
        <app-header mode="profile"></app-header>

        <main class="home-content">
            <section class="favorites-hero">
                <div>
                    <p class="hero-kicker">Cart</p>
                    <h1 class="profile-title">Корзина</h1>
                </div>
                <div class="cart-summary-panel">
                    <span class="profile-label">Итого</span>
                    <strong>{{ formatPrice(summary.totalPrice) }}</strong>
                    <span>{{ summary.totalQuantity }} {{ getItemWord(summary.totalQuantity) }}</span>
                </div>
            </section>

            <section class="collection-section cart-section">
                <div class="catalog-meta favorites-meta">
                    <p class="catalog-count">
                        {{ isLoading ? 'Загрузка...' : 'Товаров: ' + items.length }}
                    </p>
                    <div class="cart-meta-actions">
                        <router-link class="detail-link" to="/catalog">
                            Вернуться в каталог
                        </router-link>
                        <button
                            v-if="items.length"
                            class="favorites-remove cart-clear-button"
                            type="button"
                            :disabled="isClearing"
                            @click="clearCart"
                        >
                            {{ isClearing ? 'Очищаем...' : 'Очистить корзину' }}
                        </button>
                    </div>
                </div>

                <p v-if="errorMessage" class="collection-state collection-state-error">{{ errorMessage }}</p>
                <p v-else-if="isLoading" class="collection-state">Загружаем корзину...</p>
                <p v-else-if="items.length === 0" class="collection-state">
                    В корзине пока нет товаров.
                </p>

                <div v-else class="cart-list">
                    <article
                        v-for="cartItem in items"
                        :key="cartItem.cartId"
                        class="cart-row"
                    >
                        <router-link class="cart-row-media" :to="'/catalog/' + cartItem.itemId">
                            <img :src="cartItem.item.imageUrl" :alt="cartItem.item.title">
                        </router-link>

                        <div class="cart-row-body">
                            <div class="product-meta">
                                <span class="product-category">{{ getCategoryLabel(cartItem.item.category) }}</span>
                                <span v-if="cartItem.item.isDiscounted" class="product-badge product-badge-discount">Скидка -{{ cartItem.item.discountPercent }}%</span>
                            </div>
                            <router-link class="cart-row-title" :to="'/catalog/' + cartItem.itemId">
                                {{ cartItem.item.title }}
                            </router-link>
                            <p class="cart-row-description">{{ cartItem.item.description }}</p>
                        </div>

                        <div class="cart-row-controls">
                            <div class="cart-price-block">
                                <span class="profile-label">Цена</span>
                                <strong>{{ formatPrice(cartItem.price) }}</strong>
                            </div>

                            <div class="cart-quantity">
                                <button
                                    type="button"
                                    :disabled="updatingCartId === cartItem.cartId || cartItem.quantity <= 1"
                                    @click="changeQuantity(cartItem, cartItem.quantity - 1)"
                                    aria-label="Уменьшить количество"
                                >
                                    -
                                </button>
                                <input
                                    :value="cartItem.quantity"
                                    type="number"
                                    min="1"
                                    max="99"
                                    @change="changeQuantity(cartItem, $event.target.value)"
                                >
                                <button
                                    type="button"
                                    :disabled="updatingCartId === cartItem.cartId || cartItem.quantity >= 99"
                                    @click="changeQuantity(cartItem, cartItem.quantity + 1)"
                                    aria-label="Увеличить количество"
                                >
                                    +
                                </button>
                            </div>

                            <div class="cart-price-block cart-total-block">
                                <span class="profile-label">Сумма</span>
                                <strong>{{ formatPrice(cartItem.totalPrice) }}</strong>
                            </div>

                            <button
                                class="favorites-remove"
                                type="button"
                                :disabled="removingCartId === cartItem.cartId"
                                @click="removeCartItem(cartItem.cartId)"
                            >
                                {{ removingCartId === cartItem.cartId ? 'Удаляем...' : 'Удалить' }}
                            </button>
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
            summary: {
                totalQuantity: 0,
                totalPrice: 0
            },
            isLoading: false,
            isClearing: false,
            updatingCartId: null,
            removingCartId: null,
            errorMessage: ''
        };
    },

    async mounted() {
        await this.loadCart();
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

        getItemWord(count) {
            const normalizedCount = Math.abs(Number(count)) % 100;
            const lastDigit = normalizedCount % 10;

            if (normalizedCount > 10 && normalizedCount < 20) {
                return 'товаров';
            }

            if (lastDigit === 1) {
                return 'товар';
            }

            if (lastDigit >= 2 && lastDigit <= 4) {
                return 'товара';
            }

            return 'товаров';
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

        getApiErrorMessage(result, fallbackMessage) {
            const serverMessage = typeof result?.message === 'string' ? result.message.trim() : '';

            if (serverMessage) {
                return `${fallbackMessage} ${serverMessage}.`;
            }

            return fallbackMessage;
        },

        getAuthHeaders() {
            const headers = this.$store.getters.jsonAuthHeaders;

            if (!headers) {
                this.$router.replace('/auth/login');
                return null;
            }

            return headers;
        },

        applyCartResult(result) {
            this.items = Array.isArray(result?.items) ? result.items : [];
            this.summary = {
                totalQuantity: Number(result?.summary?.totalQuantity) || 0,
                totalPrice: Number(result?.summary?.totalPrice) || 0
            };
        },

        async loadCart() {
            const headers = this.getAuthHeaders();

            if (!headers) {
                return;
            }

            this.isLoading = true;
            this.errorMessage = '';

            try {
                const response = await fetch('/api/users/me/cart', {
                    credentials: 'include',
                    headers
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.errorMessage = this.getApiErrorMessage(result, 'Не удалось загрузить корзину.');
                    return;
                }

                this.applyCartResult(result);
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                    this.$router.replace('/auth/login');
                    return;
                }

                this.errorMessage = 'Не удалось загрузить корзину. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.isLoading = false;
            }
        },

        async changeQuantity(cartItem, value) {
            const quantity = Number(value);

            if (
                !Number.isInteger(quantity)
                || quantity < 1
                || quantity > 99
                || quantity === cartItem.quantity
                || this.updatingCartId
            ) {
                return;
            }

            const headers = this.getAuthHeaders();

            if (!headers) {
                return;
            }

            this.updatingCartId = cartItem.cartId;
            this.errorMessage = '';

            try {
                const response = await fetch(`/api/users/me/cart/${cartItem.cartId}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({ quantity })
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.errorMessage = this.getApiErrorMessage(result, 'Не удалось изменить количество.');
                    return;
                }

                this.applyCartResult(result);
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                    this.$router.replace('/auth/login');
                    return;
                }

                this.errorMessage = 'Не удалось изменить количество. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.updatingCartId = null;
            }
        },

        async removeCartItem(cartId) {
            const headers = this.getAuthHeaders();

            if (!headers || this.removingCartId) {
                return;
            }

            this.removingCartId = cartId;
            this.errorMessage = '';

            try {
                const response = await fetch(`/api/users/me/cart/${cartId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.errorMessage = this.getApiErrorMessage(result, 'Не удалось удалить товар из корзины.');
                    return;
                }

                this.applyCartResult(result);
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                    this.$router.replace('/auth/login');
                    return;
                }

                this.errorMessage = 'Не удалось удалить товар из корзины. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.removingCartId = null;
            }
        },

        async clearCart() {
            const headers = this.getAuthHeaders();

            if (!headers || this.isClearing) {
                return;
            }

            this.isClearing = true;
            this.errorMessage = '';

            try {
                const response = await fetch('/api/users/me/cart', {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.errorMessage = this.getApiErrorMessage(result, 'Не удалось очистить корзину.');
                    return;
                }

                this.applyCartResult(result);
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                    this.$router.replace('/auth/login');
                    return;
                }

                this.errorMessage = 'Не удалось очистить корзину. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.isClearing = false;
            }
        }
    }
};
