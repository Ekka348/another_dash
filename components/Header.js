function Header({ currentUser }) {
  try {
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDate = (date) => {
      return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return (
      <header className="bg-white border-b border-[var(--border-color)] px-6 py-4" 
              data-name="header" data-file="components/Header.js">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-dark)]">
              Добро пожаловать, {currentUser.name}
            </h1>
            <p className="text-sm text-[var(--text-light)]">
              {formatDate(currentTime)}
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-lg font-mono text-[var(--primary-color)]">
                {formatTime(currentTime)}
              </div>
              <div className="text-xs text-[var(--text-light)] uppercase">
                Роль: {currentUser.role}
              </div>
            </div>
            
            <div className="w-10 h-10 bg-[var(--primary-color)] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>
    );
  } catch (error) {
    console.error('Header component error:', error);
    return null;
  }
}