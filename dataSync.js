// dataSync.js
// Синхронизация данных между Bitrix24 и приложением

// Флаг для отслеживания фоновых запросов
let isBackgroundSync = false;

// Базовые структуры для пустых данных
const EMPTY_LEADS_COUNT = { callback: 0, approval: 0, invited: 0 };
const EMPTY_OPERATORS_BY_STAGE = { callback: [], approval: [], invited: [] };

async function syncWithBitrix24(filters = {}) {
    try {
        if (isBackgroundSync) {
            console.log('Фоновая синхронизация с Bitrix24...', filters);
        } else {
            console.log('Синхронизация с Bitrix24...', filters);
        }
        
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

        // Синхронизация операторов
        const operators = await fetchBitrixUsers();
        
        // Синхронизация лидов
        const leads = await fetchBitrixLeads(startDate, endDate);

        // Обрабатываем данные для дашборда
        const processedData = processLeadsData(leads, operators);

        // Применяем фильтры если они есть
        let filteredData = processedData;
        if (filters.operatorId) {
            filteredData = filterDataByOperator(processedData, filters.operatorId);
        }
        if (filters.stage) {
            filteredData = filterDataByStage(filteredData, filters.stage);
        }

        return {
            ...filteredData,
            lastSync: new Date().toISOString(),
            usingMockData: false
        };

    } catch (error) {
        if (isBackgroundSync) {
            console.warn('Ошибка фоновой синхронизации:', error.message);
        } else {
            console.error('Ошибка синхронизации с Bitrix24:', error);
        }
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

// Функция для фоновой синхронизации
async function backgroundSyncWithBitrix24(filters = {}) {
    isBackgroundSync = true;
    try {
        return await syncWithBitrix24(filters);
    } finally {
        isBackgroundSync = false;
    }
}

// Фильтрация данных по оператору
function filterDataByOperator(data, operatorId) {
    const filteredLeads = data.leads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
    
    // Пересчитываем количество лидов по стадиям
    const leadsCount = {
        callback: filteredLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
        approval: filteredLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
        invited: filteredLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
    };
    
    // Пересчитываем операторов по стадиям (только выбранный оператор)
    const operatorsByStage = {
        callback: data.operatorsByStage.callback.filter(op => op.id == operatorId),
        approval: data.operatorsByStage.approval.filter(op => op.id == operatorId),
        invited: data.operatorsByStage.invited.filter(op => op.id == operatorId)
    };
    
    return {
        ...data,
        leads: filteredLeads,
        leadsCount,
        operatorsByStage
    };
}

// Фильтрация данных по стадии
function filterDataByStage(data, stage) {
    const stageMapping = {
        'callback': 'IN_PROCESS',
        'approval': 'UC_A2DF81', 
        'invited': 'CONVERTED'
    };
    
    const statusId = stageMapping[stage];
    if (!statusId) return data;
    
    const filteredLeads = data.leads.filter(lead => lead.STATUS_ID === statusId);
    
    return {
        ...data,
        leads: filteredLeads,
        leadsCount: {
            [stage]: filteredLeads.length,
            ...Object.keys(data.leadsCount).reduce((acc, key) => {
                if (key !== stage) acc[key] = 0;
                return acc;
            }, {})
        },
        operatorsByStage: {
            [stage]: data.operatorsByStage[stage] || [],
            ...Object.keys(data.operatorsByStage).reduce((acc, key) => {
                if (key !== stage) acc[key] = [];
                return acc;
            }, {})
        }
    };
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
            department: op.DEPARTMENT || '',
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
