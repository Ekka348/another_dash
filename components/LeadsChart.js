function LeadsChart({ type, data }) {
    try {
        const chartRef = React.useRef(null);
        const chartInstance = React.useRef(null);

        // Проверка на пустые данные
        if (!data || (data.callback === 0 && data.approval === 0 && data.invited === 0)) {
            return (
                <div className="h-64 flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                        <div className="icon-bar-chart-3 text-3xl mb-2"></div>
                        <p>Нет данных для отображения</p>
                    </div>
                </div>
            );
        }

        React.useEffect(() => {
            if (chartRef.current && data) {
                const ctx = chartRef.current.getContext('2d');
                
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                const config = type === 'line' ? getLineChartConfig() : getDoughnutChartConfig();
                chartInstance.current = new ChartJS(ctx, config);
            }

            return () => {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
            };
        }, [type, data]);

        const getLineChartConfig = () => ({
            type: 'line',
            data: {
                labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                datasets: [
                    {
                        label: 'Перезвонить',
                        data: [12, 19, 15, 25, 22, 18, 24], // TODO: Заменить на реальные данные
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'На согласовании',
                        data: [8, 12, 18, 14, 16, 20, 15], // TODO: Заменить на реальные данные
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Приглашен к рекрутеру',
                        data: [5, 8, 6, 12, 10, 14, 18], // TODO: Заменить на реальные данные
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        const getDoughnutChartConfig = () => ({
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
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });

        return (
            <div className="h-64" data-name="leads-chart">
                <canvas ref={chartRef}></canvas>
            </div>
        );
    } catch (error) {
        console.error('LeadsChart component error:', error);
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="text-red-500 text-center">
                    <div className="icon-alert-circle text-3xl mb-2"></div>
                    <p>Ошибка загрузки графика</p>
                </div>
            </div>
        );
    }
}
