class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Что-то пошло не так</h1>
            <p className="text-gray-600 mb-4">Извините, произошла непредвиденная ошибка.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function DashboardApp() {
  try {
    const [currentUser, setCurrentUser] = React.useState(null);
    const [activeSection, setActiveSection] = React.useState('overview');

    React.useEffect(() => {
      const user = AuthService.getCurrentUser();
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      setCurrentUser(user);
    }, []);

    if (!currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
            <p className="text-[var(--text-light)]">Загрузка...</p>
          </div>
        </div>
      );
    }

    const renderContent = () => {
      switch (activeSection) {
        case 'overview':
          return <OverviewSection currentUser={currentUser} />;
        case 'analytics':
          return <AnalyticsSection currentUser={currentUser} />;
        case 'bitrix':
          return <BitrixStats />;
        case 'users':
          return currentUser.role === 'admin' ? <UsersSection /> : <AccessDenied />;
        default:
          return <OverviewSection currentUser={currentUser} />;
      }
    };

    return (
      <div className="min-h-screen bg-gray-50" data-name="dashboard-app" data-file="dashboard-app.js">
        <Sidebar 
          currentUser={currentUser} 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="ml-[var(--sidebar-width)]">
          <Header currentUser={currentUser} />
          <main className="p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    );
  } catch (error) {
    console.error('DashboardApp component error:', error);
    return null;
  }
}

function OverviewSection({ currentUser }) {
  const stats = [
    { title: 'Общий доход', value: '₽2,345,678', change: '+12%', icon: 'trending-up', color: 'green' },
    { title: 'Активные пользователи', value: '1,234', change: '+5%', icon: 'users', color: 'blue' },
    { title: 'Заказы', value: '456', change: '+8%', icon: 'shopping-cart', color: 'purple' },
    { title: 'Конверсия', value: '3.2%', change: '+0.5%', icon: 'target', color: 'orange' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">Обзор</h1>
        <p className="text-[var(--text-light)]">Добро пожаловать, {currentUser.name}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart 
          title="Продажи по месяцам" 
          type="line"
          data={{
            labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
            datasets: [{
              label: 'Продажи',
              data: [12, 19, 3, 5, 2, 3],
              borderColor: 'rgb(37, 99, 235)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)'
            }]
          }}
        />
        <Chart 
          title="Распределение пользователей" 
          type="doughnut"
          data={{
            labels: ['Новые', 'Активные', 'Неактивные'],
            datasets: [{
              data: [300, 50, 100],
              backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
          }}
        />
      </div>
    </div>
  );
}

function AnalyticsSection({ currentUser }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-dark)]">Аналитика</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart 
          title="Трафик по источникам" 
          type="bar"
          data={{
            labels: ['Поиск', 'Социальные сети', 'Прямые переходы', 'Реклама'],
            datasets: [{
              label: 'Посетители',
              data: [65, 59, 80, 81],
              backgroundColor: 'rgba(37, 99, 235, 0.8)'
            }]
          }}
        />
        <Chart 
          title="Конверсии по дням" 
          type="line"
          data={{
            labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            datasets: [{
              label: 'Конверсии',
              data: [3.2, 2.8, 4.1, 3.7, 2.5, 1.9, 2.3],
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)'
            }]
          }}
        />
      </div>
    </div>
  );
}

function UsersSection() {
  const users = [
    { id: 1, name: 'Александр Петров', email: 'alex@example.com', role: 'admin', status: 'Активен' },
    { id: 2, name: 'Мария Иванова', email: 'maria@example.com', role: 'manager', status: 'Активна' },
    { id: 3, name: 'Дмитрий Сидоров', email: 'dmitry@example.com', role: 'user', status: 'Неактивен' }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-dark)]">Управление пользователями</h1>
      
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'Активен' || user.status === 'Активна' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-[var(--primary-color)] hover:text-blue-700 mr-4">
                      Редактировать
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <div className="icon-shield-x text-2xl text-red-600"></div>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Доступ запрещен</h2>
      <p className="text-gray-600">У вас нет прав для просмотра этой страницы.</p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <DashboardApp />
  </ErrorBoundary>
);