// MetricCard.js
function MetricCard({ title, value, icon, color, trend, onClick, isSelected = false }) {
    try {
        const getColorClasses = (color) => {
            const colors = {
                blue: { 
                    bg: 'bg-blue-100', 
                    text: 'text-blue-600', 
                    icon: 'text-blue-600',
                    selected: 'bg-blue-500 text-white'
                },
                yellow: { 
                    bg: 'bg-yellow-100', 
                    text: 'text-yellow-600', 
                    icon: 'text-yellow-600',
                    selected: 'bg-yellow-500 text-white'
                },
                green: { 
                    bg: 'bg-green-100', 
                    text: 'text-green-600', 
                    icon: 'text-green-600',
                    selected: 'bg-green-500 text-white'
                }
            };
            return colors[color] || colors.blue;
        };

        const colorClasses = getColorClasses(color);
        const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600';
        const trendIcon = trend >= 0 ? 'trending-up' : 'trending-down';

        const cardClasses = `
            metric-card cursor-pointer transition-all duration-200 transform hover:scale-105
            ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-sm hover:shadow-md'}
        `;

        const contentClasses = `
            flex items-center justify-between p-4 rounded-lg
            ${isSelected ? colorClasses.selected : colorClasses.bg}
        `;

        return (
            <div 
                className={cardClasses}
                onClick={onClick}
                data-name="metric-card"
                data-stage={title.toLowerCase().replace(' ', '-')}
            >
                <div className={contentClasses}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg ${
                            isSelected ? 'bg-white bg-opacity-20' : colorClasses.bg
                        } flex items-center justify-center`}>
                            <div className={`icon-${icon} text-xl ${
                                isSelected ? 'text-white' : colorClasses.icon
                            }`}></div>
                        </div>
                        <div>
                            <p className={`text-sm ${
                                isSelected ? 'text-white' : 'text-gray-600'
                            }`}>{title}</p>
                            <p className={`text-2xl font-bold ${
                                isSelected ? 'text-white' : 'text-gray-900'
                            }`}>{value}</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 ${
                        isSelected ? 'text-white' : trendColor
                    }`}>
                        <div className={`icon-${trendIcon} text-sm`}></div>
                        <span className="text-sm font-medium">{Math.abs(trend)}%</span>
                    </div>
                </div>
                
                {isSelected && (
                    <div className="bg-blue-500 text-white text-center py-1 rounded-b-lg">
                        <div className="icon-check text-xs"></div>
                    </div>
                )}
            </div>
        );
    } catch (error) {
        console.error('MetricCard component error:', error);
        return null;
    }
}
