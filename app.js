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
    
    // Состояния для фильтров
    const [selectedOperator, setSelectedOperator] = React.useState(null);
    const [selectedDateRange, setSelectedDateRange] = React.useState('today');
    const [selectedChartType, setSelectedChartType] = React.useState('line');
    const [allOperators, setAllOperators] = React.useState([]);
    
    const stages = [
        { id: 'callback', name: 'Перезвонить', color: 'text-blue-600' },
        { id: 'approval', name: 'На согласовании', color: 'text-yellow-600' },
        { id: 'invited', name: 'Приглашен к рекрутеру', color: 'text-green-600' }
    ];

    const chartTypes = [
        { id: 'line', name: 'Линейный', icon: 'bar-chart-3' },
        { id: 'bar', name: 'Столбчатый', icon: 'bar-chart-4' },
        { id: 'doughnut', name: 'Круговая', icon: 'pie-chart' }
    ];

    const dateRanges = [
        { id: 'today', name: 'Сегодня' },
        { id: 'week', name: 'Неделя' },
        { id: 'month', name: 'Месяц' },
        { id: 'custom', name: 'Произвольный' }
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

    // Обновляем данные при изменении фильтров
    React.useEffect(() => {
        if (allOperators.length > 0) {
            loadDataFromDatabase(true);
        }
    }, [selectedOperator, selectedDateRange]);

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
            
            // Устанавливаем даты в зависимости от выбранного диапазона
            setDateRangeBasedOnSelection();
            
            const dbData = await syncWithBitrix24();
            
            if (dbData.operators) {
                setAllOperators(dbData.operators);
            }
            
            // Фильтруем данные по выбранному оператору
            let filteredData = dbData;
            if (selectedOperator) {
                filteredData = filterDataByOperator(dbData, selectedOperator);
            }
            
            setLeadsData(filteredData.leadsCount || { callback: 0, approval: 0, invited: 0 });
            setOperatorsData(filteredData.operatorsByStage || { callback: [], approval: [], invited: [] });
            
            if (filteredData.weeklyLeads) {
                const preparedData = prepareWeeklyChartData(filteredData.weeklyLeads);
                setWeeklyLeads(preparedData);
            }
            
            if (filteredData.dailyLeads) {
                const preparedData = prepareDailyChartData(filteredData.dailyLeads);
                setDailyLeads(preparedData);
            }
            
            // Загружаем данные по неделям месяца
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
            
            // Сбрасываем данные в случае ошибки
            setLeadsData({ callback: 0, approval: 0, invited: 0 });
            setOperatorsData({ callback: [], approval: [], invited: [] });
            setWeeklyLeads({ callback: Array(7).fill(0), approval: Array(7).fill(0), invited: Array(7).fill(0) });
            setDailyLeads({ callback: Array(13).fill(0), approval: Array(13).fill(0), invited: Array(13).fill(0) });
            setMonthlyWeeksLeads({ callback: Array(4).fill(0), approval: Array(4).fill(0), invited: Array(4).fill(0) });
        } finally {
            setIsLoading(false);
            setIsBackgroundLoading(false);
        }
    };

    const setDateRangeBasedOnSelection = () => {
        const today = new Date();
        let startDate, endDate;

        switch (selectedDateRange) {
            case 'today':
                startDate = new Date(today);
                endDate = new Date(today);
                break;
            case 'week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay() + 1);
                endDate = new Date(today);
                endDate.setDate(startDate.getDate() + 6);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'custom':
                // Для произвольного диапазона используем текущие даты из window
                return;
            default:
                startDate = new Date(today);
                endDate = new Date(today);
        }

        window.currentStartDate = startDate;
        window.currentEndDate = endDate;
    };

    const handleOperatorSelect = (operatorId) => {
        setSelectedOperator(operatorId);
    };

    const handleOperatorReset = () => {
        setSelectedOperator(null);
    };

    const handleDateRangeSelect = (rangeId) => {
        setSelectedDateRange(rangeId);
    };

    const handleChartTypeSelect = (typeId) => {
        setSelectedChartType(typeId);
    };

    const handleStageSelect = (stageId) => {
        setSelectedStage(stageId);
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
        
        const weeklyLeads = filterWeeklyDataByOperator(data.weeklyLeads, operatorId, data.leads);
        const dailyLeads = filterDailyDataByOperator(data.dailyLeads, operatorId, data.leads);
        
        return {
            ...data,
            leads: filteredLeads,
            leadsCount,
            operatorsByStage,
            weeklyLeads,
            dailyLeads
        };
    };

    const filterWeeklyDataByOperator = (weeklyData, operatorId, allLeads) => {
        if (!weeklyData) return {};
        
        const filteredWeeklyData = {};
        const operatorLeads = allLeads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
        
        Object.keys(weeklyData).forEach(date => {
            const dayLeads = operatorLeads.filter(lead => {
                const leadDate = new Date(lead.DATE_MODIFY).toISOString().split('T')[0];
                return leadDate === date;
            });
            
            filteredWeeklyData[date] = {
                callback: dayLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
                approval: dayLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
                invited: dayLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
            };
        });
        
        return filteredWeeklyData;
    };

    const filterDailyDataByOperator = (dailyData, operatorId, allLeads) => {
        if (!dailyData) return {};
        
        const filteredDailyData = {};
        const operatorLeads = allLeads.filter(lead => lead.ASSIGNED_BY_ID == operatorId);
        
        Object.keys(dailyData).forEach(hour => {
            const hourLeads = operatorLeads.filter(lead => {
                const leadHour = new Date(lead.DATE_MODIFY).getHours().toString().padStart(2, '0');
                return leadHour === hour;
            });
            
            filteredDailyData[hour] = {
                callback: hourLeads.filter(lead => lead.STATUS_ID === 'IN_PROCESS').length,
                approval: hourLeads.filter(lead => lead.STATUS_ID === 'UC_A2DF81').length,
                invited: hourLeads.filter(lead => lead.STATUS_ID === 'CONVERTED').length
            };
        });
        
        return filteredDailyData;
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
                const originalStartDate = window.currentStartDate;
                const originalEndDate = window.currentEndDate;
                
                window.currentStartDate = week.start;
                window.currentEndDate = week.end;
                
                const weekData = await syncWithBitrix24();
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
            return { callback: Array(4).fill(0), approval: Array(4).fill(0), invited: Array(4).fill(0) };
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
            setSelectedDateRange('custom');
            await loadDataFromDatabase();
        } catch (error) {
            console.error('Date filter error:', error);
            setSyncError(error.message);
        }
    };

    const getWeekDayLabels = () => {
        const days = [];
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(firstDayOfWeek);
            day.setDate(firstDayOfWeek.getDate() + i);
            days.push(day.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }));
        }
        
        return days;
    };

    const getHourLabels = () => {
        return Array.from({length: 13}, (_, i) => {
            const hour = i + 8;
            return `${hour.toString().padStart(2, '0')}:00`;
        });
    };

    const getWeeklyLabels = () => {
        return ['1-я неделя', '2-я неделя', '3-я неделя', '4-я неделя'];
    };

    const prepareWeeklyChartData = (weeklyLeadsData) => {
        const daysOrder = getCurrentWeekDays();
        const result = {
            callback: Array(7).fill(0),
            approval: Array(7).fill(0),
            invited: Array(7).fill(0)
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
            callback: Array(13).fill(0),
            approval: Array(13).fill(0),
            invited: Array(13).fill(0)
        };
        
        for (let hour = 8; hour <= 20; hour++) {
            const hourKey = hour.toString().padStart(2, '0');
            const index = hour - 8;
            
            if (dailyLeadsData[hourKey]) {
                result.callback[index] = dailyLeadsData[hourKey].callback || 0;
                result.approval[index] = dailyLeadsData[hourKey].approval || 0;
                result.invited[index] = dailyLeadsData[hourKey].invited || 0;
            }
        }
        
        return result;
    };

    const getCurrentWeekDays = () => {
        const days = [];
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(firstDayOfWeek);
            day.setDate(firstDayOfWeek.getDate() + i);
            days.push(formatDateForBitrix(day));
        }
        
        return days;
    };

    const formatDateForBitrix = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Функция для получения данных для текущего выбранного графика
    const getChartDataForSelectedStage = () => {
        switch (selectedDateRange) {
            case 'today':
                return {
                    callback: dailyLeads.callback,
                    approval: dailyLeads.approval,
                    invited: dailyLeads.invited
                };
            case 'week':
                return {
                    callback: weeklyLeads.callback,
                    approval: weeklyLeads.approval,
                    invited: weeklyLeads.invited
                };
            case 'month':
                return monthlyWeeksLeads;
            default:
                return {
                    callback: dailyLeads.callback,
                    approval: dailyLeads.approval,
                    invited: dailyLeads.invited
                };
        }
    };

    const getChartLabelsForSelectedRange = () => {
        switch (selectedDateRange) {
            case 'today':
                return getHourLabels();
            case 'week':
                return getWeekDayLabels();
            case 'month':
                return getWeeklyLabels();
            default:
                return getHourLabels();
        }
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

                {/* Панель фильтров */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Фильтры и настройки</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Фильтр по оператору */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Оператор</label>
                            <select
                                value={selectedOperator || ''}
                                onChange={(e) => handleOperatorSelect(e.target.value || null)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading || allOperators.length === 0}
                            >
                                <option value="">Все операторы</option>
                                {allOperators.map(operator => (
                                    <option key={operator.ID} value={operator.ID}>
                                        {operator.FULL_NAME} ({operator.DEPARTMENT})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Фильтр по периоду */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Период</label>
                            <select
                                value={selectedDateRange}
                                onChange={(e) => handleDateRangeSelect(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            >
                                {dateRanges.map(range => (
                                    <option key={range.id} value={range.id}>
                                        {range.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Фильтр по типу графика */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Тип графика</label>
                            <select
                                value={selectedChartType}
                                onChange={(e) => handleChartTypeSelect(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            >
                                {chartTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Кнопка сброса */}
                        <div className="flex items-end">
                            <button
                                onClick={handleOperatorReset}
                                disabled={(!selectedOperator && selectedDateRange === 'today' && selectedChartType === 'line') || isLoading}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2 w-full justify-center"
                            >
                                <div className="icon-refresh-ccw text-sm"></div>
                                Сбросить фильтры
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
                        onClick={() => handleStageSelect('callback')}
                        isSelected={selectedStage === 'callback'}
                    />
                    <MetricCard 
                        title="На согласовании"
                        value={leadsData.approval || 0}
                        icon="clock"
                        color="yellow"
                        trend={-3}
                        onClick={() => handleStageSelect('approval')}
                        isSelected={selectedStage === 'approval'}
                    />
                    <MetricCard 
                        title="Приглашен к рекрутеру"
                        value={leadsData.invited || 0}
                        icon="user-check"
                        color="green"
                        trend={+8}
                        onClick={() => handleStageSelect('invited')}
                        isSelected={selectedStage === 'invited'}
                    />
                </div>

                {/* Основной график с фильтрами */}
                <div className="dashboard-card mb-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 lg:mb-0">
                            {selectedDateRange === 'today' && 'График за сегодня'}
                            {selectedDateRange === 'week' && 'График за неделю'}
                            {selectedDateRange === 'month' && 'График за месяц'}
                            {selectedDateRange === 'custom' && 'График за выбранный период'}
                        </h2>
                        
                        <div className="flex gap-2">
                            {stages.map(stage => (
                                <button
                                    key={stage.id}
                                    onClick={() => handleStageSelect(stage.id)}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                        selectedStage === stage.id || selectedStage === 'all'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {stage.name}
                                </button>
                            ))}
                            <button
                                onClick={() => handleStageSelect('all')}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    selectedStage === 'all'
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Все
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {(selectedStage === 'all' || selectedStage === 'callback') && (
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type={selectedChartType}
                                    data={getChartDataForSelectedStage().callback}
                                    labels={getChartLabelsForSelectedRange()}
                                    color="#2563eb"
                                    title="Перезвонить"
                                />
                            </div>
                        )}
                        
                        {(selectedStage === 'all' || selectedStage === 'approval') && (
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type={selectedChartType}
                                    data={getChartDataForSelectedStage().approval}
                                    labels={getChartLabelsForSelectedRange()}
                                    color="#f59e0b"
                                    title="На согласовании"
                                />
                            </div>
                        )}
                        
                        {(selectedStage === 'all' || selectedStage === 'invited') && (
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type={selectedChartType}
                                    data={getChartDataForSelectedStage().invited}
                                    labels={getChartLabelsForSelectedRange()}
                                    color="#10b981"
                                    title="Приглашен к рекрутеру"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Дополнительные графики */}
                {selectedDateRange !== 'today' && (
                    <div className="dashboard-card mb-8">
                        <h2 className="text-xl font-semibold mb-6 text-gray-900">Графики за текущий день (8:00-20:00)</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type="line" 
                                    data={dailyLeads.callback}
                                    labels={getHourLabels()}
                                    color="#2563eb"
                                    title="Перезвонить"
                                />
                            </div>
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type="line" 
                                    data={dailyLeads.approval}
                                    labels={getHourLabels()}
                                    color="#f59e0b"
                                    title="На согласовании"
                                />
                            </div>
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type="line" 
                                    data={dailyLeads.invited}
                                    labels={getHourLabels()}
                                    color="#10b981"
                                    title="Приглашен к рекрутеру"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectedDateRange !== 'week' && (
                    <div className="dashboard-card mb-8">
                        <h2 className="text-xl font-semibold mb-6 text-gray-900">Графики за текущую неделю</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type="line" 
                                    data={weeklyLeads.callback}
                                    labels={getWeekDayLabels()}
                                    color="#2563eb"
                                    title="Перезвонить"
                                />
                            </div>
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type="line" 
                                    data={weeklyLeads.approval}
                                    labels={getWeekDayLabels()}
                                    color="#f59e0b"
                                    title="На согласовании"
                                />
                            </div>
                            <div className="dashboard-card">
                                <LeadsChart 
                                    type="line" 
                                    data={weeklyLeads.invited}
                                    labels={getWeekDayLabels()}
                                    color="#10b981"
                                    title="Приглашен к рекрутеру"
                                />
                            </div>
                        </div>
                    </div>
                )}

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
                datasets: [{
                    label: title,
                    data: data,
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1,
                    borderRadius: 6,
                    hoverBackgroundColor: color + 'CC'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y}` } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.1)' }, ticks: { stepSize: Math.max(1, Math.floor(Math.max(...data) / 5)) || 1 } },
                    x: { grid: { color: 'rgba(0, 0, 0, 0.1)' } }
                }
            }
        };

        chartInstance.current = new ChartJS(ctx, config);
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
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

    return <div className="h-48" data-name="weekly-comparison-chart"><canvas ref={chartRef}></canvas></div>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);
