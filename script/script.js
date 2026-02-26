// document.getElementById("isaccreated").addEventListener("click", function(){
//     document.getElementById("loginform").classList.toggle('hidden');
//     // document.getElementById().classList.toggle()
// });
import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export function useVisibility() {
    const loginVisible = ref(false);
    const registerVisible = ref(true);

    function toggle() {
        loginVisible.value = !loginVisible.value;
        registerVisible.value = !registerVisible.value;
    }

    return { loginVisible, registerVisible, toggle };
}