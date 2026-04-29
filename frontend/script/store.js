const { createStore } = window.Vuex;

function readStoredUser() {
    try {
        const rawUser = sessionStorage.getItem('currentUser');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch (err) {
        return null;
    }
}

function persistAuth(token, user) {
    if (token) {
        sessionStorage.setItem('authToken', token);
        document.cookie = `authToken=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }

    if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    }
}

function clearStoredAuth() {
    document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax';
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
}

export const store = createStore({
    state() {
        return {
            token: sessionStorage.getItem('authToken'),
            user: readStoredUser()
        };
    },

    getters: {
        isAuthenticated(state) {
            return Boolean(state.token);
        },

        isAdmin(state) {
            return state.user?.role === 'admin';
        },

        authHeaders(state) {
            return state.token
                ? { Authorization: `Bearer ${state.token}` }
                : null;
        },

        jsonAuthHeaders(state) {
            return state.token
                ? {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${state.token}`
                }
                : null;
        }
    },

    mutations: {
        setAuth(state, { token, user }) {
            state.token = token;
            state.user = user;
            persistAuth(token, user);
        },

        setUser(state, user) {
            state.user = user;

            if (user) {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            } else {
                sessionStorage.removeItem('currentUser');
            }
        },

        clearAuth(state) {
            state.token = null;
            state.user = null;
            clearStoredAuth();
        }
    },

    actions: {
        setAuth({ commit }, payload) {
            commit('setAuth', payload);
        },

        clearAuth({ commit }) {
            commit('clearAuth');
        },

        async logout({ commit }) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
            }

            commit('clearAuth');
        },

        async refreshUser({ commit, state }) {
            if (!state.token) {
                commit('clearAuth');
                return null;
            }

            const response = await fetch('/api/auth/me', {
                credentials: 'include',
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });
            const result = await response.json().catch(() => null);

            if (!response.ok || result?.status !== 'ok') {
                commit('clearAuth');
                return null;
            }

            commit('setUser', result.user);
            return result.user;
        }
    }
});
