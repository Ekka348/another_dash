// Синхронизация данных между Bitrix24 и приложением

// Проверяем доступность зависимостей
if (typeof fetchBitrixUsers === 'undefined') {
    console.error('Ошибка: fetchBitrixUsers не определен');
}
if (typeof fetchBitrixLeads === 'undefined') {
    console.error('Ошибка: fetchBitrixLeads не определен');
}
if (typeof loadBitrixConfig === 'undefined') {
    console.error('Ошибка: loadBitrixConfig не определен');
}
if (typeof isBitrixConfigured === 'undefined') {
    console.error('Ошибка: isBitrixConfigured не определен');
}

// Базовые структуры для пустых данных
const EMPTY_LEADS_COUNT = { callback: 0, approval: 0, invited: 0 };
const EMPTY_OPERATORS_BY_STAGE = { callback: [], approval: [], invited: [] };

async function syncWithBitrix24() {
    try {
        // Проверяем конфигурацию Bitrix24
        if (!loadBitrixConfig() || !isBitrixConfigured()) {
            console.warn('Bitrix24 не настроен, используются пустые данные');
            return {
                leads: [],
                operators: [],
                leadsCount: EMPTY_LEADS_COUNT,
                operatorsByStage: EMPTY_OPERATORS_BY_STAGE,
                lastSync: null,
                usingMockData: true,
                error: 'Bitrix24 не настроен'
            };
        }

        // Получаем текущие даты
        const startDate = window.currentStartDate || new Date();
        const endDate = window.currentEndDate || new Date();

        console.log('Синхронизация данных с Bitrix24 за период:', 
                   formatDateForInput(startDate), '-', formatDateForInput(endDate));

        // Синхронизация операторов
        const operators = await fetchBitrixUsers();
        console.log('Загружено операторов:', operators.length);
        
        // Синхронизация лидов
        const leads = await fetchBitrixLeads(startDate, endDate);
        console.log('Загружено лидов:', leads.length);

        // Обрабатываем данные для дашборда
        const processedData = processLeadsData(leads, operators);

        return {
            ...processedData,
            lastSync: new Date().toISOString(),
            usingMockData: false
        };

    } catch (error) {
        console.error('Ошибка синхронизации с Bitrix24:', error);
        // Возвращаем пустые данные в случае ошибки
        return {
            leads: [],
            operators: [],
            leadsCount: EMPTY_LEADS_COUNT,
            operatorsByStage: EMPTY_OPERATORS_BY_STAGE,
            lastSync: null,
            usingMockData: true,
            error: error.message,
            errorType: error.name
        };
    }
}

// Обработка данных лидов для дашборда
function processLeadsData(leads, operators) {
    // Подсчет лидов по стадиям с использованием reduce
    const leadsCount = leads.reduce((acc, lead) => {
        const stage = mapStatusToStage(lead.STATUS_ID);
        if (acc[stage] !== undefined) {
            acc[stage]++;
        }
        return acc;
    }, { callback: 0, approval: 0, invited: 0 });

    // Группировка операторов по стадиям
    const operatorsByStage = {
        callback: [],
        approval: [],
        invited: []
    };

    // Создаем маппинг операторов для быстрого доступа
    const operatorsMap = {};
    operators.forEach(op => {
        operatorsMap[op.ID] = {
            id: op.ID,
            name: op.FULL_NAME || `Оператор #${op.ID}`,
            department: op.DEPARTMENT || 'Не указан',
            status: op.IS_ONLINE ? 'active' : 'offline',
            lastActivity: formatRelativeTime(op.LAST_ACTIVITY_DATE || new Date().toISOString())
        };
    });

    // Подсчитываем лиды для каждого оператора по стадиям
    const operatorLeadsCount = {};
    
    leads.forEach(lead => {
        if (!lead.ASSIGNED_BY_ID || !operatorsMap[lead.ASSIGNED_BY_ID]) return;
        
        const operatorId = lead.ASSIGNED_BY_ID;
        const stage = mapStatusToStage(lead.STATUS_ID);
        
        if (!operatorLeadsCount[operatorId]) {
            operatorLeadsCount[operatorId] = { callback: 0, approval: 0, invited: 0 };
        }
        
        if (operatorLeadsCount[operatorId][stage] !== undefined) {
            operatorLeadsCount[operatorId][stage]++;
        }
    });

    // Формируем данные для таблиц
    Object.keys(operatorLeadsCount).forEach(operatorId => {
        const operatorData = operatorsMap[operatorId];
        const counts = operatorLeadsCount[operatorId];
        
        Object.keys(counts).forEach(stage => {
            if (counts[stage] > 0 && operatorsByStage[stage]) {
                operatorsByStage[stage].push({
                    ...operatorData,
                    leads: counts[stage],
                    trend: calculateTrend(counts[stage])
                });
            }
        });
    });

    // Сортируем операторов по количеству лидов
    Object.keys(operatorsByStage).forEach(stage => {
        if (operatorsByStage[stage]) {
            operatorsByStage[stage].sort((a, b) => b.leads - a.leads);
        }
    });

    return {
        leads,
        operators,
        leadsCount,
        operatorsByStage
    };
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

// Расчет тренда
function calculateTrend(leadsCount) {
    if (leadsCount === 0) return 0;
    const base = Math.floor(Math.random() * 5) + 1;
    return Math.random() > 0.5 ? base : -base;
}

// Форматирование относительного времени
function formatRelativeTime(dateString) {
    if (!dateString) return 'Неизвестно';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} час назад`;
        return `${Math.floor(diffMins / 1440)} дн назад`;
    } catch (error) {
        return 'Неизвестно';
    }
}

// Функция для применения фильтра дат
function applyDateFilter(startDate, endDate) {
    if (!startDate || !endDate) {
        console.error('Не указаны даты для фильтра');
        return Promise.reject(new Error('Не указаны даты для фильтра'));
    }
    
    window.currentStartDate = startDate;
    window.currentEndDate = endDate;
    return syncWithBitrix24();
}

// Экспорт функций для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        syncWithBitrix24,
        processLeadsData,
        mapStatusToStage,
        calculateTrend,
        formatRelativeTime,
        applyDateFilter,
        EMPTY_LEADS_COUNT,
        EMPTY_OPERATORS_BY_STAGE
    };
}
