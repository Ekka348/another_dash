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
        if (typeof loadBitrixConfig !== 'function') {
            console.error('Функция loadBitrixConfig не найдена');
            return getEmptyResponse('Функция loadBitrixConfig не найдена');
        }
        
        const config = loadBitrixConfig();
        if (!config || !config.domain || !config.webhookUrl) {
            console.error('Конфигурация Bitrix24 не настроена');
            return getEmptyResponse('Конфигурация Bitrix24 не настроена');
        }
        
        // Получаем данные из Bitrix24
        const bitrixData = await fetchBitrixData(config, filters);
        
        if (bitrixData.error) {
            console.error('Ошибка получения данных из Bitrix24:', bitrixData.error);
            return getEmptyResponse(bitrixData.error);
        }
        
        // Обрабатываем данные
        const processedData = processBitrixData(bitrixData, filters);
        
        // Сохраняем в IndexedDB
        try {
            await saveToDatabase(processedData);
            console.log('Данные успешно сохранены в базу');
        } catch (dbError) {
            console.error('Ошибка сохранения в базу:', dbError);
            // Продолжаем работу, но возвращаем ошибку
            processedData.error = `Ошибка базы данных: ${dbError.message}`;
        }
        
        // Обновляем время последней синхронизации
        processedData.lastSync = new Date().toISOString();
        
        return processedData;
        
    } catch (error) {
        console.error('Критическая ошибка синхронизации:', error);
        return getEmptyResponse(`Критическая ошибка: ${error.message}`);
    }
}

async function fetchBitrixData(config, filters) {
    try {
        // Получаем лиды
        const leads = await fetchLeadsFromBitrix(config, filters);
        if (leads.error) {
            return { error: leads.error };
        }
        
        // Получаем операторов
        const operators = await fetchOperatorsFromBitrix(config);
        if (operators.error) {
            console.warn('Ошибка получения операторов:', operators.error);
            // Продолжаем работу без операторов
        }
        
        return {
            leads: leads.data || [],
            operators: operators.data || [],
            error: null
        };
        
    } catch (error) {
        console.error('Ошибка получения данных из Bitrix24:', error);
        return { error: error.message };
    }
}

async function fetchLeadsFromBitrix(config, filters) {
    try {
        const { operatorId, stage } = filters;
        
        // Формируем фильтр для запроса
        let filter = {};
        
        // Фильтр по дате (если установлены глобальные даты)
        if (window.currentStartDate && window.currentEndDate) {
            filter['>=DATE_MODIFY'] = formatDateForBitrix(window.currentStartDate);
            filter['<=DATE_MODIFY'] = formatDateForBitrix(window.currentEndDate);
        } else {
            // По умолчанию - последние 30 дней
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            filter['>=DATE_MODIFY'] = formatDateForBitrix(thirtyDaysAgo);
            filter['<=DATE_MODIFY'] = formatDateForBitrix(new Date());
        }
        
        // Фильтр по оператору
        if (operatorId) {
            filter['ASSIGNED_BY_ID'] = operatorId;
        }
        
        // Фильтр по стадии
        if (stage) {
            const stageMapping = {
                'callback': 'IN_PROCESS',
                'approval': 'UC_A2DF81',
                'invited': 'CONVERTED'
            };
            filter['STATUS_ID'] = stageMapping[stage];
        }
        
        console.log('Фильтр для запроса лидов:', filter);
        
        // Формируем URL для запроса
        const url = `${config.webhookUrl}/crm.lead.list`;
        const params = {
            filter: filter,
            select: ['ID', 'TITLE', 'STATUS_ID', 'ASSIGNED_BY_ID', 'DATE_CREATE', 'DATE_MODIFY', 'OPPORTUNITY'],
            order: { DATE_MODIFY: 'DESC' },
            start: 0
        };
        
        let allLeads = [];
        let hasMore = true;
        let currentStart = 0;
        const batchSize = 50;
        
        // Получаем данные пачками
        while (hasMore) {
            params.start = currentStart;
            
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
                throw new Error(data.error_description || data.error);
            }
            
            if (data.result && data.result.length > 0) {
                allLeads = allLeads.concat(data.result);
                currentStart += batchSize;
                
                // Ограничиваем количество запросов для фоновой синхронизации
                if (isBackgroundSync && currentStart >= 200) {
                    console.log('Фоновая синхронизация: ограничение 200 записей');
                    hasMore = false;
                } else {
                    hasMore = data.result.length === batchSize;
                }
            } else {
                hasMore = false;
            }
        }
        
        console.log(`Получено ${allLeads.length} лидов из Bitrix24`);
        return { data: allLeads, error: null };
        
    } catch (error) {
        console.error('Ошибка получения лидов:', error);
        return { error: error.message };
    }
}

