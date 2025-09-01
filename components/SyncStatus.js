function SyncStatus({ lastSync, isLoading, onSync, usingMockData }) {
    try {
        const formatSyncTime = (timestamp) => {
            if (!timestamp) return 'Никогда';
            try {
                const date = new Date(timestamp);
                return date.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return 'Ошибка даты';
            }
        };

        return (
            <div className="flex items-center gap-3" data-name="sync-status">
                
                <button
                    onClick={onSync}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isLoading 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                >
                    <div className={`icon-refresh-cw text-sm ${isLoading ? 'animate-spin' : ''}`}></div>
                    {isLoading ? 'Синхронизация...' : 'Обновить'}
                </button>
                
                <div className="text-xs text-gray-600">
                    Обновлено: {formatSyncTime(lastSync)}
                </div>
            </div>
        );
    } catch (error) {
        console.error('SyncStatus component error:', error);
        return null;
    }
}
