function LeadsChart({ type, data }) {
    try {
        const chartRef = React.useRef(null);
        const chartInstance = React.useRef(null);

        // Проверка на одиночные значения (для круговых диаграмм по стадиям)
        const isSingleValueChart = React.useMemo(() => {
            return type === 'doughnut' && 
                   ((data.callback > 0 && data.approval === 0 && data.invited === 0) ||
                    (data.callback === 0 && data.approval > 0 && data.invited === 0) ||
                    (data.callback === 0 && data.approval === 0 && data.invited > 0));
        }, [type, data.callback, data.approval, data.invited]);

        // Проверка на пустые данные
        const isEmptyData = React.useMemo(() => {
            return !data || (data.callback === 0 && data.approval === 0 && data.invited === 0);
        }, [data]);

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

        React.useEffect(() => {
            if (!chartRef.current) return;

            const ctx = chartRef.current.getContext('2d');
            
            // Уничтожаем предыдущий график
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            let config;
            
            if (type === 'line') {
                config = {
                    type: 'line',
                    data: {
                        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                        datasets: [
                            {
                                label: 'Перезвонить',
                                data: [data.callback || 0, 0, 0, 0, 0, 0, 0],
                                borderColor: '#2563eb',
                                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                fill: true
                            },
                            {
                                label: 'На согласовании',
                                data: [data.approval || 0, 0, 0, 0, 0, 0, 0],
                                borderColor: '#f59e0b',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                fill: true
                            },
                            {
                                label: 'Приглашен к рекрутеру',
                                data: [data.invited || 0, 0, 0, 0, 0, 0, 0],
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                };
            } else {
                // Код для круговой диаграммы с учетом одиночных значений
                if (isSingleValueChart) {
                    // Для одиночных значений создаем минимальный набор данных
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
                                data: [activeValue, 1], // Второе значение минимальное для отображения
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
                    // Обычная круговая диаграмма для нескольких значений
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
        }, [type, data, isSingleValueChart]);

        return (
            <div className="h-48" data-name="leads-chart">
                <canvas ref={chartRef}></canvas>
            </div>
        );
    } catch (error) {
        console.error('LeadsChart component error:', error);
        return (
            <div className="h-48 flex items-center justify-center">
                <div className="text-red-500 text-center">
                    <div className="icon-alert-circle text-3xl mb-2"></div>
                    <p>Ошибка загрузки графика</p>
                </div>
            </div>
        );
    }
}
