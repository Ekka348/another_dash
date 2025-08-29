// Bitrix24 API configuration and methods
const BITRIX_CONFIG = {
    domain: '',
    webhook: '',
    userId: ''
};

// Настройка конфигурации Bitrix24
function setBitrixConfig(domain, webhook, userId) {
    BITRIX_CONFIG.domain = domain;
    BITRIX_CONFIG.webhook = webhook;
    BITRIX_CONFIG.userId = userId;
    localStorage.setItem('bitrix_config', JSON.stringify(BITRIX_CONFIG));
    window.bitrixConfigured = true;
}

// Загрузка конфигурации из localStorage
function loadBitrixConfig() {
    try {
        const saved = localStorage.getItem('bitrix_config');
        if (saved) {
            const config = JSON.parse(saved);
            Object.assign(BITRIX_CONFIG, config);
            window.bitrixConfigured = true;
            return true;
        }
    } catch (error) {
        console.error('Error loading Bitrix config:', error);
    }
    window.bitrixConfigured = false;
    return false;
}

// Проверка настройки API
function isBitrixConfigured() {
    return BITRIX_CONFIG.domain && BITRIX_CONFIG.webhook;
}

// Выполнение запроса к Bitrix24 API
async function bitrixApiCall(method, params = {}) {
    if (!isBitrixConfigured()) {
        throw new Error('Bitrix24 не настроен. Укажите домен и webhook.');
    }

    const url = `https://${BITRIX_CONFIG.domain}/rest/${BITRIX_CONFIG.webhook}/${method}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error_description || 'Bitrix24 API error');
        }

        return data.result;
    } catch (error) {
        console.error('Bitrix API call failed:', error);
        throw error;
    }
}

// Получение лидов из Bitrix24 с фильтрацией по статусам
async function fetchBitrixLeads(startDate, endDate) {
    try {
        const leads = await bitrixApiCall('crm.lead.list', {
            select: ['ID', 'TITLE', 'STATUS_ID', 'ASSIGNED_BY_ID', 'DATE_MODIFY'],
            filter: {
                'STATUS_ID': Object.keys(STATUS_MAP),
                '>=DATE_MODIFY': formatDateForBitrix(startDate) + ' 00:00:00',
                '<=DATE_MODIFY': formatDateForBitrix(endDate) + ' 23:59:59'
            },
            order: { "DATE_MODIFY": "ASC" }
        });

        return leads.map(lead => ({
            ID: lead.ID,
            TITLE: lead.TITLE || `Лид #${lead.ID}`,
            STATUS_ID: lead.STATUS_ID,
            ASSIGNED_BY_ID: lead.ASSIGNED_BY_ID,
            DATE_MODIFY: lead.DATE_MODIFY
        }));
    } catch (error) {
        console.error('Error fetching leads from Bitrix24:', error);
        throw error;
    }
}

// Получение пользователей (операторов) из Bitrix24
async function fetchBitrixUsers() {
    try {
        const users = await bitrixApiCall('user.get', {
            filter: {
                'ACTIVE': true
            },
            select: ['ID', 'NAME', 'LAST_NAME', 'WORK_DEPARTMENT', 'IS_ONLINE', 'LAST_ACTIVITY_DATE']
        });

        return users.map(user => ({
            ID: user.ID,
            NAME: user.NAME,
            LAST_NAME: user.LAST_NAME,
            FULL_NAME: `${user.NAME} ${user.LAST_NAME}`.trim(),
            DEPARTMENT: user.WORK_DEPARTMENT || 'Не указан',
            IS_ONLINE: user.IS_ONLINE,
            LAST_ACTIVITY_DATE: user.LAST_ACTIVITY_DATE
        }));
    } catch (error) {
        console.error('Error fetching users from Bitrix24:', error);
        throw error;
    }
}

// Вспомогательные функции для форматирования дат
function formatDateForBitrix(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForInput(date) {
    return formatDateForBitrix(date);
}

function formatDateTimeDisplay(date) {
    return new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
