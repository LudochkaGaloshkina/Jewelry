const images = ['/script/Денис.jpg', "/script/Пашка.jpg", "/script/Вероника.jpg"]; 

const slider = document.querySelector('[data-slider]');
const prevBtn = document.querySelector('[data-btn-prev]');
const nextBtn = document.querySelector('[data-btn-next]');

let currentIndex = 0;                  

function setupSlides() {
    images.forEach((imagesUrl, index) => {
        const img = document.createElement('img');
        img.classList.add('image');
        img.src = imagesUrl;
        img.dataset.index = index;
        img.alt = `slide ${index + 1}`;
        slider.appendChild(img);
    });
    // дублируем первый и последний слайд для бесшовной прокрутки
    const firstClone = slider.firstElementChild.cloneNode(true);
    const lastClone  = slider.lastElementChild.cloneNode(true);
    slider.appendChild(firstClone);
    slider.insertBefore(lastClone, slider.firstChild);
}

function moveToIndex(idx, animate = true) {
    // используем ширину слайдера, а не ширину изображения, чтобы избежать проблем с позиционированием при изменении размера окна
    const slideWidth = slider.clientWidth;
    if (!animate) slider.style.transition = 'none';
    else slider.style.transition = 'transform 0.5s ease-in-out';
    slider.style.transform = `translateX(-${slideWidth * (idx + 1)}px)`;
}

function initSlider() {
    currentIndex = 0;
    moveToIndex(currentIndex, false);
    // перезапуск таймера при изменении размера окна, чтобы избежать проблем с позиционированием при изменении ширины слайдера
    window.addEventListener('resize', () => moveToIndex(currentIndex, false));
}

nextBtn.addEventListener('click', () => {
    currentIndex++;
    moveToIndex(currentIndex);
    restartAuto();                      // перезапуск таймера при ручной навигации пользователя
});

prevBtn.addEventListener('click', () => {
    currentIndex--;
    moveToIndex(currentIndex);
    restartAuto();                      // перезапуск таймера при ручной навигации пользователя
});

let autoTimer = null;
const AUTO_INTERVAL = 3500; // милисекунды между автоматической сменой слайдов

function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
        currentIndex++;
        moveToIndex(currentIndex);
    }, AUTO_INTERVAL);
}

function stopAuto() {
    if (autoTimer !== null) {
        clearInterval(autoTimer);
        autoTimer = null;
    }
}

function restartAuto() {
    startAuto();
}

slider.addEventListener('transitionend', () => {
    // при достижении клона первого слайда после последнего, мгновенно перемещаемся к реальному первому слайду без анимации
    if (currentIndex >= images.length) {
        currentIndex = 0;
        moveToIndex(currentIndex, false);
    }
    if (currentIndex < 0) {
        currentIndex = images.length - 1;
        moveToIndex(currentIndex, false);
    }
});


setupSlides();
initSlider();
startAuto();

