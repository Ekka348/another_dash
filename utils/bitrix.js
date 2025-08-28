const BitrixService = {
  webhookUrl: 'https://ers2023.bitrix24.ru/rest/27/1bc1djrnc455xeth/',
  
  stages: {
    "UC_A2DF81": "На согласовании",
    "IN_PROCESS": "Перезвонить", 
    "CONVERTED": "Приглашен к рекрутеру"
  },

  // Демо данные для тестирования
  getDemoData() {
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
        DATE_MODIFY: createTime.toISOString()
      });
    }
    
    // Генерируем тестовые лиды за последние 30 дней
    for (let i = 0; i < 42; i++) {
      const randomDays = Math.floor(Math.random() * 29) + 1; // 1-29 дней назад
      const createDate = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
      const stageIds = Object.keys(this.stages);
      const randomStage = stageIds[Math.floor(Math.random() * stageIds.length)];
      
      demoLeads.push({
        ID: `demo_${i + 1}`,
        STATUS_ID: randomStage,
        DATE_CREATE: createDate.toISOString(),
        DATE_MODIFY: createDate.toISOString()
      });
    }
    
    return demoLeads;
  },

  async getLeads(dateFrom = null, dateTo = null) {
    try {
      const params = {
        select: ['ID', 'STATUS_ID', 'DATE_CREATE', 'DATE_MODIFY'],
        filter: {},
        order: { 'DATE_CREATE': 'DESC' }
      };

      if (dateFrom) {
        params.filter['>=DATE_CREATE'] = dateFrom;
      }
      if (dateTo) {
        params.filter['<=DATE_CREATE'] = dateTo;
      }

      console.log('Запрос к Битрикс24:', {
        url: this.webhookUrl + 'crm.lead.list',
        params: params
      });

      const response = await fetch(`https://proxy-api.trickle-app.host/?url=${encodeURIComponent(this.webhookUrl + 'crm.lead.list')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(params)
      });

      console.log('Ответ от API:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Битрикс24 API ошибка:', response.status, errorText);
        console.warn('Используются демо данные');
        return this.filterDemoData(dateFrom, dateTo);
      }

      const data = await response.json();
      console.log('Данные от Битрикс24:', data);
      
      if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
        console.log('Получены реальные данные:', data.result.length, 'лидов');
        return data.result;
      } else {
        console.warn('Пустой ответ от API, используются демо данные');
        return this.filterDemoData(dateFrom, dateTo);
      }
    } catch (error) {
      console.warn('Битрикс24 API недоступен:', error);
      console.warn('Используются демо данные');
      return this.filterDemoData(dateFrom, dateTo);
    }
  },

  filterDemoData(dateFrom = null, dateTo = null) {
    const demoLeads = this.getDemoData();
    
    return demoLeads.filter(lead => {
      const leadDate = new Date(lead.DATE_CREATE);
      
      if (dateFrom && leadDate < new Date(dateFrom + 'T00:00:00')) return false;
      if (dateTo && leadDate >= new Date(dateTo + 'T00:00:00')) return false;
      
      return true;
    });
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
          break;
        case '30days':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '90days':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default:
          dateFrom = null;
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
  }
};