function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [leadsData, setLeadsData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
      loadLeadsData();
    }
  }, []);

  const loadLeadsData = async () => {
    setLoading(true);
    try {
      const data = await BitrixService.getLeadsByStages('30days');
      setLeadsData(data);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    loadLeadsData();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <div className="icon-bar-chart text-2xl text-blue-600"></div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">ERS Leads Dashboard</h1>
            <p className="text-blue-100">Статистика лидов Битрикс24</p>
          </div>
          
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Header currentUser={currentUser} />
      
      <div className="max-w-6xl mx-auto mt-6">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Статистика лидов ERS</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка данных из Битрикс24...</p>
            </div>
          ) : leadsData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Object.entries(leadsData).map(([stageId, data]) => (
                  <StatsCard
                    key={stageId}
                    title={data.name}
                    value={data.count.toString()}
                    change=""
                    icon="users"
                    color={stageId === 'UC_A2DF81' ? 'blue' : stageId === 'IN_PROCESS' ? 'orange' : 'green'}
                  />
                ))}
              </div>

              <Chart 
                title="Распределение лидов по стадиям"
                type="doughnut"
                data={{
                  labels: Object.values(leadsData).map(d => d.name),
                  datasets: [{
                    data: Object.values(leadsData).map(d => d.count),
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981']
                  }]
                }}
              />
            </>
          ) : (
            <div className="text-center py-8 text-gray-600">
              Не удалось загрузить данные
            </div>
          )}
        </div>

        {BitrixService.isDemoMode && (
          <div className="mt-4 p-4 bg-orange-100 border border-orange-300 rounded-lg text-center">
            <p className="text-orange-800">⚠️ Используются демо-данные. Проверьте подключение к Битрикс24.</p>
            <button onClick={testBitrixConnection} className="text-orange-600 underline mt-2">
              Проверить соединение
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
