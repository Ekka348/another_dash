function LeadsChart({ type, data, period = 'single' }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    // Генерация данных для текущей недели (с понедельника по воскресенье)
    const generateCurrentWeekData = (currentValue) => {
        // Получаем текущую дату
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 - воскресенье, 1 - понедельник, etc.
        
        // Вычисляем дату понедельника текущей недели
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        
        // Создаем данные для всех дней недели
        const weekData = [0, 0, 0, 0, 0, 0, 0]; // Пн, Вт, Ср, Чт, Пт, Сб, Вс
        
        // Распределяем текущее значение по дням недели
        // Больше лидов в середине недели, меньше в выходные
        const distribution = [0.8, 1.2, 1.5, 1.8, 2.1, 0.6, 1.0];
        const totalDistribution = distribution.reduce((sum, val) => sum + val, 0);
        
        for (let i = 0; i < 7; i++) {
            weekData[i] = Math.round((currentValue * distribution[i]) / totalDistribution);
        }
        
        // Убедимся, что сумма соответствует текущему значению
        const sum = weekData.reduce((total, num) => total + num, 0);
        const diff = currentValue - sum;
        
        // Корректируем разницу, добавляя к последнему дню
        if (diff !== 0) {
            weekData[6] += diff;
        }
        
        return weekData;
    };

    // Проверка на пустые данные
    const isEmptyData = !data || (data.callback === 0 && data.approval === 0 && data.invited === 0);
    
    // Проверка на одиночные значения
    const isSingleValue = type === 'doughnut' && 
                         ((data.callback > 0 && data.approval === 0 && data.invited === 0) ||
                          (data.callback === 0 && data.approval > 0 && data.invited === 0) ||
                          (data.callback === 0 && data.approval === 0 && data.invited > 0));

    React.useEffect(() => {
        if (!chartRef.current || isEmptyData) return;

        const ctx = chartRef.current.getContext('2d');
        
        // Уничтожаем предыдущий график
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        let config;
        
        if (type === 'line') {
            // Данные для линейного графика текущей недели
            const weekData = generateCurrentWeekData(data.callback || 0);
            const today = new Date();
            const dayOfWeek = today.getDay();
            
            // Определяем даты для подписей
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - dayOfWeek + i + (dayOfWeek === 0 ? 1 : 1));
                weekDates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
            }
            
            config = {
                type: 'line',
                data: {
                    labels: weekDates,
                    datasets: [
                        {
                            label: 'Перезвонить',
                            data: weekData,
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            tension: 0.4,
                            borderWidth: 3,
                            fill: true,
                            pointBackgroundColor: '#2563eb',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y} лидов`;
                                },
                                title: function(context) {
                                    return context[0].label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                stepSize: Math.max(1, Math.floor((data.callback || 0) / 5))
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            };
        } else {
            // Код для круговой диаграммы
            if (isSingleValue) {
                // Для одиночных значений
                let activeValue = 0;
                let label = '';
                let color = '';
                
                if (data.callback > 0) {
                    activeValue = data.callback;
                    label = 'Перезвонить';
                    color = '#2563eb';
                } else if (data.approval > 0) {
                    activeValue = data.approval;
                    label = 'На согласовании';
                    color = '#f59e0b';
                } else if (data.invited > 0) {
                    activeValue = data.invited;
                    label = 'Приглашен к рекрутеру';
                    color = '#10b981';
                }
                
                config = {
                    type: 'doughnut',
                    data: {
                        labels: [label, ''],
                        datasets: [{
                            data: [activeValue, 1],
                            backgroundColor: [color, '#f3f4f6'],
                            borderWidth: 0,
                            hoverOffset: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${label}: ${activeValue}`;
                                    }
                                }
                            }
                        }
                    }
                };
            } else {
                // Обычная круговая диаграмма
                config = {
                    type: 'doughnut',
                    data: {
                        labels: ['Перезвонить', 'На согласовании', 'Приглашен к рекрутеру'],
                        datasets: [{
                            data: [data.callback || 0, data.approval || 0, data.invited || 0],
                            backgroundColor: ['#2563eb', '#f59e0b', '#10b981'],
                            borderWidth: 0,
                            hoverOffset: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom'
                            }
                        }
                    }
                };
            }
        }

        // Создаем новый график
        chartInstance.current = new ChartJS(ctx, config);

        // Cleanup функция
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [type, data, isEmptyData, isSingleValue]);

    if (isEmptyData) {
        return (
            <div className="h-48 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                    <div className="icon-bar-chart-3 text-3xl mb-2"></div>
                    <p>Нет данных</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-48" data-name="leads-chart">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}