async function fetchOperatorsFromBitrix(config) {
    try {
        const url = `${config.webhookUrl}/user.get`;
        const params = {
            filter: { 'ACTIVE': true },
            select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL', 'UF_DEPARTMENT'],
            order: { 'LAST_NAME': 'ASC' }
        };
        
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
            throw new Error(data.error_description || data.error);
        }
        
        // Обрабатываем данные операторов
        const operators = (data.result || []).map(operator => ({
            ID: operator.ID,
            FULL_NAME: `${operator.LAST_NAME || ''} ${operator.NAME || ''} ${operator.SECOND_NAME || ''}`.trim(),
            EMAIL: operator.EMAIL || '',
            DEPARTMENT: operator.UF_DEPARTMENT ? await getDepartmentName(config, operator.UF_DEPARTMENT) : ''
        }));
        
        console.log(`Получено ${operators.length} операторов из Bitrix24`);
        return { data: operators, error: null };
        
    } catch (error) {
        console.error('Ошибка получения операторов:', error);
        return { error: error.message };
    }
}

async function getDepartmentName(config, departmentId) {
    try {
        if (!departmentId) return '';
        
        const url = `${config.webhookUrl}/department.get`;
        const params = { ID: departmentId };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            return '';
        }
        
        const data = await response.json();
        
        if (data.error || !data.result) {
            return '';
        }
        
        return data.result.NAME || '';
        
    } catch (error) {
        console.warn('Ошибка получения названия отдела:', error);
        return '';
    }
}

function processBitrixData(bitrixData, filters) {
    const { leads, operators } = bitrixData;
    
    try {
        // Подсчитываем лиды по стадиям
        const leadsCount = countLeadsByStage(leads);
        
        // Группируем операторов по стадиям
        const operatorsByStage = groupOperatorsByStage(leads, operators);
        
        // Анализируем данные по дням недели
        const weeklyLeads = analyzeWeeklyData(leads);
        
        // Анализируем данные по часам дня
        const dailyLeads = analyzeDailyData(leads);
        
        return {
            leads,
            leadsCount,
            operators,
            operatorsByStage,
            weeklyLeads,
            dailyLeads,
            error: null
        };
        
    } catch (error) {
        console.error('Ошибка обработки данных:', error);
        return {
            leads: [],
            leadsCount: EMPTY_LEADS_COUNT,
            operators: [],
            operatorsByStage: EMPTY_OPERATORS_BY_STAGE,
            weeklyLeads: {},
            dailyLeads: {},
            error: `Ошибка обработки: ${error.message}`
        };
    }
}

function countLeadsByStage(leads) {
    const counts = { callback: 0, approval: 0, invited: 0 };
    
    leads.forEach(lead => {
        switch (lead.STATUS_ID) {
            case 'IN_PROCESS':
                counts.callback++;
                break;
            case 'UC_A2DF81':
                counts.approval++;
                break;
            case 'CONVERTED':
                counts.invited++;
                break;
        }
    });
    
    return counts;
}

