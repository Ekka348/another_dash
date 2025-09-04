// dataSync.js - дополнительные функции
// Добавьте эти функции в существующий файл

// Фильтрация данных по оператору
function filterDataByOperator(data, operatorId) {
    if (!data || !operatorId) return data;
    
    const filteredLeads = data.leads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
    
    const leadsCount = {
        callback: filteredLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
        approval: filteredLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
        invited: filteredLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
    };
    
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

// Фильтрация по дате
function filterDataByDateRange(data, startDate, endDate) {
    if (!data || !startDate || !endDate) return data;
    
    const filteredLeads = data.leads.filter(lead => {
        const leadDate = new Date(lead.DATE_MODIFY);
        return leadDate >= startDate && leadDate <= endDate;
    });
    
    const leadsCount = {
        callback: filteredLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
        approval: filteredLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
        invited: filteredLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
    };
    
    return {
        ...data,
        leads: filteredLeads,
        leadsCount
    };
}

// Получение данных для разных временных периодов
async function getDataForTimeRange(rangeType, operatorId = null) {
    const today = new Date();
    let startDate, endDate;

    switch (rangeType) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay() + 1);
            endDate = new Date(today);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        default:
            startDate = new Date(today);
            endDate = new Date(today);
    }

    window.currentStartDate = startDate;
    window.currentEndDate = endDate;

    const data = await syncWithBitrix24();
    
    if (operatorId) {
        return filterDataByOperator(data, operatorId);
    }
    
    return data;
}

// Экспорт новых функций
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // ... существующий экспорт
        filterDataByOperator,
        filterDataByDateRange,
        getDataForTimeRange
    };
}
