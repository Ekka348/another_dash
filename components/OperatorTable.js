// OperatorTable.js
function OperatorTable({ stage, operators = [] }) {
    try {
        const sortedOperators = [...operators].sort((a, b) => b.leads - a.leads);

        return (
            <div className="dashboard-card" data-name="operator-table">
                <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                        {sortedOperators.length} операторов
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-2 font-medium text-gray-600 text-sm">Рейтинг</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-600 text-sm">Оператор</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-600 text-sm">Количество лидов</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-600 text-sm">Статус</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-600 text-sm">Последняя активность</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOperators.map((operator, index) => (
                                <tr key={operator.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-2">
                                        <div className="flex items-center gap-2">
                                            {index < 3 && (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                            )}
                                            {index >= 3 && (
                                                <span className="text-gray-500 text-sm ml-2">#{index + 1}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                {operator.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{operator.name}</p>
                                                {operator.department && (
                                                    <p className="text-sm text-gray-600">{operator.department}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold text-gray-900">{operator.leads}</span>
                                            {operator.trend && (
                                                <span className={`text-xs ${operator.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {operator.trend > 0 ? '+' : ''}{operator.trend}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            operator.status === 'active' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {operator.status === 'active' ? 'Активен' : 'Не в сети'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-2">
                                        <span className="text-sm text-gray-600">
                                            {operator.lastActivity}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {sortedOperators.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <div className="icon-users text-4xl mb-2 opacity-50"></div>
                        <p>Операторы не найдены</p>
                    </div>
                )}
            </div>
        );
    } catch (error) {
        console.error('OperatorTable component error:', error);
        return null;
    }
}
