// Моковые данные для демонстрации
const mockLeadsData = {
  callback: 47,
  approval: 32,
  invited: 28
};

const mockOperatorsData = {
  callback: [
    { id: 1, name: 'Анна Петрова', department: 'Отдел продаж', leads: 12, trend: +3, status: 'active', lastActivity: '2 мин назад' },
    { id: 2, name: 'Михаил Сидоров', department: 'Отдел продаж', leads: 10, trend: +1, status: 'active', lastActivity: '15 мин назад' },
    { id: 3, name: 'Елена Козлова', department: 'Отдел продаж', leads: 9, trend: -1, status: 'offline', lastActivity: '1 час назад' },
    { id: 4, name: 'Дмитрий Волков', department: 'Отдел продаж', leads: 8, trend: +2, status: 'active', lastActivity: '5 мин назад' },
    { id: 5, name: 'Ольга Смирнова', department: 'Отдел продаж', leads: 8, trend: 0, status: 'active', lastActivity: '30 мин назад' }
  ],
  approval: [
    { id: 6, name: 'Игорь Попов', department: 'Менеджмент', leads: 8, trend: +1, status: 'active', lastActivity: '10 мин назад' },
    { id: 7, name: 'Светлана Орлова', department: 'Менеджмент', leads: 7, trend: -2, status: 'active', lastActivity: '20 мин назад' },
    { id: 8, name: 'Алексей Морозов', department: 'Менеджмент', leads: 6, trend: +1, status: 'offline', lastActivity: '2 часа назад' },
    { id: 9, name: 'Татьяна Лебедева', department: 'Менеджмент', leads: 6, trend: 0, status: 'active', lastActivity: '45 мин назад' },
    { id: 10, name: 'Роман Новиков', department: 'Менеджмент', leads: 5, trend: -1, status: 'active', lastActivity: '1 час назад' }
  ],
  invited: [
    { id: 11, name: 'Марина Федорова', department: 'HR', leads: 6, trend: +2, status: 'active', lastActivity: '5 мин назад' },
    { id: 12, name: 'Андрей Соколов', department: 'HR', leads: 5, trend: +1, status: 'active', lastActivity: '25 мин назад' },
    { id: 13, name: 'Наталья Белова', department: 'HR', leads: 5, trend: 0, status: 'offline', lastActivity: '3 часа назад' },
    { id: 14, name: 'Сергей Зайцев', department: 'HR', leads: 4, trend: +1, status: 'active', lastActivity: '40 мин назад' },
    { id: 15, name: 'Виктория Павлова', department: 'HR', leads: 4, trend: -1, status: 'active', lastActivity: '1 час назад' },
    { id: 16, name: 'Максим Григорьев', department: 'HR', leads: 4, trend: +1, status: 'offline', lastActivity: '4 часа назад' }
  ]
};