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
    const [isBackgroundLoading, setIsBackgroundLoading] = React.useState(false);
    const [lastSync, setLastSync] = React.useState(null);
    const [showConfigModal, setShowConfigModal] = React.useState(false);
    const [syncError, setSyncError] = React.useState(null);
    const [weeklyLeads, setWeeklyLeads] = React.useState({
        callback: Array(7).fill(0),
        approval: Array(7).fill(0),
        invited: Array(7).fill(0)
    });
    const [dailyLeads, setDailyLeads] = React.useState({
        callback: Array(24).fill(0),
        approval: Array(24).fill(0),
        invited: Array(24).fill(0)
    });
    const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);
    
    const stages = [
        { id: 'callback', name: 'Перезвонить', color: 'text-blue-600' },
        { id: 'approval', name: 'На согласовании', color: 'text-yellow-600' },
        { id: 'invited', name: 'Приглашен к рекрутеру', color: 'text-green-600' }
    ];

    // Реф для хранения интервала автообновления
    const refreshIntervalRef = React.useRef(null);

    // Проверяем настройку Bitrix24 при загрузке
    React.useEffect(() => {
        loadBitrixConfig();
        loadDataFromDatabase();
        startAutoRefresh();

        // Очистка при размонтировании
        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    // Запуск автообновления каждые 2 минуты
    const startAutoRefresh = () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }

        refreshIntervalRef.current = setInterval(() => {
            if (autoRefreshEnabled && !isLoading) {
                loadDataFromDatabase(true); // true - фоновое обновление
            }
        }, 2 * 60 * 1000); // 2 минуты
    };

    const loadDataFromDatabase = async (isBackground = false) => {
        try {
            if (!isBackground) {
                setIsLoading(true);
            } else {
                setIsBackgroundLoading(true);
            }
            setSyncError(null);
            
            if (typeof syncWithBitrix24 === 'undefined') {
                throw new Error('Функции синхронизации не загружены');
            }
            
            const dbData = await syncWithBitrix24();
            
            setLeadsData(dbData.leadsCount || { callback: 0, approval: 0, invited: 0 });
            setOperatorsData(dbData.operatorsByStage || { callback: [], approval: [], invited: [] });
            
            // Подготавливаем данные для недельного графика
            if (dbData.weeklyLeads) {
                const preparedData = prepareWeeklyChartData(dbData.weeklyLeads);
                setWeeklyLeads(preparedData);
            } else {
                setWeeklyLeads({
                    callback: Array(7).fill(0),
                    approval: Array(7).fill(0),
                    invited: Array(7).fill(0)
                });
            }
            
            // Подготавливаем данные для дневного графика
            if (dbData.dailyLeads) {
                const preparedData = prepareDailyChartData(dbData.dailyLeads);
                setDailyLeads(preparedData);
            } else {
                setDailyLeads({
                    callback: Array(24).fill(0),
                    approval: Array(24).fill(0),
                    invited: Array(24).fill(0)
                });
            }
            
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
            setWeeklyLeads({
                callback: Array(7).fill(0),
                approval: Array(7).fill(0),
                invited: Array(7).fill(0)
            });
            setDailyLeads({
                callback: Array(24).fill(0),
                approval: Array(24).fill(0),
                invited: Array(24).fill(0)
            });
        } finally {
            setIsLoading(false);
            setIsBackgroundLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            await loadDataFromDatabase(false); // Обычное обновление
        } catch (error) {
            console.error('Sync error:', error);
            setSyncError(error.message);
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

    // Получение подписей для графиков (даты недели)
    const getWeekDayLabels = () => {
        const days = [];
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(firstDayOfWeek);
            day.setDate(firstDayOfWeek.getDate() + i);
            days.push(day.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }));
        }
        
        return days;
    };

    // Получение подписей для дневного графика
    const getHourLabels = () => {
        return Array.from({length: 24}, (_, i) => {
            return `${i.toString().padStart(2, '0')}:00`;
        });
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
                                isAutoRefresh={autoRefreshEnabled}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Индикатор фонового обновления */}
            {isBackgroundLoading && (
                <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 z-40">
                    <div className="icon-loader-2 animate-spin text-sm"></div>
                    <span className="text-sm">Фоновое обновление...</span>
                </div>
            )}

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

                {/* Общий контейнер для графиков за день (ПЕРВЫЙ) */}
                <div className="dashboard-card mb-8">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900">Графики за текущий день</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* График для Перезвонить */}
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={dailyLeads.callback || Array(24).fill(0)}
                                labels={getHourLabels()}
                                color="#2563eb"
                                title="Перезвонить"
                            />
                        </div>
                        
                        {/* График для На согласовании */}
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={dailyLeads.approval || Array(24).fill(0)}
                                labels={getHourLabels()}
                                color="#f59e0b"
                                title="На согласовании"
                            />
                        </div>
                        
                        {/* График для Приглашены */}
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={dailyLeads.invited || Array(24).fill(0)}
                                labels={getHourLabels()}
                                color="#10b981"
                                title="Приглашен к рекрутеру"
                            />
                        </div>
                    </div>
                </div>

                {/* Общий контейнер для графиков за неделю (ВТОРОЙ) */}
                <div className="dashboard-card mb-8">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900">Графики за текущую неделю</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* График для Перезвонить */}
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={weeklyLeads.callback || Array(7).fill(0)}
                                labels={getWeekDayLabels()}
                                color="#2563eb"
                                title="Перезвонить"
                            />
                        </div>
                        
                        {/* График для На согласовании */}
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={weeklyLeads.approval || Array(7).fill(0)}
                                labels={getWeekDayLabels()}
                                color="#f59e0b"
                                title="На согласовании"
                            />
                        </div>
                        
                        {/* График для Приглашены */}
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={weeklyLeads.invited || Array(7).fill(0)}
                                labels={getWeekDayLabels()}
                                color="#10b981"
                                title="Приглашен к рекрутеру"
                            />
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
                    ) else (
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

// Вспомогательная функция для форматирования даты
function formatDateForBitrix(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
