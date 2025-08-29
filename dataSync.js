// Синхронизация данных между Bitrix24 и приложением
async function syncWithBitrix24() {
    try {
        // Проверяем конфигурацию Bitrix24
        if (!loadBitrixConfig() || !isBitrixConfigured()) {
            console.warn('Bitrix24 не настроен, используются моковые данные');
            return {
                leads: [],
                operators: [],
                leadsCount: mockLeadsData,
                operatorsByStage: mockOperatorsData,
                lastSync: null,
                usingMockData: true
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
        // Возвращаем моковые данные в случае ошибки
        return {
            leads: [],
            operators: [],
            leadsCount: mockLeadsData,
            operatorsByStage: mockOperatorsData,
            lastSync: null,
            usingMockData: true,
            error: error.message
        };
    }
}

// Обработка данных лидов для дашборда
function processLeadsData(leads, operators) {
    // Подсчет лидов по стадиям
    const leadsCount = {
        callback: leads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
        approval: leads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
        invited: leads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
    };

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
            name: op.FULL_NAME,
            department: op.DEPARTMENT,
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
        
        operatorLeadsCount[operatorId][stage]++;
    });

    // Формируем данные для таблиц
    Object.keys(operatorLeadsCount).forEach(operatorId => {
        const operatorData = operatorsMap[operatorId];
        const counts = operatorLeadsCount[operatorId];
        
        Object.keys(counts).forEach(stage => {
            if (counts[stage] > 0) {
                operatorsByStage[stage].push({
                    ...operatorData,
                    leads: counts[stage],
                    trend: calculateTrend(counts[stage]) // Генерируем тренд
                });
            }
        });
    });

    // Сортируем операторов по количеству лидов
    Object.keys(operatorsByStage).forEach(stage => {
        operatorsByStage[stage].sort((a, b) => b.leads - a.leads);
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

// Расчет тренда (для демонстрации)
function calculateTrend(leadsCount) {
    // Простая логика для демонстрации
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
    window.currentStartDate = startDate;
    window.currentEndDate = endDate;
    return syncWithBitrix24();
}
