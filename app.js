function App() {
    const [selectedStage, setSelectedStage] = React.useState('all');
    const [leadsData, setLeadsData] = React.useState(mockLeadsData);
    const [operatorsData, setOperatorsData] = React.useState(mockOperatorsData);
    const [isLoading, setIsLoading] = React.useState(false);
    const [lastSync, setLastSync] = React.useState(null);
    const [showConfigModal, setShowConfigModal] = React.useState(false);
    const [bitrixConfigured, setBitrixConfigured] = React.useState(false);
    
    // Глобальные переменные для фильтров дат
    window.currentStartDate = new Date();
    window.currentEndDate = new Date();

    const stages = [
        { id: 'callback', name: 'Перезвонить', color: 'text-blue-600' },
        { id: 'approval', name: 'На согласовании', color: 'text-yellow-600' },
        { id: 'invited', name: 'Приглашен к рекрутеру', color: 'text-green-600' }
    ];

    // Проверяем настройку Bitrix24 при загрузке
    React.useEffect(() => {
        const configured = loadBitrixConfig() && isBitrixConfigured();
        setBitrixConfigured(configured);
        loadDataFromDatabase();
    }, []);

    const loadDataFromDatabase = async () => {
        try {
            setIsLoading(true);
            const dbData = await syncWithBitrix24();
            
            setLeadsData(dbData.leadsCount);
            setOperatorsData(dbData.operatorsByStage);
            setLastSync(dbData.lastSync);
            
        } catch (error) {
            console.error('Error loading data:', error);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfigSave = () => {
        setBitrixConfigured(true);
        loadDataFromDatabase();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <div className="icon-bar-chart-3 text-xl text-white"></div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Дашборд лидов</h1>
                                <p className="text-gray-600 text-sm">Битрикс24 Аналитика</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {!bitrixConfigured && (
                                <button
                                    onClick={() => setShowConfigModal(true)}
                                    className="px-4 py-2 bg-orange-500 text-white rounded"
                                >
                                    Настроить Bitrix24
                                </button>
                            )}
                            <SyncStatus lastSync={lastSync} isLoading={isLoading} onSync={handleSync} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* ... остальной код без изменений ... */}
            </main>

            <BitrixConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                onSave={handleConfigSave}
            />
        </div>
    );
}
