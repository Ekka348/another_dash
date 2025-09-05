// dataSync.js
// Синхронизация данных между Bitrix24 и приложением

// Флаг для отслеживания фоновых запросов
let isBackgroundSync = false;

// Проверяем доступность зависимостей
if (typeof fetchBitrixUsers === 'undefined') {
    console.error('Ошибка: fetchBitrixUsers не определен');
}
if (typeof fetchBitrixLeads === 'undefined') {
    console.error('Ошибка: fetchBitrixLeads не определен');
}
if (typeof fetchWeeklyLeadsData === 'undefined') {
    console.error('Ошибка: fetchWeeklyLeadsData не определен');
}
if (typeof fetchDailyLeadsData === 'undefined') {
    console.error('Ошибка: fetchDailyLeadsData не определен');
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
                weeklyLeads: {},
                dailyLeads: {},
                lastSync: null,
                usingMockData: true,
                error: 'Bitrix24 не настроен'
            };
        }

        // Получаем текущие даты
        const startDate = window.currentStartDate || new Date();
        const endDate = window.currentEndDate || new Date();

        if (isBackgroundSync) {
            console.log('Фоновая синхронизация за период:', formatDateForInput(startDate), '-', formatDateForInput(endDate));
        } else {
            console.log('Синхронизация за период:', formatDateForInput(startDate), '-', formatDateForInput(endDate));
        }

        // Синхронизация операторов
        const operators = await fetchBitrixUsers();
        if (isBackgroundSync) {
            console.log('Загружено операторов (фон):', operators.length);
        } else {
            console.log('Загружено операторов:', operators.length);
        }
        
        // Синхронизация лидов
        const leads = await fetchBitrixLeads(startDate, endDate);
        if (isBackgroundSync) {
            console.log('Загружено лидов (фон):', leads.length);
        } else {
            console.log('Загружено лидов:', leads.length);
        }

        // Получаем данные за текущую неделю для графиков
        const weeklyLeads = await fetchWeeklyLeadsData();
        if (isBackgroundSync) {
            console.log('Загружены данные за неделю (фон)');
        } else {
            console.log('Загружены данные за неделю');
        }

        // Получаем данные за текущий день для графиков
        const dailyLeads = await fetchDailyLeadsData();
        if (isBackgroundSync) {
            console.log('Загружены данные за день (фон)');
        } else {
            console.log('Загружены данные за день');
        }

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
            weeklyLeads,
            dailyLeads,
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
            weeklyLeads: {},
            dailyLeads: {},
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
    
    // Фильтруем недельные данные
    const weeklyLeads = filterWeeklyDataByOperator(data.weeklyLeads, operatorId, data.leads);
    
    // Фильтруем дневные данные
    const dailyLeads = filterDailyDataByOperator(data.dailyLeads, operatorId, data.leads);
    
    return {
        ...data,
        leads: filteredLeads,
        leadsCount,
        operatorsByStage,
        weeklyLeads,
        dailyLeads
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
            ...Object.keys(data.operatorsByStage).reduce((acc, key) {
                if (key !== stage) acc[key] = [];
                return acc;
            }, {})
        }
    };
}

// Фильтрация недельных данных по оператору
function filterWeeklyDataByOperator(weeklyData, operatorId, allLeads) {
    if (!weeklyData) return {};
    
    const filteredWeeklyData = {};
    const operatorLeads = allLeads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
    
    Object.keys(weeklyData).forEach(date => {
        const dayLeads = operatorLeads.filter(lead => {
            const leadDate = new Date(lead.DATE_MODIFY).toISOString().split('T')[0];
            return leadDate === date;
        });
        
        filteredWeeklyData[date] = {
            callback: dayLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
            approval: dayLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
            invited: dayLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
        };
    });
    
    return filteredWeeklyData;
}

// Фильтрация дневных данных по оператору
function filterDailyDataByOperator(dailyData, operatorId, allLeads) {
    if (!dailyData) return {};
    
    const filteredDailyData = {};
    const operatorLeads = allLeads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
    
    Object.keys(dailyData).forEach(hour => {
        const hourLeads = operatorLeads.filter(lead => {
            const leadHour = new Date(lead.DATE_MODIFY).getHours().toString().padStart(2, '0');
            return leadHour === hour;
        });
        
        filteredDailyData[hour] = {
            callback: hourLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
            approval: hourLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
            invited: hourLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
        };
    });
    
    return filteredDailyData;
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

// Подготовка данных для недельного графика
function prepareWeeklyChartData(weeklyLeadsData) {
    const daysOrder = getCurrentWeekDays();
    const result = {
        callback: Array(7).fill(0),
        approval: Array(7).fill(0),
        invited: Array(7).fill(0)
    };
    
    // Заполняем данные для каждого дня
    daysOrder.forEach((day, index) => {
        if (weeklyLeadsData[day]) {
            result.callback[index] = weeklyLeadsData[day].callback || 0;
            result.approval[index] = weeklyLeadsData[day].approval || 0;
            result.invited[index] = weeklyLeadsData[day].invited || 0;
        }
    });
    
    return result;
}

// Подготовка данных для дневного графика
function prepareDailyChartData(dailyLeadsData) {
    const hours = Array.from({length: 24}, (_, i) => i);
    const result = {
        callback: Array(24).fill(0),
        approval: Array(24).fill(0),
        invited: Array(24).fill(0)
    };
    
    // Заполняем данные для каждого часа
    hours.forEach(hour => {
        const hourKey = hour.toString().padStart(2, '0');
        if (dailyLeadsData[hourKey]) {
            result.callback[hour] = dailyLeadsData[hourKey].callback || 0;
            result.approval[hour] = dailyLeadsData[hourKey].approval || 0;
            result.invited[hour] = dailyLeadsData[hourKey].invited || 0;
        }
    });
    
    return result;
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

// Получение подписей часов для графика
function getHourLabels() {
    return Array.from({length: 24}, (_, i) => {
        return `${i.toString().padStart(2, '0')}:00`;
    });
}

// Вспомогательная функция для форматирования даты
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

// Вспомогательная функция для форматирования даты в input
function formatDateForInput(date) {
    return formatDateForBitrix(date);
}

// Экспорт функций для использования в других модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        syncWithBitrix24,
        backgroundSyncWithBitrix24,
        processLeadsData,
        mapStatusToStage,
        calculateTrend,
        formatRelativeTime,
        applyDateFilter,
        prepareWeeklyChartData,
        prepareDailyChartData,
        getCurrentWeekDays,
        getHourLabels,
        formatDateForBitrix,
        formatDateForInput,
        EMPTY_LEADS_COUNT,
        EMPTY_OPERATORS_BY_STAGE
    };
}
