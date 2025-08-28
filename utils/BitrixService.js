const BitrixService = {
  stages: {
    UC_A2DF81: 'На согласовании',
    IN_PROCESS: 'Перезвонить',
    CONVERTED: 'Приглашен к рекрутеру'
  },

  // 👇 Парсинг даты в формате DD.MM.YYYY HH:mm:ss
  parseBitrixDate(dateStr) {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('.');
    return new Date(`${year}-${month}-${day}T${timePart}`);
  },

  async getLeads() {
    const res = await fetch('/api/bitrix-fetch');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getLeadsByStages(period = 'today') {
    const leads = await BitrixService.getLeads();
    const filtered = BitrixService.filterByPeriod(leads, period);

    const grouped = {};
    for (const lead of filtered) {
      const stageId = lead.STATUS_ID;
      if (!BitrixService.stages[stageId]) continue;

      if (!grouped[stageId]) {
        grouped[stageId] = { name: BitrixService.stages[stageId], count: 0 };
      }
      grouped[stageId].count += 1;
    }

    return grouped;
  },

  async getLeadsTrend(days = 7) {
    const leads = await BitrixService.getLeads();
    const now = new Date();
    const trend = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];

      const dayLeads = leads.filter(lead => {
        const created = BitrixService.parseBitrixDate(lead.DATE_CREATE);
        return created.toISOString().startsWith(dayStr);
      });

      const stages = {};
      for (const lead of dayLeads) {
        const stageId = lead.STATUS_ID;
        if (!BitrixService.stages[stageId]) continue;

        stages[stageId] = (stages[stageId] || 0) + 1;
      }

      trend.push({ date: dayStr, stages });
    }

    return trend;
  },

  filterByPeriod(leads, period) {
    const now = new Date();
    let fromDate = new Date();

    switch (period) {
      case '7days':
        fromDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        fromDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        fromDate.setDate(now.getDate() - 90);
        break;
      case 'today':
      default:
        fromDate.setHours(0, 0, 0, 0);
        break;
    }

    return leads.filter(lead => {
      const created = BitrixService.parseBitrixDate(lead.DATE_CREATE);
      return created >= fromDate;
    });
  }
};

export default BitrixService;
