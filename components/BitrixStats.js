function BitrixStats() {
  try {
    const [leadsData, setLeadsData] = React.useState(null);
    const [trendsData, setTrendsData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [selectedPeriod, setSelectedPeriod] = React.useState('today');
    const [error, setError] = React.useState('');
    const [isDemoMode, setIsDemoMode] = React.useState(false);

    const periods = {
      'today': 'Сегодня',
      '7days': '7 дней',
      '30days': '30 дней', 
      '90days': '90 дней'
    };

    React.useEffect(() => {
      loadData();
    }, [selectedPeriod]);

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        setIsDemoMode(false);
        
        // Проверяем, есть ли реальные данные или используются демо данные
        const testLeads = await BitrixService.getLeads();
        const isDemo = testLeads.length > 0 && (testLeads[0].ID.startsWith('demo_') || testLeads[0].ID.startsWith('today_'));
        setIsDemoMode(isDemo);
        
        const [stages, trends] = await Promise.all([
          BitrixService.getLeadsByStages(selectedPeriod),
          BitrixService.getLeadsTrend(7)
        ]);
        
        setLeadsData(stages);
        setTrendsData(trends);
      } catch (err) {
        setError('Ошибка при загрузке данных из Битрикс24');
        console.error('Load Bitrix data error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
            <p className="text-[var(--text-light)]">Загрузка данных из Битрикс24...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
            <button onClick={loadData} className="ml-4 text-sm underline">
              Повторить
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-name="bitrix-stats" data-file="components/BitrixStats.js">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-dark)]">Аналитика лидов Битрикс24</h1>
            {isDemoMode && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                <span className="text-sm text-orange-600">Демо режим - используются тестовые данные</span>
              </div>
            )}
          </div>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--primary-color)]"
          >
            {Object.entries(periods).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {leadsData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(leadsData).map(([stageId, data]) => (
                <div key={stageId} className="stat-card">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <div className="icon-users text-xl"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-1">{data.name}</h3>
                    <p className="text-3xl font-bold text-[var(--primary-color)]">{data.count}</p>
                    <p className="text-sm text-[var(--text-light)]">лидов за период</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Chart 
                title="Распределение лидов по стадиям"
                type="doughnut"
                data={{
                  labels: Object.values(leadsData).map(d => d.name),
                  datasets: [{
                    data: Object.values(leadsData).map(d => d.count),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                  }]
                }}
              />
              
              <Chart 
                title="Лиды по стадиям"
                type="bar"
                data={{
                  labels: Object.values(leadsData).map(d => d.name),
                  datasets: [{
                    label: 'Количество лидов',
                    data: Object.values(leadsData).map(d => d.count),
                    backgroundColor: 'rgba(37, 99, 235, 0.8)'
                  }]
                }}
              />
            </div>
          </>
        )}

        {trendsData && (
          <Chart 
            title="Динамика лидов за последние 7 дней"
            type="line"
            data={{
              labels: trendsData.map(d => new Date(d.date).toLocaleDateString('ru-RU')),
              datasets: Object.entries(BitrixService.stages).map(([stageId, stageName], index) => ({
                label: stageName,
                data: trendsData.map(d => d.stages[stageId] || 0),
                borderColor: ['#3b82f6', '#10b981', '#f59e0b'][index],
                backgroundColor: ['rgba(59, 130, 246, 0.1)', 'rgba(16, 185, 129, 0.1)', 'rgba(245, 158, 11, 0.1)'][index]
              }))
            }}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error('BitrixStats component error:', error);
    return null;
  }
}