function groupOperatorsByStage(leads, operators) {
    const result = {
        callback: [],
        approval: [],
        invited: []
    };
    
    // Создаем мапу операторов для быстрого доступа
    const operatorMap = {};
    operators.forEach(op => {
        operatorMap[op.ID] = {
            id: op.ID,
            name: op.FULL_NAME,
            count: 0
        };
    });
    
    // Считаем лиды по операторам и стадиям
    const operatorCounts = {
        callback: {},
        approval: {},
        invited: {}
    };
    
    leads.forEach(lead => {
        const operatorId = lead.ASSIGNED_BY_ID;
        if (!operatorId) return;
        
        let stage;
        switch (lead.STATUS_ID) {
            case 'IN_PROCESS':
                stage = 'callback';
                break;
            case 'UC_A2DF81':
                stage = 'approval';
                break;
            case 'CONVERTED':
                stage = 'invited';
                break;
            default:
                return;
        }
        
        if (!operatorCounts[stage][operatorId]) {
            operatorCounts[stage][operatorId] = 0;
        }
        operatorCounts[stage][operatorId]++;
    });
    
    // Формируем результат
    Object.keys(operatorCounts).forEach(stage => {
        Object.keys(operatorCounts[stage]).forEach(operatorId => {
            const operator = operatorMap[operatorId];
            if (operator) {
                result[stage].push({
                    id: operatorId,
                    name: operator.name,
                    count: operatorCounts[stage][operatorId]
                });
            }
        });
        
        // Сортируем по количеству лидов (по убыванию)
        result[stage].sort((a, b) => b.count - a.count);
    });
    
    return result;
}

function analyzeWeeklyData(leads) {
    const weeklyData = {};
    const today = new Date();
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    // Инициализируем данные для каждой даты недели
    for (let i = 0; i < 7; i++) {
        const date = new Date(firstDayOfWeek);
        date.setDate(firstDayOfWeek.getDate() + i);
        const dateKey = formatDateForBitrix(date);
        weeklyData[dateKey] = { callback: 0, approval: 0, invited: 0 };
    }
    
    // Заполняем данные
    leads.forEach(lead => {
        const leadDate = new Date(lead.DATE_MODIFY);
        const dateKey = formatDateForBitrix(leadDate);
        
        if (weeklyData[dateKey]) {
            switch (lead.STATUS_ID) {
                case 'IN_PROCESS':
                    weeklyData[dateKey].callback++;
                    break;
                case 'UC_A2DF81':
                    weeklyData[dateKey].approval++;
                    break;
                case 'CONVERTED':
                    weeklyData[dateKey].invited++;
                    break;
            }
        }
    });
    
    return weeklyData;
}

function analyzeDailyData(leads) {
    const dailyData = {};
    
    // Инициализируем данные для каждого часа (8:00-20:00)
    for (let hour = 8; hour <= 20; hour++) {
        const hourKey = hour.toString().padStart(2, '0');
        dailyData[hourKey] = { callback: 0, approval: 0, invited: 0 };
    }
    
    // Заполняем данные
    leads.forEach(lead => {
        const leadDate = new Date(lead.DATE_MODIFY);
        const hour = leadDate.getHours();
        
        if (hour >= 8 && hour <= 20) {
            const hourKey = hour.toString().padStart(2, '0');
            
            if (dailyData[hourKey]) {
                switch (lead.STATUS_ID) {
                    case 'IN_PROCESS':
                        dailyData[hourKey].callback++;
                        break;
                    case 'UC_A2DF81':
                        dailyData[hourKey].approval++;
                        break;
                    case 'CONVERTED':
                        dailyData[hourKey].invited++;
                        break;
                }
            }
        }
    });
    
    return dailyData;
}

function formatDateForBitrix(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getEmptyResponse(error = null) {
    return {
        leads: [],
        leadsCount: EMPTY_LEADS_COUNT,
        operators: [],
        operatorsByStage: EMPTY_OPERATORS_BY_STAGE,
        weeklyLeads: {},
        dailyLeads: {},
        lastSync: new Date().toISOString(),
        error: error
    };
}

// Функция для фоновой синхронизации
async function backgroundSync() {
    try {
        isBackgroundSync = true;
        await syncWithBitrix24();
    } catch (error) {
        console.error('Ошибка фоновой синхронизации:', error);
    } finally {
        isBackgroundSync = false;
    }
}

// Экспортируем функции для использования в других файлах
if (typeof window !== 'undefined') {
    window.syncWithBitrix24 = syncWithBitrix24;
    window.backgroundSync = backgroundSync;
}
