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
                lastSync: null
            };
        }

        // Получаем текущие даты
        const currentStartDate = window.currentStartDate || new Date();
        const currentEndDate = window.currentEndDate || new Date();

        // Синхронизация операторов
        const operators = await fetchBitrixUsers();
        
        // Синхронизация лидов
        const leads = await fetchBitrixLeads(currentStartDate, currentEndDate);

        // Обрабатываем данные для дашборда
        const processedData = processLeadsData(leads, operators);

        return {
            ...processedData,
            lastSync: new Date().toISOString()
        };

    } catch (error) {
        console.error('Ошибка синхронизации с Bitrix24:', error);
        throw error;
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
            lastActivity: formatRelativeTime(op.LAST_ACTIVITY_DATE)
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
                    trend: Math.floor(Math.random() * 10) - 5 // Временная формула
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

// Форматирование относительного времени
function formatRelativeTime(dateString) {
    if (!dateString) return 'Неизвестно';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} час назад`;
    return `${Math.floor(diffMins / 1440)} дн назад`;
}
