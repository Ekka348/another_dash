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
                const config = JSON.parse(saved);
                setDomain(config.domain || '');
                setWebhook(config.webhook || '');
                setUserId(config.userId || '');
            }
        }
    }, [isOpen]);

    const testConnection = async () => {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Настройка Bitrix24</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Домен Bitrix24</label>
                        <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="ваша-компания.bitrix24.ru"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Webhook</label>
                        <input
                            type="text"
                            value={webhook}
                            onChange={(e) => setWebhook(e.target.value)}
                            placeholder="xxxxxxxxxxxxxxxxxxxx"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">ID пользователя (опционально)</label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="123"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                </div>

                {testResult && (
                    <div className={`mt-4 p-2 rounded ${
                        testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {testResult.message}
                    </div>
                )}

                <div className="flex justify-between mt-6">
                    <button
                        onClick={testConnection}
                        disabled={isTesting || !domain || !webhook}
                        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                    >
                        {isTesting ? 'Тестирование...' : 'Тестировать подключение'}
                    </button>
                    
                    <div className="space-x-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!testResult?.success}
                            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
                        >
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
