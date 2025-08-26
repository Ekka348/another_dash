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

function App() {
  try {
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(null);

    React.useEffect(() => {
      const user = AuthService.getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      }
    }, []);

    const handleLogin = (user) => {
      setIsAuthenticated(true);
      setCurrentUser(user);
    };

    if (isAuthenticated) {
      window.location.href = 'dashboard.html';
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4" data-name="app" data-file="app.js">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <div className="icon-shield-check text-2xl text-[var(--primary-color)]"></div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Система управления</h1>
            <p className="text-blue-100">Войдите в свою учетную запись</p>
          </div>
          
          <LoginForm onLogin={handleLogin} />
          
          <div className="text-center mt-6">
            <p className="text-blue-100 text-sm">
              © 2025 Система управления. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);