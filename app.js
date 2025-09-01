class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center max-w-md mx-auto p-6">
                        <div className="icon-alert-triangle text-4xl text-red-500 mb-4"></div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Что-то пошло не так</h1>
                        <p className="text-gray-600 mb-4">
                            Произошла непредвиденная ошибка. Пожалуйста, обновите страницу.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Обновить страницу
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

function App() {
    const [selectedStage, setSelectedStage] = React.useState('all');
    const [leadsData, setLeadsData] = React.useState({ callback: 0, approval: 0, invited: 0 });
    const [operatorsData, setOperatorsData] = React.useState({ callback: [], approval: [], invited: [] });
    const [isLoading, setIsLoading] = React.useState(false);
    const [lastSync, setLastSync] = React.useState(null);
    const [showConfigModal, setShowConfigModal] = React.useState(false);
    const [syncError, setSyncError] = React.useState(null);
    
    const stages = [
        { id: 'callback', name: 'Перезвонить', color: 'text-blue-600' },
        { id: 'approval', name: 'На согласовании', color: 'text-yellow-600' },
        { id: 'invited', name: 'Приглашен к рекрутеру', color: 'text-green-600' }
    ];

    // Проверяем настройку Bitrix24 при загрузке
    React.useEffect(() => {
        loadBitrixConfig();
        loadDataFromDatabase();
    }, []);

    const loadDataFromDatabase = async () => {
        try {
            setIsLoading(true);
            setSyncError(null);
            
            if (typeof syncWithBitrix24 === 'undefined') {
                throw new Error('Функции синхронизации не загружены');
            }
            
            const dbData = await syncWithBitrix24();
            
            setLeadsData(dbData.leadsCount || { callback: 0, approval: 0, invited: 0 });
            setOperatorsData(dbData.operatorsByStage || { callback: [], approval: [], invited: [] });
            setLastSync(dbData.lastSync);
            
            if (dbData.error) {
                setSyncError(dbData.error);
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            setSyncError(error.message);
            
            // Устанавливаем пустые данные при ошибке
            setLeadsData({ callback: 0, approval: 0, invited: 0 });
            setOperatorsData({ callback: [], approval: [], invited: [] });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setIsLoading(true);
            await loadDataFromDatabase();
        } catch (error) {
            console.error('Sync error:', error);
            setSyncError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfigSave = () => {
        loadDataFromDatabase();
    };

    const handleDateFilterApply = async (startDate, endDate) => {
        try {
            setIsLoading(true);
            window.currentStartDate = startDate;
            window.currentEndDate = endDate;
            await loadDataFromDatabase();
        } catch (error) {
            console.error('Date filter error:', error);
            setSyncError(error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <div className="icon-bar-chart-3 text-xl text-white"></div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Дашборд лидов</h1>
                                <p className="text-gray-600 text-sm">Битрикс24 Аналитика</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                onClick={() => setShowConfigModal(true)}
                                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors flex items-center gap-2"
                            >
                                <div className="icon-settings text-sm"></div>
                                Настроить Bitrix24
                            </button>
                            
                            <SyncStatus 
                                lastSync={lastSync} 
                                isLoading={isLoading} 
                                onSync={handleSync}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {syncError && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="icon-alert-circle text-sm"></div>
                            <span>Ошибка синхронизации: {syncError}</span>
                        </div>
                    </div>
                )}

                {/* Date Filter */}
                <DateFilter onApply={handleDateFilterApply} isLoading={isLoading} />

                {/* Metrics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <MetricCard 
                        title="Перезвонить"
                        value={leadsData.callback || 0}
                        icon="phone"
                        color="blue"
                        trend={+12}
                    />
                    <MetricCard 
                        title="На согласовании"
                        value={leadsData.approval || 0}
                        icon="clock"
                        color="yellow"
                        trend={-3}
                    />
                    <MetricCard 
                        title="Приглашен к рекрутеру"
                        value={leadsData.invited || 0}
                        icon="user-check"
                        color="green"
                        trend={+8}
                    />
                </div>

                {/* Charts Section - ГРАФИКИ ПО СТАДИЯМ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="dashboard-card">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">📞 Перезвонить (неделя)</h3>
                        <LeadsChart 
                            type="line" 
                            data={{ callback: leadsData.callback || 0, approval: 0, invited: 0 }}
                            period="week"
                        />
                        <div className="text-center mt-2">
                            <p className="text-2xl font-bold text-blue-600">{leadsData.callback || 0}</p>
                            <p className="text-sm text-gray-600">лидов за неделю</p>
                        </div>
                    </div>
                    
                    <div className="dashboard-card">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">⏳ На согласовании</h3>
                        <LeadsChart 
                            type="doughnut" 
                            data={{ callback: 0, approval: leadsData.approval || 0, invited: 0 }}
                        />
                        <div className="text-center mt-2">
                            <p className="text-2xl font-bold text-yellow-600">{leadsData.approval || 0}</p>
                            <p className="text-sm text-gray-600">лидов</p>
                        </div>
                    </div>
                    
                    <div className="dashboard-card">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">✅ Приглашены</h3>
                        <LeadsChart 
                            type="doughnut" 
                            data={{ callback: 0, approval: 0, invited: leadsData.invited || 0 }}
                        />
                        <div className="text-center mt-2">
                            <p className="text-2xl font-bold text-green-600">{leadsData.invited || 0}</p>
                            <p className="text-sm text-gray-600">лидов</p>
                        </div>
                    </div>
                </div>

                {/* Stage Filter */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Фильтр по стадиям</h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedStage('all')}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                                selectedStage === 'all' 
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                            <OperatorTable 
                                key={stage.id} 
                                stage={stage} 
                                operators={operatorsData[stage.id] || []} 
                            />
                        ))
                    ) : (
                        <OperatorTable 
                            stage={stages.find(s => s.id === selectedStage)} 
                            operators={operatorsData[selectedStage] || []}
                        />
                    )}
                </div>
            </main>

            <BitrixConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                onSave={handleConfigSave}
            />

            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                        <div className="icon-loader-2 animate-spin text-blue-500"></div>
                        <span>Загрузка данных...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
