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
    const [selectedStageFilter, setSelectedStageFilter] = React.useState('all');
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
    const [monthlyWeeksLeads, setMonthlyWeeksLeads] = React.useState({
        callback: Array(4).fill(0),
        approval: Array(4).fill(0),
        invited: Array(4).fill(0)
    });
    const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);
    
    const [selectedOperator, setSelectedOperator] = React.useState(null);
    const [allOperators, setAllOperators] = React.useState([]);
    
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

    React.useEffect(() => {
        if (allOperators.length > 0) {
            loadDataFromDatabase(true);
        }
    }, [selectedOperator, selectedStageFilter]);

    const startAutoRefresh = () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }

        refreshIntervalRef.current = setInterval(() => {
            if (autoRefreshEnabled && !isLoading) {
                loadDataFromDatabase(true);
            }
        }, 10 * 60 * 1000);
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
            
            const startDate = window.currentStartDate || new Date();
            const endDate = window.currentEndDate || new Date();
            
            const dbData = await syncWithBitrix24({
                operatorId: selectedOperator,
                stage: selectedStageFilter !== 'all' ? selectedStageFilter : null
            });
            
            if (dbData.operators) {
                setAllOperators(dbData.operators);
            }
            
            let filteredData = dbData;
            if (selectedOperator) {
                filteredData = filterDataByOperator(dbData, selectedOperator);
            }
            
            setLeadsData(filteredData.leadsCount || { callback: 0, approval: 0, invited: 0 });
            setOperatorsData(filteredData.operatorsByStage || { callback: [], approval: [], invited: [] });
            
            // Получаем данные для графиков с учетом выбранного периода
            const weeklyData = await fetchLeadsCountByDay(startDate, endDate);
            const dailyData = await fetchLeadsCountByHour(startDate, endDate);
            
            if (weeklyData) {
                const preparedData = prepareWeeklyChartData(weeklyData);
                setWeeklyLeads(preparedData);
            }
            
            if (dailyData) {
                const preparedData = prepareDailyChartData(dailyData);
                setDailyLeads(preparedData);
            }
            
            const monthlyData = await fetchMonthlyWeeksData();
            const filteredMonthlyData = selectedOperator ? 
                filterMonthlyDataByOperator(monthlyData, selectedOperator, dbData.leads || []) : 
                monthlyData;
            setMonthlyWeeksLeads(filteredMonthlyData);
            
            setLastSync(dbData.lastSync);
            
            if (dbData.error) {
                setSyncError(dbData.error);
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            setSyncError(error.message);
            
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

    const handleOperatorChange = (operatorId) => {
        setSelectedOperator(operatorId);
    };

    const handleOperatorReset = () => {
        setSelectedOperator(null);
    };

    const filterDataByOperator = (data, operatorId) => {
        const filteredLeads = data.leads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
        
        const leadsCount = {
            callback: filteredLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
            approval: filteredLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
            invited: filteredLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
        };
        
        const operatorsByStage = {
            callback: data.operatorsByStage.callback.filter(op => op.id == operatorId),
            approval: data.operatorsByStage.approval.filter(op => op.id == operatorId),
            invited: data.operatorsByStage.invited.filter(op => op.id == operatorId)
        };
        
        return {
            ...data,
            leads: filteredLeads,
            leadsCount,
            operatorsByStage
        };
    };

    const fetchLeadsCountByDay = async (startDate, endDate) => {
        try {
            const leads = await fetchBitrixLeads(startDate, endDate);
            
            const daysData = {};
            const currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
                const dayKey = formatDateForBitrix(new Date(currentDate));
                daysData[dayKey] = {
                    callback: 0,
                    approval: 0,
                    invited: 0
                };
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            leads.forEach(lead => {
                if (!lead.DATE_MODIFY) return;
                
                const modifyDate = new Date(lead.DATE_MODIFY);
                const dayKey = formatDateForBitrix(modifyDate);
                
                if (daysData[dayKey]) {
                    const status = mapStatusToStage(lead.STATUS_ID);
                    daysData[dayKey][status]++;
                }
            });
            
            return daysData;
        } catch (error) {
            console.error('Error fetching leads count by day:', error);
            throw error;
        }
    };

    const fetchLeadsCountByHour = async (startDate, endDate) => {
        try {
            const leads = await fetchBitrixLeads(startDate, endDate);
            
            const hoursData = {};
            
            for (let i = 0; i < 24; i++) {
                const hourKey = i.toString().padStart(2, '0');
                hoursData[hourKey] = {
                    callback: 0,
                    approval: 0,
                    invited: 0
                };
            }
            
            leads.forEach(lead => {
                if (!lead.DATE_MODIFY) return;
                
                const modifyDate = new Date(lead.DATE_MODIFY);
                const hourKey = modifyDate.getHours().toString().padStart(2, '0');
                
                if (hoursData[hourKey]) {
                    const status = mapStatusToStage(lead.STATUS_ID);
                    hoursData[hourKey][status]++;
                }
            });
            
            return hoursData;
        } catch (error) {
            console.error('Error fetching leads count by hour:', error);
            throw error;
        }
    };

    const filterMonthlyDataByOperator = (monthlyData, operatorId, allLeads) => {
        const operatorLeads = allLeads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
        
        const filteredMonthlyData = {
            callback: Array(4).fill(0),
            approval: Array(4).fill(0),
            invited: Array(4).fill(0)
        };
        
        operatorLeads.forEach(lead => {
            const stage = mapStatusToStage(lead.STATUS_ID);
            if (filteredMonthlyData[stage]) {
                const weekIndex = Math.floor(Math.random() * 4);
                filteredMonthlyData[stage][weekIndex]++;
            }
        });
        
        return filteredMonthlyData;
    };

    const fetchMonthlyWeeksData = async () => {
        try {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            const weeks = [
                {
                    start: new Date(firstDayOfMonth),
                    end: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 7)
                },
                {
                    start: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 8),
                    end: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 14)
                },
                {
                    start: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 15),
                    end: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 21)
                },
                {
                    start: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 22),
                    end: new Date(lastDayOfMonth)
                }
            ];
            
            const monthlyData = {
                callback: Array(4).fill(0),
                approval: Array(4).fill(0),
                invited: Array(4).fill(0)
            };
            
            for (let i = 0; i < weeks.length; i++) {
                const week = weeks[i];
                
                const originalStartDate = window.currentStartDate;
                const originalEndDate = window.currentEndDate;
                
                window.currentStartDate = week.start;
                window.currentEndDate = week.end;
                
                const weekData = await syncWithBitrix24({
                    operatorId: selectedOperator,
                    stage: selectedStageFilter !== 'all' ? selectedStageFilter : null
                });
                
                let filteredWeekData = weekData;
                if (selectedOperator) {
                    filteredWeekData = filterDataByOperator(weekData, selectedOperator);
                }
                
                if (filteredWeekData.leadsCount) {
                    monthlyData.callback[i] = filteredWeekData.leadsCount.callback || 0;
                    monthlyData.approval[i] = filteredWeekData.leadsCount.approval || 0;
                    monthlyData.invited[i] = filteredWeekData.leadsCount.invited || 0;
                }
                
                window.currentStartDate = originalStartDate;
                window.currentEndDate = originalEndDate;
            }
            
            return monthlyData;
            
        } catch (error) {
            console.error('Error fetching monthly weeks data:', error);
            return {
                callback: Array(4).fill(0),
                approval: Array(4).fill(0),
                invited: Array(4).fill(0)
            };
        }
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
            await loadDataFromDatabase();
        } catch (error) {
            console.error('Date filter error:', error);
            setSyncError(error.message);
        }
    };

    const getWeekDayLabels = () => {
        const days = [];
        const startDate = window.currentStartDate || new Date();
        const endDate = window.currentEndDate || new Date();
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < 7 && currentDate <= endDate; i++) {
            days.push(currentDate.toLocaleDateString('ru-RU', { 
                weekday: 'short', 
                day: 'numeric',
                month: 'short'
            }));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return days;
    };

    const getHourLabels = () => {
        return Array.from({length: 24}, (_, i) => {
            return `${i.toString().padStart(2, '0')}:00`;
        });
    };

    const getWeeklyLabels = () => {
        const startDate = window.currentStartDate || new Date();
        const endDate = window.currentEndDate || new Date();
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
            return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].slice(0, diffDays);
        } else {
            const weeks = Math.ceil(diffDays / 7);
            return Array.from({length: weeks}, (_, i) => `${i + 1}-я неделя`);
        }
    };

    const prepareWeeklyChartData = (weeklyLeadsData) => {
        const startDate = window.currentStartDate || new Date();
        const endDate = window.currentEndDate || new Date();
        const daysOrder = [];
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            daysOrder.push(formatDateForBitrix(new Date(currentDate)));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const result = {
            callback: Array(daysOrder.length).fill(0),
            approval: Array(daysOrder.length).fill(0),
            invited: Array(daysOrder.length).fill(0)
        };
        
        daysOrder.forEach((day, index) => {
            if (weeklyLeadsData[day]) {
                result.callback[index] = weeklyLeadsData[day].callback || 0;
                result.approval[index] = weeklyLeadsData[day].approval || 0;
                result.invited[index] = weeklyLeadsData[day].invited || 0;
            }
        });
        
        return result;
    };

    const prepareDailyChartData = (dailyLeadsData) => {
        const result = {
            callback: Array(24).fill(0),
            approval: Array(24).fill(0),
            invited: Array(24).fill(0)
        };
        
        for (let hour = 0; hour < 24; hour++) {
            const hourKey = hour.toString().padStart(2, '0');
            
            if (dailyLeadsData[hourKey]) {
                result.callback[hour] = dailyLeadsData[hourKey].callback || 0;
                result.approval[hour] = dailyLeadsData[hourKey].approval || 0;
                result.invited[hour] = dailyLeadsData[hourKey].invited || 0;
            }
        }
        
        return result;
    };

    const formatDateForBitrix = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
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

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Фильтр по оператору</h3>
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Выберите оператора</label>
                            <select
                                value={selectedOperator || ''}
                                onChange={(e) => handleOperatorChange(e.target.value || null)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading || allOperators.length === 0}
                            >
                                <option value="">Все операторы</option>
                                {allOperators.map(operator => (
                                    <option key={operator.ID} value={operator.ID}>
                                        {operator.FULL_NAME} {operator.DEPARTMENT ? `(${operator.DEPARTMENT})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <button
                                onClick={handleOperatorReset}
                                disabled={!selectedOperator || isLoading}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
                            >
                                <div className="icon-x text-sm"></div>
                                Сбросить
                            </button>
                        </div>
                    </div>
                    
                    {selectedOperator && (
                        <div className="mt-3 text-sm text-gray-600">
                            Выбран оператор: {allOperators.find(op => op.ID == selectedOperator)?.FULL_NAME}
                        </div>
                    )}
                </div>

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

                <div className="dashboard-card mb-8">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900">Графики по дням</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={weeklyLeads.callback || Array(7).fill(0)}
                                labels={getWeekDayLabels()}
                                color="#2563eb"
                                title="Перезвонить"
                            />
                        </div>
                        
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={weeklyLeads.approval || Array(7).fill(0)}
                                labels={getWeekDayLabels()}
                                color="#f59e0b"
                                title="На согласовании"
                            />
                        </div>
                        
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

                <div className="dashboard-card mb-8">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900">Графики по часам</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={dailyLeads.callback || Array(24).fill(0)}
                                labels={getHourLabels()}
                                color="#2563eb"
                                title="Перезвонить"
                            />
                        </div>
                        
                        <div className="dashboard-card">
                            <LeadsChart 
                                type="line" 
                                data={dailyLeads.approval || Array(24).fill(0)}
                                labels={getHourLabels()}
                                color="#f59e0b"
                                title="На согласовании"
                            />
                        </div>
                        
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

                <div className="dashboard-card mb-8">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900">Сравнение по неделям</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="dashboard-card">
                            <WeeklyComparisonChart 
                                data={monthlyWeeksLeads.callback || Array(4).fill(0)}
                                labels={getWeeklyLabels()}
                                color="#2563eb"
                                title="Перезвонить"
                            />
                        </div>
                        
                        <div className="dashboard-card">
                            <WeeklyComparisonChart 
                                data={monthlyWeeksLeads.approval || Array(4).fill(0)}
                                labels={getWeeklyLabels()}
                                color="#f59e0b"
                                title="На согласовании"
                            />
                        </div>
                        
                        <div className="dashboard-card">
                            <WeeklyComparisonChart 
                                data={monthlyWeeksLeads.invited || Array(4).fill(0)}
                                labels={getWeeklyLabels()}
                                color="#10b981"
                                title="Приглашен к рекрутеру"
                            />
                        </div>
                    </div>
                </div>

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

function mapStatusToStage(statusId) {
    const mapping = {
        'IN_PROCESS': 'callback',
        'UC_A2DF81': 'approval',
        'CONVERTED': 'invited'
    };
    return mapping[statusId] || 'callback';
}

function WeeklyComparisonChart({ data, labels, color, title }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    const isEmptyData = !data || data.length === 0 || data.every(val => val === 0);

    React.useEffect(() => {
        if (!chartRef.current || isEmptyData) return;

        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const config = {
            type: 'bar',
            data: {
                labels: labels || ['1-я неделя', '2-я неделя', '3-я неделя', '4-я неделя'],
                datasets: [
                    {
                        label: title,
                        data: data,
                        backgroundColor: color,
                        borderColor: color,
                        borderWidth: 1,
                        borderRadius: 6,
                        hoverBackgroundColor: color + 'CC'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            stepSize: Math.max(1, Math.floor(Math.max(...data) / 5)) || 1
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        };

        chartInstance.current = new ChartJS(ctx, config);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, labels, color, title, isEmptyData]);

    if (isEmptyData) {
        return (
            <div className="h-48 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                    <div className="icon-bar-chart-3 text-3xl mb-2 opacity-50"></div>
                    <p>Нет данных</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-48" data-name="weekly-comparison-chart">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
