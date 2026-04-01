
const { ref } = window.Vue;

export function useVisibility() {
    const loginVisible = ref(false);
    const registerVisible = ref(true);

    function toggle() {
        loginVisible.value = !loginVisible.value;
        registerVisible.value = !registerVisible.value;
    }

    return { loginVisible, registerVisible, toggle };
}
