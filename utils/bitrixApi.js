// Bitrix24 API configuration and methods
const BITRIX_CONFIG = {
  domain: '', // Будет настроено автоматически
  webhook: '', // Webhook для доступа к API
  userId: '', // ID пользователя
};

// Настройка конфигурации Bitrix24
function setBitrixConfig(domain, webhook, userId) {
  BITRIX_CONFIG.domain = domain;
  BITRIX_CONFIG.webhook = webhook;
  BITRIX_CONFIG.userId = userId;
  localStorage.setItem('bitrix_config', JSON.stringify(BITRIX_CONFIG));
}

// Загрузка конфигурации из localStorage
function loadBitrixConfig() {
  try {
    const saved = localStorage.getItem('bitrix_config');
    if (saved) {
      const config = JSON.parse(saved);
      Object.assign(BITRIX_CONFIG, config);
      return true;
    }
  } catch (error) {
    console.error('Error loading Bitrix config:', error);
  }
  return false;
}

// Проверка настройки API
function isBitrixConfigured() {
  return BITRIX_CONFIG.domain && BITRIX_CONFIG.webhook;
}

// Выполнение запроса к Bitrix24 API
async function bitrixApiCall(method, params = {}) {
  if (!isBitrixConfigured()) {
    throw new Error('Bitrix24 не настроен. Укажите домен и webhook.');
  }

  const url = `https://proxy-api.trickle-app.host/?url=https://${BITRIX_CONFIG.domain}/rest/${BITRIX_CONFIG.webhook}/${method}`;
  
  try {
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
      throw new Error(data.error_description || 'Bitrix24 API error');
    }

    return data.result;
  } catch (error) {
    console.error('Bitrix API call failed:', error);
    throw error;
  }
}

// Получение лидов из Bitrix24
async function fetchBitrixLeads() {
  const leads = await bitrixApiCall('crm.lead.list', {
    select: ['ID', 'TITLE', 'STATUS_ID', 'ASSIGNED_BY_ID', 'DATE_MODIFY', 'DATE_CREATE'],
    filter: {
      'STATUS_ID': ['IN_PROCESS', 'UC_A2DF81', 'CONVERTED']
    },
    order: { 'DATE_CREATE': 'DESC' }
  });

  return leads.map(lead => ({
    bitrix_id: lead.ID,
    title: lead.TITLE || `Лид #${lead.ID}`,
    stage: mapBitrixStatusToStage(lead.STATUS_ID),
    operator_id: lead.ASSIGNED_BY_ID,
    status: lead.STATUS_ID,
    last_updated: lead.DATE_MODIFY || lead.DATE_CREATE
  }));
}

// Получение пользователей (операторов) из Bitrix24
async function fetchBitrixUsers() {
  const users = await bitrixApiCall('user.get', {
    filter: {
      'ACTIVE': 'Y'
    },
    select: ['ID', 'NAME', 'LAST_NAME', 'WORK_DEPARTMENT', 'IS_ONLINE', 'LAST_ACTIVITY_DATE']
  });

  return users.map(user => ({
    bitrix_id: user.ID,
    name: `${user.NAME} ${user.LAST_NAME}`.trim(),
    department: user.WORK_DEPARTMENT || 'Не указан',
    status: user.IS_ONLINE === 'Y' ? 'active' : 'offline',
    last_activity: user.LAST_ACTIVITY_DATE || new Date().toISOString()
  }));
}

// Маппинг статусов Bitrix24 на внутренние стадии
function mapBitrixStatusToStage(statusId) {
  const mapping = {
    'IN_PROCESS': 'callback',          // Перезвонить
    'UC_A2DF81': 'approval',           // На согласовании
    'CONVERTED': 'invited'             // Приглашен к рекрутеру
  };
  
  return mapping[statusId] || 'callback';
}
