function DateFilter({ onApply, isLoading }) {
    const [startDate, setStartDate] = React.useState(formatDateForInput(new Date()));
    const [endDate, setEndDate] = React.useState(formatDateForInput(new Date()));

    const handleApply = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            alert('Дата начала не может быть позже даты окончания');
            return;
        }
        
        onApply(start, end);
    };

    const setToday = () => {
        const today = new Date();
        setStartDate(formatDateForInput(today));
        setEndDate(formatDateForInput(today));
    };

    const setYesterday = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setStartDate(formatDateForInput(yesterday));
        setEndDate(formatDateForInput(yesterday));
    };

    const setThisWeek = () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        
        setStartDate(formatDateForInput(startOfWeek));
        setEndDate(formatDateForInput(today));
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Фильтр по дате</h3>
            
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Начальная дата</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Конечная дата</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={setYesterday}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                            Вчера
                        </button>
                        <button
                            onClick={setToday}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                            Сегодня
                        </button>
                        <button
                            onClick={setThisWeek}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                            Эта неделя
                        </button>
                    </div>
                    
                    <button
                        onClick={handleApply}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="icon-loader-2 animate-spin text-sm"></div>
                                Загрузка...
                            </>
                        ) : (
                            <>
                                <div className="icon-filter text-sm"></div>
                                Применить
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {startDate && endDate && (
                <div className="mt-3 text-sm text-gray-600">
                    Период: {new Date(startDate).toLocaleDateString('ru-RU')} - {new Date(endDate).toLocaleDateString('ru-RU')}
                </div>
            )}
        </div>
    );
}
