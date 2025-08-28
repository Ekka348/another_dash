function SyncStatus({ lastSync, isLoading, onSync }) {
  try {
    const formatSyncTime = (timestamp) => {
      if (!timestamp) return 'Никогда';
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU');
    };

    return (
      <div className="flex items-center gap-3" data-name="sync-status" data-file="components/SyncStatus.js">
        <button
          onClick={onSync}
          disabled={isLoading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isLoading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-[var(--primary-color)] text-white hover:opacity-90'
          }`}
        >
          <div className={`icon-refresh-cw text-sm ${isLoading ? 'animate-spin' : ''}`}></div>
          {isLoading ? 'Синхронизация...' : 'Синхронизировать'}
        </button>
        
        <div className="text-xs text-[var(--text-secondary)]">
          Последняя синхронизация: {formatSyncTime(lastSync)}
        </div>
      </div>
    );
  } catch (error) {
    console.error('SyncStatus component error:', error);
    return null;
  }
}