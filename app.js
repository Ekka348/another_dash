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
        callback: [],
        approval: [],
        invited: []
    });
    const [dailyLeads, setDailyLeads] = React.useState({
        callback: Array(24).fill(0),
        approval: Array(24).fill(0),
        invited: Array(24).fill(0)
    });
    const [monthlyWeeksLeads, setMonthlyWeeksLeads] = React.useState({
        callback: [],
        approval: [],
        invited: []
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
                callback: [],
                approval: [],
                invited: []
            });
            setDailyLeads({
                callback: Array(24).fill(0),
                approval: Array(24).fill(0),
                invited: Array(24).fill(0)
            });
            setMonthlyWeeksLeads({
                callback: [],
                approval: [],
                invited: []
            });
        } finally {
            setIsLoading(false);
            setIsBackgroundLoading(false);
        }
    };
