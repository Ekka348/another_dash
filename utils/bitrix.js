const BitrixService = {
  webhookUrl: 'https://ers2023.bitrix24.ru/rest/27/1bc1djrnc455xeth/',
  
  stages: {
    "UC_A2DF81": "На согласовании",
    "IN_PROCESS": "Перезвонить", 
    "CONVERTED": "Приглашен к рекрутеру"
  },

  isDemoMode: false,

  async makeBitrixRequest(method, params = {}) {
    try {
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

  async getLeads(dateFrom = null, dateTo = null) {
    try {
      const params = {
        select: ['ID', 'STATUS_ID', 'DATE_CREATE', 'DATE_MODIFY', 'TITLE', 'NAME', 'LAST_NAME'],
        filter: {},
        order: { 'DATE_CREATE': 'DESC' },
        start: -1
      };

      if (dateFrom) {
        params.filter['>=DATE_CREATE'] = dateFrom;
      }
      if (dateTo) {
        params.filter['<=DATE_CREATE'] = dateTo;
      }

      console.log('Запрос лидов из Битрикс24:', params);

      const data = await this.makeBitrixRequest('crm.lead.list', params);
      
      if (data && data.result && Array.isArray(data.result)) {
        this.isDemoMode = false;
        console.log('Получены реальные данные:', data.result.length, 'лидов');
        return data.result;
      } else {
        throw new Error('Пустой ответ от API');
      }

    } catch (error) {
      console.warn('Битрикс24 API недоступен:', error.message);
      this.isDemoMode = true;
      return this.getDemoData(dateFrom, dateTo);
    }
  },

  getDemoData(dateFrom = null, dateTo = null) {
    console.log('Используются демо данные');
    const now = new Date();
    const demoLeads = [];
    
    const stageIds = Object.keys(this.stages);
    
    const startDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo + 'T23:59:59') : now;

    const leadCount = 75;
    
    for (let i = 0; i < leadCount; i++) {
      const createDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      const randomStage = stageIds[Math.floor(Math.random() * stageIds.length)];
      
      demoLeads.push({
        ID: i + 1,
        STATUS_ID: randomStage,
        DATE_CREATE: createDate.toISOString(),
        DATE_MODIFY: createDate.toISOString(),
        TITLE: `Лид ERS #${i + 1}`,
        NAME: 'Тестовый',
        LAST_NAME: 'Лид'
      });
    }

    return demoLeads;
  },

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
        default:
          dateFrom = null;
          dateTo = null;
      }

      console.log('Период:', period, 'от:', dateFrom, 'до:', dateTo);
      
      const leads = await this.getLeads(dateFrom, dateTo);
      console.log('Всего лидов:', leads.length);

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
        message: 'Ошибка соединения: ' + error.message,
        isDemoMode: true
      };
    }
  }
};

window.testBitrixConnection = async function() {
  const result = await BitrixService.testConnection();
  console.log('Тест соединения:', result);
  alert(`Соединение: ${result.success ? 'УСПЕХ' : 'ОШИБКА'}\n${result.message}`);
  return result;
};
