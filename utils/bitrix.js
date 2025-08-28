const BitrixService = {
  webhookUrl: 'https://ers2023.bitrix24.ru/rest/27/1bc1djrnc455xeth/',
  
  stages: {
    "UC_A2DF81": "На согласовании",
    "IN_PROCESS": "Перезвонить", 
    "CONVERTED": "Приглашен к рекрутеру"
  },

  // Флаг для отслеживания режима демо
  isDemoMode: false,

  // Основной метод для запросов к Битрикс24 API
  async makeBitrixRequest(method, params = {}) {
    try {
      console.log('Bitrix API Request:', { method, params, url: this.webhookUrl + method });

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
        console.warn('Bitrix API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn('Bitrix API Error:', data.error);
        throw new Error(data.error_description || 'Ошибка Битрикс24 API');
      }

      console.log('Bitrix API Success:', data);
      return data;

    } catch (error) {
      console.warn('Bitrix request failed:', error);
      throw error;
    }
  },

  // Получение лидов
  async getLeads(dateFrom = null, dateTo = null) {
    try {
      const params = {
        select: ['ID', 'STATUS_ID', 'DATE_CREATE', 'DATE_MODIFY', 'TITLE', 'NAME', 'LAST_NAME'],
        filter: {},
        order: { 'DATE_CREATE': 'DESC' },
        start: -1 // Получаем все записи
      };

      if (dateFrom) {
        params.filter['>=DATE_CREATE'] = dateFrom;
      }
      if (dateTo) {
        params.filter['<=DATE_CREATE'] = dateTo;
      }

      console.log('Запрос лидов из Битрикс24 с параметрами:', params);

      const data = await this.makeBitrixRequest('crm.lead.list', params);
      
      if (data && data.result && Array.isArray(data.result)) {
        this.isDemoMode = false;
        console.log('Получены реальные данные из Битрикс24:', data.result.length, 'лидов');
        return data.result;
      } else {
        throw new Error('Пустой или неверный ответ от API');
      }

    } catch (error) {
      console.warn('Битрикс24 API недоступен, используются демо данные:', error.message);
      this.isDemoMode = true;
      return this.getDemoData(dateFrom, dateTo);
    }
  },

  // Демо данные для тестирования
  getDemoData(dateFrom = null, dateTo = null) {
    console.log('Генерация демо данных');
    const now = new Date();
    const demoLeads = [];
    
    const stageIds = Object.keys(this.stages);
    
    // Генерируем реалистичные данные
    const getRandomDate = (startDate, endDate) => {
      return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    };

    // Данные за выбранный период или последние 90 дней по умолчанию
    const startDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo + 'T23:59:59') : now;

    // Создаем 50-100 демо лидов
    const leadCount = Math.floor(Math.random() * 50) + 50;
    
    for (let i = 0; i < leadCount; i++) {
      const createDate = getRandomDate(startDate, endDate);
      const randomStage = stageIds[Math.floor(Math.random() * stageIds.length)];
      
      demoLeads.push({
        ID: i + 1,
        STATUS_ID: randomStage,
        DATE_CREATE: createDate.toISOString(),
        DATE_MODIFY: createDate.toISOString(),
        TITLE: `Лид #${i + 1}`,
        NAME: ['Иван', 'Петр', 'Мария', 'Анна', 'Сергей'][Math.floor(Math.random() * 5)],
        LAST_NAME: ['Иванов', 'Петров', 'Сидорова', 'Смирнова', 'Кузнецов'][Math.floor(Math.random() * 5)]
      });
    }

    return demoLeads;
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

      console.log('Период для статистики:', period, 'от:', dateFrom, 'до:', dateTo);
      
      const leads = await this.getLeads(dateFrom, dateTo);
      console.log('Всего лидов для статистики:', leads.length);

      const stageStats = {};
      
      // Инициализируем все стадии с нулевыми значениями
      Object.keys(this.stages).forEach(stageId => {
        stageStats[stageId] = {
          name: this.stages[stageId],
          count: 0,
          leads: []
        };
      });

      // Считаем лиды по стадиям
      leads.forEach(lead => {
        if (stageStats[lead.STATUS_ID]) {
          stageStats[lead.STATUS_ID].count++;
          stageStats[lead.STATUS_ID].leads.push(lead);
        } else {
          console.warn('Неизвестная стадия:', lead.STATUS_ID);
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
        leadsCount: data.result ? data.result.length : 0,
        isDemoMode: false
      };

    } catch (error) {
      return {
        success: false,
        message: 'Ошибка соединения с Битрикс24: ' + error.message,
        isDemoMode: true
      };
    }
  },

  // Получение информации о текущем режиме
  getCurrentMode() {
    return {
      isDemoMode: this.isDemoMode,
      webhookUrl: this.webhookUrl
    };
  }
};

// Глобальные функции для отладки
window.testBitrixConnection = async function() {
  const result = await BitrixService.testConnection();
  console.log('Тест соединения:', result);
  alert(`Соединение с Битрикс24: ${result.success ? 'УСПЕХ' : 'ОШИБКА'}\n${result.message}`);
  return result;
};

window.showBitrixInfo = function() {
  const info = BitrixService.getCurrentMode();
  console.log('Информация о Битрикс24:', info);
  alert(`Режим: ${info.isDemoMode ? 'ДЕМО' : 'РЕАЛЬНЫЙ'}\nWebhook: ${info.webhookUrl}`);
};

window.getLeadsSample = async function() {
  try {
    const leads = await BitrixService.getLeads();
    console.log('Пример лидов:', leads.slice(0, 5));
    alert(`Получено лидов: ${leads.length}\nПервые 5: ${JSON.stringify(leads.slice(0, 5), null, 2)}`);
  } catch (error) {
    console.error('Ошибка получения лидов:', error);
    alert('Ошибка: ' + error.message);
  }
};
