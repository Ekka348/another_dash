// bitrixApi.js - Упрощенная версия

console.log('BitrixApi script loaded');

// Базовая конфигурация
const BITRIX_CONFIG = {
    domain: '',
    webhook: '',
    userId: ''
};

// Загрузка конфигурации
function loadBitrixConfig() {
    try {
        const saved = localStorage.getItem('bitrix_config');
        if (saved) {
            const config = JSON.parse(saved);
            Object.assign(BITRIX_CONFIG, config);
            console.log('Bitrix config loaded:', BITRIX_CONFIG);
            return true;
        }
    } catch (error) {
        console.error('Error loading Bitrix config:', error);
    }
    return false;
}

// Сохранение конфигурации
function setBitrixConfig(domain, webhook, userId) {
    BITRIX_CONFIG.domain = domain;
    BITRIX_CONFIG.webhook = webhook;
    BITRIX_CONFIG.userId = userId;
    
    localStorage.setItem('bitrix_config', JSON.stringify(BITRIX_CONFIG));
    console.log('Bitrix config saved:', BITRIX_CONFIG);
}

// Проверка конфигурации
function isBitrixConfigured() {
    return !!(BITRIX_CONFIG.domain && BITRIX_CONFIG.webhook);
}

// Заглушка для получения лидов
async function fetchBitrixLeads(startDate, endDate) {
    console.log('Fetching leads from:', startDate, 'to', endDate);
    
    if (!isBitrixConfigured()) {
        console.warn('Bitrix24 не настроен, возвращаем тестовые данные');
        return getMockLeads();
    }
    
    try {
        // Здесь будет реальный API вызов
        console.log('Making API call to Bitrix24...');
        
        // Возвращаем тестовые данные
        return getMockLeads();
        
    } catch (error) {
        console.error('Error fetching leads:', error);
        return getMockLeads();
    }
}

// Заглушка для получения пользователей
async function fetchBitrixUsers() {
    console.log('Fetching users from Bitrix24');
    
    if (!isBitrixConfigured()) {
        console.warn('Bitrix24 не настроен, возвращаем тестовых пользователей');
        return getMockUsers();
    }
    
    try {
        // Здесь будет реальный API вызов
        console.log('Making API call to Bitrix24 for users...');
        
        // Возвращаем тестовых пользователей
        return getMockUsers();
        
    } catch (error) {
        console.error('Error fetching users:', error);
        return getMockUsers();
    }
}

// Тестовые лиды
function getMockLeads() {
    return [
        { ID: 1, TITLE: 'Лид #1', STATUS_ID: 'IN_PROCESS', ASSIGNED_BY_ID: '1', DATE_MODIFY: new Date().toISOString() },
        { ID: 2, TITLE: 'Лид #2', STATUS_ID: 'UC_A2DF81', ASSIGNED_BY_ID: '2', DATE_MODIFY: new Date().toISOString() },
        { ID: 3, TITLE: 'Лид #3', STATUS_ID: 'CONVERTED', ASSIGNED_BY_ID: '1', DATE_MODIFY: new Date().toISOString() },
        { ID: 4, TITLE: 'Лид #4', STATUS_ID: 'IN_PROCESS', ASSIGNED_BY_ID: '3', DATE_MODIFY: new Date().toISOString() },
        { ID: 5, TITLE: 'Лид #5', STATUS_ID: 'UC_A2DF81', ASSIGNED_BY_ID: '2', DATE_MODIFY: new Date().toISOString() }
    ];
}

// Тестовые пользователи
function getMockUsers() {
    return [
        { ID: '1', FULL_NAME: 'Иван Иванов', DEPARTMENT: 'Отдел продаж' },
        { ID: '2', FULL_NAME: 'Петр Петров', DEPARTMENT: 'Отдел маркетинга' },
        { ID: '3', FULL_NAME: 'Мария Сидорова', DEPARTMENT: 'Отдел поддержки' }
    ];
}

// Делаем функции глобально доступными
if (typeof window !== 'undefined') {
    window.loadBitrixConfig = loadBitrixConfig;
    window.setBitrixConfig = setBitrixConfig;
    window.fetchBitrixLeads = fetchBitrixLeads;
    window.fetchBitrixUsers = fetchBitrixUsers;
    console.log('Bitrix API functions registered globally');
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadBitrixConfig,
        setBitrixConfig,
        fetchBitrixLeads,
        fetchBitrixUsers,
        isBitrixConfigured
    };
}
