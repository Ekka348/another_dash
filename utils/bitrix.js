const BitrixService = {
  webhookUrl: 'https://ers2023.bitrix24.ru/rest/27/1bc1djrnc455xeth/',
  
  stages: {
    "UC_A2DF81": "На согласовании",
    "IN_PROCESS": "Перезвонить", 
    "CONVERTED": "Приглашен к рекрутеру"
  },

  // Кэш для хранения данных во избежание лишних запросов
  cache: {
    leads: null,
    timestamp: null,
    cacheDuration: 5 * 60 * 1000 // 5 минут кэширования
  },

  // Проверка валидности вебхука
  validateWebhook() {
    if (!this.webhookUrl || !this.webhookUrl.includes('bitrix24')) {
      console.error('Неверный URL вебхука Битрикс24');
      return false;
    }
    return true;
  },

  // Основной метод для запросов к Битрикс24 API
  async makeBitrixRequest(method, params = {}) {
    try {
      if (!this.validateWebhook()) {
        throw new Error('Неверная конфигурация вебхука');
      }

      console.log('Bitrix API Request:', { method, params });

      const response = await fetch(this.webhookUrl + method, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('Bitrix API Error:', data.error);
        throw new Error(data.error_description || 'Ошибка Битрикс24 API');
      }

      return data;

    } catch (error) {
      console.error('Bitrix request failed:', error);
      throw error;
    }
  },

  // Получение лидов с кэшированием
  async getLeads(dateFrom = null, dateTo = null) {
    try {
      // Проверяем кэш
      const now = Date.now();
      if (this.cache.leads && this.cache.timestamp && 
          (now - this.cache.timestamp) < this.cache.cacheDuration) {
        console.log('Используются кэшированные данные лидов');
        return this.filterLeadsByDate(this.cache.leads, dateFrom, dateTo);
      }

      const params = {
        select: ['ID', 'STATUS_ID', 'DATE_CREATE', 'DATE_MODIFY', 'TITLE', 'NAME', 'LAST_NAME'],
        filter: {},
        order: { 'DATE_CREATE': 'DESC' },
        start: 0
      };

      if (dateFrom) {
        params.filter['>=DATE_CREATE'] = dateFrom;
      }
      if (dateTo) {
        params.filter['<=DATE_CREATE'] = dateTo;
      }

      console.log('Запрос лидов из Битрикс24:', params);

      const data = await this.makeBitrixRequest('crm.lead.list', params);
      
      if (data && data.result) {
        // Сохраняем в кэш
        this.cache.leads = data.result;
        this.cache.timestamp = now;
        
        console.log('Получены реальные данные:', data.result.length, 'лидов');
        return data.result;
      } else {
        console.warn('Пустой ответ от API, используются демо данные');
        return this.getDemoData(dateFrom, dateTo);
      }

    } catch (error) {
      console.warn('Битрикс24 API недоступен, используются демо данные:', error.message);
      return this.getDemoData(dateFrom, dateTo);
    }
  },

  // Фильтрация лидов по дате
  filterLeadsByDate(leads, dateFrom, dateTo) {
    if (!dateFrom && !dateTo) return leads;

    return leads.filter(lead => {
      const leadDate = new Date(lead.DATE_CREATE);
      
      if (dateFrom && leadDate < new Date(dateFrom + 'T00:00:00')) return false;
      if (dateTo && leadDate >= new Date(dateTo + 'T00:00:00')) return false;
      
      return true;
    });
  },

  // Демо данные для тестирования
  getDemoData(dateFrom = null, dateTo = null) {
    const now = new Date();
    const demoLeads = [];
    
    // Добавляем данные за сегодня
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 8; i++) {
      const createTime = new Date(today.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      const stageIds = Object.keys(this.stages);
      const randomStage = stageIds[Math.floor(Math.random() * stageIds.length)];
      
      demoLeads.push({
        ID: `today_${i + 1}`,
        STATUS_ID: randomStage,
        DATE_CREATE: createTime.toISOString(),
        DATE_MODIFY: createTime.toISOString(),
        TITLE: `Тестовый лид ${i + 1}`,
        NAME: 'Тестовый',
        LAST_NAME: 'Лид'
      });
    }
    
    // Генерируем тестовые лиды за последние 30 дней
    for (let i = 0; i < 42; i++) {
      const randomDays = Math.floor(Math.random() * 29) + 1;
      const createDate = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
      const stageIds = Object.keys(this.stages);
      const randomStage = stageIds[Math.floor(Math.random() * stageIds.length)];
      
      demoLeads.push({
        ID: `demo_${i + 1}`,
        STATUS_ID: randomStage,
        DATE_CREATE: createDate.toISOString(),
        DATE_MODIFY: createDate.toISOString(),
        TITLE: `Демо лид ${i + 1}`,
        NAME: 'Демо',
        LAST_NAME: 'Лид'
      });
    }
    
    return this.filterLeadsByDate(demoLeads, dateFrom, dateTo);
  },

  // Получение статистики по стадиям
  async getLeadsByStages(period = '30days') {
    try {
      const now = new Date();
      let dateFrom, dateTo;

      switch (period) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
          dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];
          break;
        case '7days':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          dateTo = now.toISOString().split('T')[0];
          break;
        case '30days':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          dateTo = now.toISOString().split('T')[0];
          break;
        case '90days':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          dateTo = now.toISOString().split('T')[0];
          break;
        default:
          dateFrom = null;
          dateTo = null;
      }

      console.log('Период:', period, 'от:', dateFrom, 'до:', dateTo);
      
      const leads = await this.getLeads(dateFrom, dateTo);

      const stageStats = {};
      Object.keys(this.stages).forEach(stageId => {
        stageStats[stageId] = {
          name: this.stages[stageId],
          count: 0,
          leads: []
        };
      });

      leads.forEach(lead => {
        if (stageStats[lead.STATUS_ID]) {
          stageStats[lead.STATUS_ID].count++;
          stageStats[lead.STATUS_ID].leads.push(lead);
        }
      });

      console.log('Статистика по стадиям:', stageStats);
      return stageStats;

    } catch (error) {
      console.error('Get leads by stages error:', error);
      throw error;
    }
  },

  // Получение тренда лидов
  async getLeadsTrend(days = 7) {
    try {
      const trends = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        const leads = await this.getLeads(dateStr, nextDateStr);
        
        const dayStats = {
          date: dateStr,
          total: leads.length,
          stages: {}
        };

        Object.keys(this.stages).forEach(stageId => {
          dayStats.stages[stageId] = leads.filter(l => l.STATUS_ID === stageId).length;
        });

        trends.push(dayStats);
      }

      return trends;

    } catch (error) {
      console.error('Get leads trend error:', error);
      throw error;
    }
  },

  // Дополнительные методы для расширенной аналитики

  // Получение информации о лиде по ID
  async getLeadById(leadId) {
    try {
      const params = {
        id: leadId
      };

      const data = await this.makeBitrixRequest('crm.lead.get', params);
      return data.result;

    } catch (error) {
      console.error('Get lead by ID error:', error);
      return null;
    }
  },

  // Обновление стадии лида
  async updateLeadStage(leadId, stageId) {
    try {
      const params = {
        id: leadId,
        fields: {
          STATUS_ID: stageId
        }
      };

      const data = await this.makeBitrixRequest('crm.lead.update', params);
      return data.result;

    } catch (error) {
      console.error('Update lead stage error:', error);
      throw error;
    }
  },

  // Получение воронки продаж
  async getSalesFunnel() {
    try {
      const params = {
        select: ['ID', 'NAME', 'STATUS_ID', 'OPPORTUNITY', 'ASSIGNED_BY_ID']
      };

      const data = await this.makeBitrixRequest('crm.lead.list', params);
      return data.result;

    } catch (error) {
      console.error('Get sales funnel error:', error);
      throw error;
    }
  },

  // Очистка кэша
  clearCache() {
    this.cache.leads = null;
    this.cache.timestamp = null;
    console.log('Кэш данных очищен');
  },

  // Проверка соединения с Битрикс24
  async testConnection() {
    try {
      const params = {
        select: ['ID'],
        filter: {},
        order: { 'ID': 'DESC' },
        start: 0,
        limit: 1
      };

      const data = await this.makeBitrixRequest('crm.lead.list', params);
      return {
        success: true,
        message: 'Соединение с Битрикс24 установлено',
        leadsCount: data.result ? data.result.length : 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Ошибка соединения с Битрикс24: ' + error.message
      };
    }
  }
};

// Глобальная функция для тестирования из консоли
window.testBitrixConnection = async function() {
  const result = await BitrixService.testConnection();
  console.log('Тест соединения:', result);
  return result;
};

window.clearBitrixCache = function() {
  BitrixService.clearCache();
  console.log('Кэш очищен');
};
