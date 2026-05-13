export function getApiErrorMessage(result, fallbackMessage, response = null) {
    const serverMessage = typeof result?.message === 'string' ? result.message.trim() : '';

    if (serverMessage) {
        return `${fallbackMessage} ${serverMessage}`;
    }

    if (response?.status >= 500) {
        return `${fallbackMessage} На сервере произошла ошибка. Попробуйте ещё раз позже.`;
    }

    if (response?.status === 404) {
        return `${fallbackMessage} Запрошенные данные не найдены.`;
    }

    if (response?.status === 401) {
        return `${fallbackMessage} Нужно войти в аккаунт.`;
    }

    return fallbackMessage;
}

export function getNetworkErrorMessage(fallbackMessage) {
    return `${fallbackMessage} Проверьте подключение к интернету или запущен ли сервер, затем попробуйте ещё раз.`;
}
