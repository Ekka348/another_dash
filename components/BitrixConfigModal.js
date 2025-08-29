function BitrixConfigModal({ isOpen, onClose, onSave }) {
    const [domain, setDomain] = React.useState('');
    const [webhook, setWebhook] = React.useState('');
    const [userId, setUserId] = React.useState('');
    const [isTesting, setIsTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState(null);

    React.useEffect(() => {
        // Загружаем сохраненные настройки при открытии
        if (isOpen) {
            const saved = localStorage.getItem('bitrix_config');
            if (saved) {
                try {
                    const config = JSON.parse(saved);
                    setDomain(config.domain || '');
                    setWebhook(config.webhook || '');
                    setUserId(config.userId || '');
                } catch (error) {
                    console.error('Error parsing saved config:', error);
                }
            }
        }
    }, [isOpen]);

    const testConnection = async () => {
        if (!domain || !webhook) {
            setTestResult({
                success: false,
                message: 'Заполните домен и webhook'
            });
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        
        try {
            // Сохраняем временно для теста
            setBitrixConfig(domain, webhook, userId);
            
            // Тестируем подключение
            const users = await fetchBitrixUsers();
            setTestResult({
                success: true,
                message: `Успешно! Найдено ${users.length} пользователей`
            });
        } catch (error) {
            setTestResult({
                success: false,
                message: `Ошибка: ${error.message}`
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = () => {
        setBitrixConfig(domain, webhook, userId);
        onSave();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Настройка Bitrix24</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Домен Bitrix24</label>
                        <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="ваша-компания.bitrix24.ru"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Например: company.bitrix24.ru</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Webhook</label>
                        <input
                            type="text"
                            value={webhook}
                            onChange={(e) => setWebhook(e.target.value)}
                            placeholder="xxxxxxxxxxxxxxxxxxxx"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ключ вебхука из раздела Приложения</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">ID пользователя (опционально)</label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="123"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {testResult && (
                    <div className={`mt-4 p-3 rounded ${
                        testResult.success 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            <div className={`icon-${testResult.success ? 'check-circle' : 'x-circle'} text-sm`}></div>
                            <span className="text-sm">{testResult.message}</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
                    <button
                        onClick={testConnection}
                        disabled={isTesting || !domain || !webhook}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors ${
                            isTesting || !domain || !webhook
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                        <div className={`icon-wifi text-sm ${isTesting ? 'animate-pulse' : ''}`}></div>
                        {isTesting ? 'Тестирование...' : 'Тестировать подключение'}
                    </button>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!testResult?.success}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
