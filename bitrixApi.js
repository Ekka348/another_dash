// Bitrix24 API configuration and methods

// Проверяем, есть ли доступ к config (браузер vs Node.js)
let STATUS_MAP;
if (typeof window !== 'undefined' && window.STATUS_MAP) {
    // В браузере - используем глобальные переменные
    STATUS_MAP = window.STATUS_MAP;
} else {
    // fallback для тестов или если config не загрузился
    STATUS_MAP = {
        'IN_PROCESS': 'Перезвонить',
        'CONVERTED': 'Приглашен к рекрутеру', 
        'UC_A2DF81': 'На согласовании'
    };
}

const BITRIX_CONFIG = {
    domain: '',
    webhook: '',
    userId: ''
};

// Настройка конфигурации Bitrix24
function setBitrixConfig(domain, webhook, userId) {
    if (!domain || !webhook) {
        throw new Error('Домен и webhook обязательны для настройки');
    }
    
    BITRIX_CONFIG.domain = domain.replace(/https?:\/\//, '').replace(/\/$/, '');
    BITRIX_CONFIG.webhook = webhook.trim();
    BITRIX_CONFIG.userId = userId ? userId.toString() : '';
    
    localStorage.setItem('bitrix_config', JSON.stringify(BITRIX_CONFIG));
    window.bitrixConfigured = true;
    console.log('Bitrix24 config saved:', BITRIX_CONFIG);
}

// Загрузка конфигурации из localStorage
function loadBitrixConfig() {
    try {
        const saved = localStorage.getItem('bitrix_config');
        if (saved) {
            const config = JSON.parse(saved);
            Object.assign(BITRIX_CONFIG, config);
            window.bitrixConfigured = true;
            console.log('Bitrix24 config loaded:', BITRIX_CONFIG);
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
    return !!(BITRIX_CONFIG.domain && BITRIX_CONFIG.webhook);
}

// Выполнение запроса к Bitrix24 API
async function bitrixApiCall(method, params = {}) {
    if (!isBitrixConfigured()) {
        throw new Error('Bitrix24 не настроен. Укажите домен и webhook.');
    }

    const url = `https://${BITRIX_CONFIG.domain}/rest/${BITRIX_CONFIG.userId}/${BITRIX_CONFIG.webhook}/${method}.json`;
    
    try {
        console.log('Bitrix API call:', method, params);
        
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
            const errorMessage = data.error_description || data.error || 'Bitrix24 API error';
            throw new Error(`Bitrix24: ${errorMessage}`);
        }

        return data.result;
    } catch (error) {
        console.error('Bitrix API call failed:', error);
        throw new Error(`Ошибка подключения к Bitrix24: ${error.message}`);
    }
}

// Получение лидов из Bitrix24 с фильтрацией по статусам (С ПАГИНАЦИЕЙ)
async function fetchBitrixLeads(startDate, endDate) {
    try {
        if (!startDate || !endDate) {
            throw new Error('Не указаны даты для фильтрации лидов');
        }

        const startDateStr = formatDateForBitrix(startDate);
        const endDateStr = formatDateForBitrix(endDate);

        console.log('Fetching leads for period:', startDateStr, '-', endDateStr);
        
        let allLeads = [];
        let start = 0;
        const batchSize = 50;
        let hasMore = true;
        let totalLoaded = 0;

        // Пагинация - получаем данные порциями
        while (hasMore) {
            const leads = await bitrixApiCall('crm.lead.list', {
                select: ['ID', 'TITLE', 'STATUS_ID', 'ASSIGNED_BY_ID', 'DATE_MODIFY', 'DATE_CREATE'],
                filter: {
                    'STATUS_ID': Object.keys(STATUS_MAP),
                    '>=DATE_CREATE': `${startDateStr} 00:00:00`,
                    '<=DATE_CREATE': `${endDateStr} 23:59:59`
                },
                order: { "DATE_CREATE": "ASC" },
                start: start
            });

            if (!leads || leads.length === 0) {
                hasMore = false;
                break;
            }

            allLeads = allLeads.concat(leads);
            totalLoaded += leads.length;
            
            console.log(`Loaded batch of ${leads.length} leads, total: ${totalLoaded}`);

            // Проверяем есть ли еще данные
            if (leads.length < batchSize) {
                hasMore = false;
            } else {
                start += batchSize;
                // Небольшая задержка чтобы не превысить лимиты API
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        console.log(`Total loaded ${allLeads.length} leads from Bitrix24`);
        
        return allLeads.map(lead => ({
            ID: lead.ID,
            TITLE: lead.TITLE || `Лид #${lead.ID}`,
            STATUS_ID: lead.STATUS_ID,
            ASSIGNED_BY_ID: lead.ASSIGNED_BY_ID,
            DATE_MODIFY: lead.DATE_MODIFY,
            DATE_CREATE: lead.DATE_CREATE
        }));
    } catch (error) {
        console.error('Error fetching leads from Bitrix24:', error);
        throw error;
    }
}

// Получение лидов по дням недели (группировка по DATE_MODIFY)
async function fetchBitrixLeadsByDay(startDate, endDate) {
    try {
        const leads = await fetchBitrixLeads(startDate, endDate);
        
        // Группируем лиды по дням изменения (DATE_MODIFY) и статусам
        const leadsByDay = {};
        const currentWeekDays = getCurrentWeekDays();
        
        // Инициализируем структуру данных
        currentWeekDays.forEach(day => {
            leadsByDay[day] = {
                callback: 0,
                approval: 0,
                invited: 0
            };
        });
        
        // Заполняем данными по дате изменения
        leads.forEach(lead => {
            if (!lead.DATE_MODIFY) return;
            
            const modifyDate = new Date(lead.DATE_MODIFY);
            const dayKey = formatDateForBitrix(modifyDate);
            
            if (leadsByDay[dayKey]) {
                const status = mapStatusToStage(lead.STATUS_ID);
                leadsByDay[dayKey][status]++;
            }
        });
        
        return leadsByDay;
    } catch (error) {
        console.error('Error fetching leads by day:', error);
        throw error;
    }
}

// Получение пользователей (операторов) из Bitrix24 (С ПАГИНАЦИЕЙ)
async function fetchBitrixUsers() {
    try {
        let allUsers = [];
        let start = 0;
        const batchSize = 50;
        let hasMore = true;
        let totalLoaded = 0;

        // Пагинация для пользователей
        while (hasMore) {
            const users = await bitrixApiCall('user.get', {
                filter: {
                    'ACTIVE': true,
                    '!ID': '1'
                },
                select: ['ID', 'NAME', 'LAST_NAME', 'WORK_DEPARTMENT', 'IS_ONLINE', 'LAST_ACTIVITY_DATE', 'EMAIL'],
                start: start
            });

            if (!users || users.length === 0) {
                hasMore = false;
                break;
            }

            allUsers = allUsers.concat(users);
            totalLoaded += users.length;
            
            console.log(`Loaded batch of ${users.length} users, total: ${totalLoaded}`);

            if (users.length < batchSize) {
                hasMore = false;
            } else {
                start += batchSize;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        console.log(`Total loaded ${allUsers.length} users from Bitrix24`);
        
        return allUsers.map(user => ({
            ID: user.ID,
            NAME: user.NAME || '',
            LAST_NAME: user.LAST_NAME || '',
            FULL_NAME: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim() || `User #${user.ID}`,
            DEPARTMENT: user.WORK_DEPARTMENT || 'Не указан',
            IS_ONLINE: user.IS_ONLINE === 'Y',
            LAST_ACTIVITY_DATE: user.LAST_ACTIVITY_DATE,
            EMAIL: user.EMAIL || ''
        }));
    } catch (error) {
        console.error('Error fetching users from Bitrix24:', error);
        throw error;
    }
}

// Получение дней текущей недели
function getCurrentWeekDays() {
    const days = [];
    const today = new Date();
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник
    
    for (let i = 0; i < 7; i++) {
        const day = new Date(firstDayOfWeek);
        day.setDate(firstDayOfWeek.getDate() + i);
        days.push(formatDateForBitrix(day));
    }
    
    return days;
}

// Маппинг статусов Bitrix24 на внутренние стадии
function mapStatusToStage(statusId) {
    const mapping = {
        'IN_PROCESS': 'callback',
        'UC_A2DF81': 'approval',
        'CONVERTED': 'invited'
    };
    return mapping[statusId] || 'callback';
}

// Вспомогательные функции для форматирования дат
function formatDateForBitrix(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForInput(date) {
    return formatDateForBitrix(date);
}

function formatDateTimeDisplay(date) {
    if (!date) return 'Неизвестно';
    
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'Неизвестно';
        
        return dateObj.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Неизвестно';
    }
}

// Экспорт функций для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setBitrixConfig,
        loadBitrixConfig,
        isBitrixConfigured,
        bitrixApiCall,
        fetchBitrixLeads,
        fetchBitrixLeadsByDay,
        fetchBitrixUsers,
        formatDateForBitrix,
        formatDateForInput,
        formatDateTimeDisplay
    };
}
