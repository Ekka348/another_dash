function StatsCard({ title, value, change, icon, color }) {
  try {
    const colorClasses = {
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600'
    };

    const changeColor = change.startsWith('+') ? 'text-green-600' : 'text-red-600';
    const changeIcon = change.startsWith('+') ? 'trending-up' : 'trending-down';

    return (
      <div className="stat-card" data-name="stats-card" data-file="components/StatsCard.js">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-light)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-dark)] mt-1">{value}</p>
            <div className="flex items-center mt-2">
              <div className={`icon-${changeIcon} text-sm mr-1 ${changeColor}`}></div>
              <span className={`text-sm font-medium ${changeColor}`}>{change}</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <div className={`icon-${icon} text-xl`}></div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('StatsCard component error:', error);
    return null;
  }
}