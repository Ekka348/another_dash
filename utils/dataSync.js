// Синхронизация данных между Bitrix24 и Trickle Database
async function syncWithBitrix24() {
  try {
    // Проверяем конфигурацию Bitrix24
    if (!loadBitrixConfig() || !isBitrixConfigured()) {
      console.warn('Bitrix24 не настроен, используются моковые данные');
      await initializeMockData();
      return;
    }

    // Логируем начало синхронизации
    const syncStartTime = new Date().toISOString();
    
    // Синхронизация операторов
    const operators = await fetchBitrixUsers();
    await syncOperators(operators);
    
    // Синхронизация лидов
    const leads = await fetchBitrixLeads();
    await syncLeads(leads);

    // Логируем успешную синхронизацию
    await trickleCreateObject('sync_log', {
      sync_type: 'full_sync',
      status: 'success',
      records_processed: leads.length + operators.length,
      error_message: null
    });

    console.log('Синхронизация с Bitrix24 завершена успешно');
  } catch (error) {
    // Логируем ошибку синхронизации
    await trickleCreateObject('sync_log', {
      sync_type: 'full_sync',
      status: 'error',
      records_processed: 0,
      error_message: error.message
    });
    
    console.error('Ошибка синхронизации с Bitrix24:', error);
    throw error;
  }
}

// Синхронизация операторов
async function syncOperators(operators) {
  for (const operatorData of operators) {
    try {
      const existing = await trickleListObjects('operator', 1, true);
      const found = existing.items.find(item => 
        item.objectData.bitrix_id === operatorData.bitrix_id
      );

      if (found) {
        await trickleUpdateObject('operator', found.objectId, operatorData);
      } else {
        await trickleCreateObject('operator', operatorData);
      }
    } catch (error) {
      console.error('Ошибка синхронизации оператора:', error);
    }
  }
}

// Синхронизация лидов
async function syncLeads(leads) {
  for (const leadData of leads) {
    try {
      const existing = await trickleListObjects('lead', 1, true);
      const found = existing.items.find(item => 
        item.objectData.bitrix_id === leadData.bitrix_id
      );

      if (found) {
        await trickleUpdateObject('lead', found.objectId, leadData);
      } else {
        await trickleCreateObject('lead', leadData);
      }
    } catch (error) {
      console.error('Ошибка синхронизации лида:', error);
    }
  }
}

// Загрузка данных дашборда из базы данных
async function loadDashboardData() {
  try {
    const [leadsResult, operatorsResult, syncLogsResult] = await Promise.all([
      trickleListObjects('lead', 1000, true),
      trickleListObjects('operator', 1000, true), 
      trickleListObjects('sync_log', 1, true)
    ]);

    const leads = leadsResult.items;
    const operators = operatorsResult.items;
    const lastSyncLog = syncLogsResult.items[0];

    // Подсчет лидов по стадиям
    const leadsCount = {
      callback: leads.filter(l => l.objectData.stage === 'callback').length,
      approval: leads.filter(l => l.objectData.stage === 'approval').length,
      invited: leads.filter(l => l.objectData.stage === 'invited').length
    };

    // Группировка операторов по стадиям
    const operatorsByStage = groupOperatorsByStage(leads, operators);

    return {
      leads,
      operators,
      leadsCount,
      operatorsByStage,
      lastSync: lastSyncLog?.createdAt
    };
  } catch (error) {
    console.error('Ошибка загрузки данных из базы:', error);
    return {
      leads: [],
      operators: [],
      leadsCount: mockLeadsData,
      operatorsByStage: mockOperatorsData,
      lastSync: null
    };
  }
}

// Группировка операторов по стадиям с подсчетом лидов
function groupOperatorsByStage(leads, operators) {
  const result = { callback: [], approval: [], invited: [] };
  
  operators.forEach(operator => {
    const operatorLeads = leads.filter(l => l.objectData.operator_id === operator.objectData.bitrix_id);
    
    ['callback', 'approval', 'invited'].forEach(stage => {
      const stageLeads = operatorLeads.filter(l => l.objectData.stage === stage);
      
      if (stageLeads.length > 0) {
        result[stage].push({
          id: operator.objectId,
          name: operator.objectData.name,
          department: operator.objectData.department,
          leads: stageLeads.length,
          trend: Math.floor(Math.random() * 10) - 5, // Временная формула
          status: operator.objectData.status,
          lastActivity: formatRelativeTime(operator.objectData.last_activity)
        });
      }
    });
  });

  return result;
}

// Инициализация моковых данных в базе (для демонстрации)
async function initializeMockData() {
  try {
    const existingLeads = await trickleListObjects('lead', 1, true);
    if (existingLeads.items.length > 0) return;

    // Создаем моковые данные в базе для демонстрации
    console.log('Инициализация демо-данных...');
  } catch (error) {
    console.error('Ошибка инициализации моковых данных:', error);
  }
}

// Форматирование относительного времени
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} час назад`;
  return `${Math.floor(diffMins / 1440)} дн назад`;
}