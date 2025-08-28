class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-black"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  try {
    const [selectedStage, setSelectedStage] = React.useState('all');
    const [leadsData, setLeadsData] = React.useState(mockLeadsData);
    const [operatorsData, setOperatorsData] = React.useState(mockOperatorsData);
    const [isLoading, setIsLoading] = React.useState(false);
    const [lastSync, setLastSync] = React.useState(null);
    
    const stages = [
      { id: 'callback', name: 'Перезвонить', color: 'text-blue-600' },
      { id: 'approval', name: 'На согласовании', color: 'text-yellow-600' },
      { id: 'invited', name: 'Приглашен к рекрутеру', color: 'text-green-600' }
    ];

    // Load data from database on mount
    React.useEffect(() => {
      loadDataFromDatabase();
    }, []);

    const loadDataFromDatabase = async () => {
      try {
        setIsLoading(true);
        const dbData = await loadDashboardData();
        if (dbData.leads.length > 0) {
          setLeadsData(dbData.leadsCount);
          setOperatorsData(dbData.operatorsByStage);
        }
        setLastSync(dbData.lastSync);
      } catch (error) {
        console.error('Error loading data from database:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSync = async () => {
      try {
        setIsLoading(true);
        await syncWithBitrix24();
        await loadDataFromDatabase();
      } catch (error) {
        console.error('Sync error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50" data-name="dashboard" data-file="app.js">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-[var(--border-color)]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--primary-color)] rounded-lg flex items-center justify-center">
                  <div className="icon-bar-chart-3 text-xl text-white"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gradient">Дашборд лидов</h1>
                  <p className="text-[var(--text-secondary)] text-sm">Битрикс24 Аналитика</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <SyncStatus lastSync={lastSync} isLoading={isLoading} onSync={handleSync} />
                <div className="text-sm text-[var(--text-secondary)]">
                  Обновлено: {new Date().toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MetricCard 
              title="Перезвонить"
              value={leadsData.callback}
              icon="phone"
              color="blue"
              trend={+12}
            />
            <MetricCard 
              title="На согласовании"
              value={leadsData.approval}
              icon="clock"
              color="yellow"
              trend={-3}
            />
            <MetricCard 
              title="Приглашен к рекрутеру"
              value={leadsData.invited}
              icon="user-check"
              color="green"
              trend={+8}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="dashboard-card">
              <h3 className="text-lg font-semibold mb-4">Динамика лидов по дням</h3>
              <LeadsChart type="line" data={leadsData} />
            </div>
            <div className="dashboard-card">
              <h3 className="text-lg font-semibold mb-4">Распределение по стадиям</h3>
              <LeadsChart type="doughnut" data={leadsData} />
            </div>
          </div>

          {/* Stage Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStage('all')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedStage === 'all' 
                    ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                    : 'bg-white text-[var(--text-primary)] border-[var(--border-color)] hover:bg-gray-50'
                }`}
              >
                Все стадии
              </button>
              {stages.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedStage === stage.id 
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                      : 'bg-white text-[var(--text-primary)] border-[var(--border-color)] hover:bg-gray-50'
                  }`}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>

          {/* Operators Tables */}
          <div className="space-y-6">
            {selectedStage === 'all' ? (
              stages.map(stage => (
                <OperatorTable key={stage.id} stage={stage} operators={operatorsData[stage.id] || []} />
              ))
            ) : (
              <OperatorTable 
                stage={stages.find(s => s.id === selectedStage)} 
                operators={operatorsData[selectedStage] || []}
              />
            )}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);