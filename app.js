// app.js
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
    const [selectedOperator, setSelectedOperator] = React.useState(null);
    const [leadsData, setLeadsData] = React.useState({ callback: 0, approval: 0, invited: 0 });
    const [operatorsData, setOperatorsData] = React.useState({ callback: [], approval: [], invited: [] });
    const [allOperators, setAllOperators] = React.useState([]);
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
        callback: Array(13).fill(0),
        approval: Array(13).fill(0),
        invited: Array(13).fill(0)
    });
    const [monthlyWeeksLeads, setMonthlyWeeksLeads] = React.useState({
        callback: Array(4).fill(0),
        approval: Array(4).fill(0),
        invited: Array(4).fill(0)
    });
    const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);
    
    const stages = [
        { id: 'callback', name: 'Перезвонить', color: 'text-blue-600' },
        { id: 'approval', name: 'На согласовании', color: 'text-yellow-600' },
        { id: 'invited', name: 'Приглашен к рекрутеру', color: 'text-green-600' }
    ];

    const refreshIntervalRef = React.useRef(null);

    React.useEffect(() => {
        loadBitrixConfig();
        loadDataFromDatabase();
        startAutoRefresh();

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    const startAutoRefresh = () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }

        refreshIntervalRef.current = setInterval(() => {
            if (autoRefreshEnabled && !isLoading) {
                loadDataFromDatabase(true);
            }
        }, 2 * 60 * 1000);
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
            setAllOperators(dbData.operators || []);
            
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
            
            if (dbData.dailyLeads) {
                const preparedData = prepareDailyChartData(dbData.dailyLeads);
                setDailyLeads(preparedData);
            } else {
                setDailyLeads({
                    callback: Array(13).fill(0),
                    approval: Array(13).fill(0),
                    invited: Array(13).fill(0)
                });
            }
            
            // Загружаем данные по неделям месяца
            const monthlyData = await fetchMonthlyWeeksData();
            setMonthlyWeeksLeads(monthlyData);
            
            setLastSync(dbData.lastSync);
            
            if (dbData.error) {
                setSyncError(dbData.error);
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            setSyncError(error.message);
            
            setLeadsData({ callback: 0, approval: 0, invited: 0 });
            setOperatorsData({ callback: [], approval: [], invited: [] });
            setAllOperators([]);
            setWeeklyLeads({
                callback: Array(7).fill(0),
                approval: Array(7).fill(0),
                invited: Array(7).fill(0)
            });
            setDailyLeads({
                callback: Array(13).fill(0),
                approval: Array(13).fill(0),
                invited: Array(13).fill(0)
            });
            setMonthlyWeeksLeads({
                callback: Array(4).fill(0),
                approval: Array(4).fill(0),
                invited: Array(4).fill(0)
            });
        } finally {
            setIsLoading(false);
            setIsBackgroundLoading(false);
        }
    };

    const loadOperatorData = async (operatorId) => {
        try {
            setIsLoading(true);
            setSyncError(null);
            
            if (!operatorId) {
                // Сброс фильтра - загружаем все данные
                await loadDataFromDatabase();
                return;
            }

            // Загружаем данные только для выбранного оператора
            const operatorData = await fetchOperatorSpecificData(operatorId);
            
            setLeadsData(operatorData.leadsCount || { callback: 0, approval: 0, invited: 0 });
            setWeeklyLeads(operatorData.weeklyLeads || {
                callback: Array(7).fill(0),
                approval: Array(7).fill(0),
                invited: Array(7).fill(0)
            });
            setDailyLeads(operatorData.dailyLeads || {
                callback: Array(13).fill(0),
                approval: Array(13).fill(0),
                invited: Array(13).fill(0)
            });
            setMonthlyWeeksLeads(operatorData.monthlyWeeksLeads || {
                callback: Array(4).fill(0),
                approval: Array(4).fill(0),
                invited: Array(4).fill(0)
            });
            
        } catch (error) {
            console.error('Error loading operator data:', error);
            setSyncError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOperatorSpecificData = async (operatorId) => {
        try {
            // Сохраняем оригинальные даты
            const originalStartDate = window.currentStartDate;
            const originalEndDate = window.currentEndDate;
            
            // Получаем данные для оператора
            const operatorLeads = await fetchBitrixLeadsForOperator(operatorId, originalStartDate, originalEndDate);
            
            // Обрабатываем данные для графиков
            const processedData = processLeadsData(operatorLeads, allOperators);
            
            // Получаем данные за неделю для оператора
            const weeklyData = await fetchWeeklyLeadsDataForOperator(operatorId);
            
            // Получаем данные за день для оператора
            const dailyData = await fetchDailyLeadsDataForOperator(operatorId);
            
            // Получаем данные по неделям месяца для оператора
            const monthlyData = await fetchMonthlyWeeksDataForOperator(operatorId);
            
            return {
                leadsCount: processedData.leadsCount,
                weeklyLeads: weeklyData,
                dailyLeads: dailyData,
                monthlyWeeksLeads: monthlyData
            };
            
        } catch (error) {
            console.error('Error fetching operator specific data:', error);
            throw error;
        }
    };

    const fetchBitrixLeadsForOperator = async (operatorId, startDate, endDate) => {
        try {
            const leads = await bitrixApiCall('crm.lead.list', {
                select: ['ID', 'TITLE', 'STATUS_ID', 'ASSIGNED_BY_ID', 'DATE_MODIFY', 'DATE_CREATE'],
                filter: {
                    'STATUS_ID': Object.keys(STATUS_MAP),
                    'ASSIGNED_BY_ID': operatorId,
                    '>=DATE_MODIFY': `${formatDateForBitrix(startDate)} 00:00:00`,
                    '<=DATE_MODIFY': `${formatDateForBitrix(endDate)} 23:59:59`
                },
                order: { "DATE_MODIFY": "ASC" }
            });

            return leads.map(lead => ({
                ID: lead.ID,
                TITLE: lead.TITLE || `Лид #${lead.ID}`,
                STATUS_ID: lead.STATUS_ID,
                ASSIGNED_BY_ID: lead.ASSIGNED_BY_ID,
                DATE_MODIFY: lead.DATE_MODIFY,
                DATE_CREATE: lead.DATE_CREATE
            }));
        } catch (error) {
            console.error('Error fetching operator leads:', error);
            return [];
        }
    };

    const fetchWeeklyLeadsDataForOperator = async (operatorId) => {
        try {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1);
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const leads = await fetchBitrixLeadsForOperator(operatorId, startOfWeek, endOfWeek);
            return prepareWeeklyChartDataForOperator(leads, startOfWeek, endOfWeek);
        } catch (error) {
            console.error('Error fetching weekly data for operator:', error);
            return {
                callback: Array(7).fill(0),
                approval: Array(7).fill(0),
                invited: Array(7).fill(0)
            };
        }
    };

    const fetchDailyLeadsDataForOperator = async (operatorId) => {
        try {
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);
            
            const leads = await fetchBitrixLeadsForOperator(operatorId, startOfDay, endOfDay);
            return prepareDailyChartDataForOperator(leads);
        } catch (error) {
            console.error('Error fetching daily data for operator:', error);
            return {
                callback: Array(13).fill(0),
                approval: Array(13).fill(0),
                invited: Array(13).fill(0)
            };
        }
    };

    const fetchMonthlyWeeksDataForOperator = async (operatorId) => {
        try {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            const weeks = [
                { start: new Date(firstDayOfMonth), end: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 7) },
                { start: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 8), end: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 14) },
                { start: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 15), end: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 21) },
                { start: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 22), end: new Date(lastDayOfMonth) }
            ];
            
            const monthlyData = {
                callback: Array(4).fill(0),
                approval: Array(4).fill(0),
                invited: Array(4).fill(0)
            };
            
            for (let i = 0; i < weeks.length; i++) {
                const week = weeks[i];
                const leads = await fetchBitrixLeadsForOperator(operatorId, week.start, week.end);
                
                const weekData = processLeadsData(leads, allOperators);
                monthlyData.callback[i] = weekData.leadsCount.callback || 0;
                monthlyData.approval[i] = weekData.leadsCount.approval || 0;
                monthlyData.invited[i] = weekData.leadsCount.invited || 0;
            }
            
            return monthlyData;
            
        } catch (error) {
            console.error('Error fetching monthly weeks data for operator:', error);
            return {
                callback: Array(4).fill(0),
                approval: Array(4).fill(0),
                invited: Array(4).fill(0)
            };
        }
    };

    const prepareWeeklyChartDataForOperator = (leads, startOfWeek, endOfWeek) => {
        const result = {
            callback: Array(7).fill(0),
            approval: Array(7).fill(0),
            invited: Array(7).fill(0)
        };
        
        const currentDate = new Date(startOfWeek);
        
        while (currentDate <= endOfWeek) {
            const dayKey = formatDateForBitrix(new Date(currentDate));
            const dayIndex = Math.floor((currentDate - startOfWeek) / (1000 * 60 * 60 * 24));
            
            leads.forEach(lead => {
                if (!lead.DATE_MODIFY) return;
                
                const modifyDate = new Date(lead.DATE_MODIFY);
                const modifyDayKey = formatDateForBitrix(modifyDate);
                
                if (modifyDayKey === dayKey) {
                    const status = mapStatusToStage(lead.STATUS_ID);
                    result[status][dayIndex]++;
                }
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return result;
    };

    const prepareDailyChartDataForOperator = (leads) => {
        const result = {
            callback: Array(13).fill(0),
            approval: Array(13).fill(0),
            invited: Array(13).fill(0)
        };
        
        leads.forEach(lead => {
            if (!lead.DATE_MODIFY) return;
            
            const modifyDate = new Date(lead.DATE_MODIFY);
            const hour = modifyDate.getHours();
            
            if (hour >= 8 && hour <= 20) {
                const status = mapStatusToStage(lead.STATUS_ID);
                result[status][hour - 8]++;
            }
        });
        
        return result;
    };

    const fetchMonthlyWeeksData = async () => {
        // ... существующий код без изменений ...
    };

    const handleSync = async () => {
        try {
            await loadDataFromDatabase(false);
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
            
            if (selectedOperator) {
                await loadOperatorData(selectedOperator);
            } else {
                await loadDataFromDatabase();
            }
        } catch (error) {
            console.error('Date filter error:', error);
            setSyncError(error.message);
        }
    };

    const handleOperatorChange = (operatorId) => {
        setSelectedOperator(operatorId);
        if (operatorId) {
            loadOperatorData(operatorId);
        } else {
            loadDataFromDatabase();
        }
    };

    const getWeekDayLabels = () => {
        // ... существующий код без изменений ...
    };

    const getHourLabels = () => {
        // ... существующий код без изменений ...
    };

    const getWeeklyLabels = () => {
        // ... существующий код без изменений ...
    };

    const prepareWeeklyChartData = (weeklyLeadsData) => {
        // ... существующий код без изменений ...
    };

    const prepareDailyChartData = (dailyLeadsData) => {
        // ... существующий код без изменений ...
    };

    const getCurrentWeekDays = () => {
        // ... существующий код без изменений ...
    };

    const formatDateForBitrix = (date) => {
        // ... существующий код без изменений ...
    };

    return (
        <div className="min-h-screen bg-gray-50">
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

                <DateFilter onApply={handleDateFilterApply} isLoading={isLoading} />

                {/* Селектор выбора оператора */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Выберите оператора
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedOperator || ''}
                                    onChange={(e) => handleOperatorChange(e.target.value || null)}
                                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isLoading}
                                >
                                    <option value="">Все операторы</option>
                                    {allOperators.map(operator => (
                                        <option key={operator.ID} value={operator.ID}>
                                            {operator.FULL_NAME} ({operator.DEPARTMENT})
                                        </option>
                                    ))}
                                </select>
                                {selectedOperator && (
                                    <button
                                        onClick={() => handleOperatorChange(null)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                                        disabled={isLoading}
                                    >
                                        <div className="icon-x text-sm"></div>
                                        Сбросить
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {selectedOperator && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                            <div className="icon-user text-blue-600"></div>
                            <span className="text-blue-800 font-medium">
                                Показаны данные для: {allOperators.find(op => op.ID == selectedOperator)?.FULL_NAME}
                            </span>
                        </div>
                    </div>
                )}

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

                {/* Остальные графики остаются без изменений */}
                {/* ... существующий код графиков ... */}

            </main>

            {/* Остальной код без изменений */}
        </div>
    );
}

// Остальные компоненты без изменений
