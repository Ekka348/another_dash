function MetricCard({ title, value, icon, color, trend }) {
    try {
        const getColorClasses = (color) => {
            const colors = {
                blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' },
                yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: 'text-yellow-600' },
                green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' }
            };
            return colors[color] || colors.blue;
        };

        const colorClasses = getColorClasses(color);
        const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600';
        const trendIcon = trend >= 0 ? 'trending-up' : 'trending-down';

        return (
            <div className="metric-card" data-name="metric-card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                            <div className={`icon-${icon} text-xl ${colorClasses.icon}`}></div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{title}</p>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 ${trendColor}`}>
                        <div className={`icon-${trendIcon} text-sm`}></div>
                        <span className="text-sm font-medium">{Math.abs(trend)}%</span>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('MetricCard component error:', error);
        return null;
    }
}
