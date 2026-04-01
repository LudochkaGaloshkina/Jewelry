import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page">
        <app-header mode="home"></app-header>

        <main class="home-content">
            <section class="hero-copy">
                <p class="hero-kicker">Premium Jewelry House</p>
                <h1 class="hero-title">Украшения с характером и блеском ночного золота</h1>
                <p class="hero-description">
                    Откройте коллекцию Diamond Blackstar: выразительные формы, глубокий
                    блеск металла и украшения, которые хочется запоминать.
                </p>
            </section>

            <section class="slider-card">
                <div class="slider-meta">
                    <span class="slider-badge">Featured Selection</span>
                    <span class="slider-count">
                        {{ String(currentIndex + 1).padStart(2, '0') }} / {{ String(images.length).padStart(2, '0') }}
                    </span>
                </div>

                <div class="roundabound">
                    <div class="slider" ref="slider"></div>
                    <button class="prev" @click="prev" aria-label="Предыдущий слайд">◄</button>
                    <button class="next" @click="next" aria-label="Следующий слайд">►</button>
                </div>
            </section>
        </main>
    </div>
    `,

    mounted() {
        this.setupSlider();
        this.startAutoSlide();
    },

    beforeUnmount() {
        this.stopAutoSlide();
    },

    data() {
        return {
            images: [
                '/script/Денис.jpg',
                '/script/Пашка.jpg',
                '/script/Вероника.jpg',
                '/script/Дима.jpg'
            ],
            currentIndex: 0,
            autoSlideId: null
        };
    },

    methods: {
        setupSlider() {
            const slider = this.$refs.slider;

            slider.innerHTML = '';

            this.images.forEach(src => {
                const img = document.createElement('img');
                img.src = src;
                img.classList.add('image');
                slider.appendChild(img);
            });

            this.update();
        },

        startAutoSlide() {
            this.stopAutoSlide();
            this.autoSlideId = setInterval(() => {
                this.next();
            }, 4000);
        },

        stopAutoSlide() {
            if (this.autoSlideId) {
                clearInterval(this.autoSlideId);
                this.autoSlideId = null;
            }
        },

        next() {
            this.currentIndex = (this.currentIndex + 1) % this.images.length;
            this.update();
        },

        prev() {
            this.currentIndex =
                (this.currentIndex - 1 + this.images.length) % this.images.length;
            this.update();
        },

        update() {
            const slider = this.$refs.slider;
            const width = slider.clientWidth;
            slider.style.transform = `translateX(-${this.currentIndex * width}px)`;
        }
    }
};
