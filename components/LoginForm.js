function LoginForm({ onLogin }) {
  try {
    const [formData, setFormData] = React.useState({
      email: '',
      password: ''
    });
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        const result = AuthService.login(formData.email, formData.password);
        
        if (result.success) {
          onLogin(result.user);
        } else {
          setError(result.message);
        }
      } catch (error) {
        setError('Произошла ошибка при входе в систему');
        console.error('Login form error:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleChange = (e) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    };

    return (
      <div className="card" data-name="login-form" data-file="components/LoginForm.js">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-dark)] mb-2">
              Email адрес
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Введите ваш email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-dark)] mb-2">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Введите ваш пароль"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <div className="icon-log-in text-lg"></div>
                <span>Войти</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Тестовые учетные записи:</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <div><strong>Администратор:</strong> admin@example.com / admin123</div>
            <div><strong>Менеджер:</strong> manager@example.com / manager123</div>
            <div><strong>Пользователь:</strong> user@example.com / user123</div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('LoginForm component error:', error);
    return null;
  }
}