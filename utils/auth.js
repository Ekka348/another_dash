const AuthService = {
  users: [
    { id: 1, email: 'admin@ers.ru', password: 'admin123', name: 'Администратор ERS', role: 'admin' },
    { id: 2, email: 'manager@ers.ru', password: 'manager123', name: 'Менеджер ERS', role: 'manager' }
  ],

  login: function(email, password) {
    try {
      const user = this.users.find(u => u.email === email && u.password === password);
      if (user) {
        const userSession = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('currentUser', JSON.stringify(userSession));
        return { success: true, user: userSession };
      }
      return { success: false, message: 'Неверный email или пароль' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Ошибка при входе в систему' };
    }
  },

  logout: function() {
    try {
      localStorage.removeItem('currentUser');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  getCurrentUser: function() {
    try {
      const userSession = localStorage.getItem('currentUser');
      return userSession ? JSON.parse(userSession) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  hasRole: function(requiredRole) {
    try {
      const user = this.getCurrentUser();
      if (!user) return false;
      
      const roleHierarchy = {
        'admin': 2,
        'manager': 1
      };
      
      return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    } catch (error) {
      console.error('Role check error:', error);
      return false;
    }
  }
};
