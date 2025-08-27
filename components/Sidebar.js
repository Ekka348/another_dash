function Sidebar({ currentUser, activeSection, onSectionChange }) {
  try {
    const menuItems = [
      { id: 'overview', label: 'Обзор', icon: 'home', roles: ['admin', 'manager', 'user'] },
      { id: 'analytics', label: 'Аналитика', icon: 'chart-bar', roles: ['admin', 'manager'] },
      { id: 'bitrix', label: 'Битрикс24', icon: 'activity', roles: ['admin', 'manager'] },
      { id: 'users', label: 'Пользователи', icon: 'users', roles: ['admin'] }
    ];

    const filteredItems = menuItems.filter(item => 
      item.roles.includes(currentUser.role)
    );

    return (
      <div className="fixed left-0 top-0 h-full w-[var(--sidebar-width)] bg-white border-r border-[var(--border-color)] z-50" 
           data-name="sidebar" data-file="components/Sidebar.js">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-[var(--primary-color)] rounded-lg flex items-center justify-center">
              <div className="icon-shield-check text-xl text-white"></div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-dark)]">Панель</h2>
              <p className="text-sm text-[var(--text-light)]">{currentUser.name}</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`sidebar-link w-full ${activeSection === item.id ? 'active' : ''}`}
              >
                <div className={`icon-${item.icon} text-xl mr-3`}></div>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={AuthService.logout}
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <div className="icon-log-out text-xl mr-3"></div>
            <span>Выход</span>
          </button>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Sidebar component error:', error);
    return null;
  }
}
