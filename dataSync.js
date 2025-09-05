// dataSync.js - Упрощенная версия с заглушками

console.log('DataSync script loaded');

// Базовые структуры для пустых данных
const EMPTY_LEADS_COUNT = { callback: 0, approval: 0, invited: 0 };
const EMPTY_OPERATORS_BY_STAGE = { callback: [], approval: [], invited: [] };

// Заглушка для синхронизации
async function syncWithBitrix24(filters = {}) {
    console.log('Sync function called with filters:', filters);
    
    try {
        // Проверяем, загружены ли необходимые функции из bitrixApi.js
        if (typeof window.fetchBitrixLeads === 'undefined') {
            throw new Error('Функции Bitrix24 API не загружены');
        }
        
        // Получаем текущие даты
        const startDate = window.currentStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 дней назад
        const endDate = window.currentEndDate || new Date();
        
        console.log('Fetching data for period:', startDate, 'to', endDate);
        
        // Получаем данные
        const leads = await window.fetchBitrixLeads(startDate, endDate);
        const operators = await window.fetchBitrixUsers();
        
        // Обрабатываем данные
        const processedData = processLeadsData(leads, operators);
        
        return {
            ...processedData,
            lastSync: new Date().toISOString(),
            usingMockData: false
        };
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        
        // Возвращаем тестовые данные в случае ошибки
        return getMockData();
    }
}

// Функция для получения тестовых данных
function getMockData() {
    console.log('Using mock data');
    
    const mockLeads = [
        { ID: 1, TITLE: 'Тестовый лид 1', STATUS_ID: 'IN_PROCESS', ASSIGNED_BY_ID: '1', DATE_MODIFY: new Date().toISOString() },
        { ID: 2, TITLE: 'Тестовый лид 2', STATUS_ID: 'UC_A2DF81', ASSIGNED_BY_ID: '2', DATE_MODIFY: new Date().toISOString() },
        { ID: 3, TITLE: 'Тестовый лид 3', STATUS_ID: 'CONVERTED', ASSIGNED_BY_ID: '1', DATE_MODIFY: new Date().toISOString() }
    ];
    
    const mockOperators = [
        { ID: '1', FULL_NAME: 'Иван Иванов', DEPARTMENT: 'Отдел продаж' },
        { ID: '2', FULL_NAME: 'Петр Петров', DEPARTMENT: 'Отдел маркетинга' }
    ];
    
    const processedData = processLeadsData(mockLeads, mockOperators);
    
    return {
        ...processedData,
        lastSync: new Date().toISOString(),
        usingMockData: true,
        error: 'Используются тестовые данные'
    };
}

// Обработка данных лидов
function processLeadsData(leads, operators) {
    console.log('Processing leads data:', leads.length, 'leads,', operators.length, 'operators');
    
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
    
    // Создаем маппинг операторов
    const operatorsMap = {};
    operators.forEach(op => {
        operatorsMap[op.ID] = {
            id: op.ID,
            name: op.FULL_NAME || `Оператор #${op.ID}`,
            department: op.DEPARTMENT || '',
            status: 'active',
            lastActivity: 'только что'
        };
    });
    
    // Подсчитываем лиды для каждого оператора
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
        operatorsByStage[stage].sort((a, b) => b.leads - a.leads);
    });
    
    // Генерируем данные для графиков
    const weeklyLeads = generateWeeklyData(leads);
    const dailyLeads = generateDailyData(leads);
    
    return {
        leads,
        operators,
        leadsCount,
        operatorsByStage,
        weeklyLeads,
        dailyLeads
    };
}

// Генерация данных для недельного графика
function generateWeeklyData(leads) {
    const weeklyData = {};
    const today = new Date();
    
    // Создаем данные для последних 7 дней
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateKey = formatDateForBitrix(date);
        
        weeklyData[dateKey] = {
            callback: Math.floor(Math.random() * 10),
            approval: Math.floor(Math.random() * 8),
            invited: Math.floor(Math.random() * 5)
        };
    }
    
    return weeklyData;
}

// Генерация данных для дневного графика
function generateDailyData(leads) {
    const dailyData = {};
    
    // Создаем данные для часов 8:00-20:00
    for (let hour = 8; hour <= 20; hour++) {
        const hourKey = hour.toString().padStart(2, '0');
        dailyData[hourKey] = {
            callback: Math.floor(Math.random() * 5),
            approval: Math.floor(Math.random() * 4),
            invited: Math.floor(Math.random() * 3)
        };
    }
    
    return dailyData;
}

// Маппинг статусов Bitrix24
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
    return Math.floor(Math.random() * 10) - 5;
}

// Форматирование даты
function formatDateForBitrix(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Делаем функцию глобально доступной
if (typeof window !== 'undefined') {
    window.syncWithBitrix24 = syncWithBitrix24;
    console.log('syncWithBitrix24 function registered globally');
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        syncWithBitrix24,
        processLeadsData,
        mapStatusToStage
    };
}
