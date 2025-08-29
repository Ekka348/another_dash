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

        // Мемоизируем конфигурацию графиков
        const chartConfig = React.useMemo(() => {
            if (type === 'line') {
                return {
                    type: 'line',
                    data: {
                        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                        datasets: [
                            {
                                label: 'Перезвонить',
                                data: [data.callback || 0, 0, 0, 0, 0, 0, 0], // TODO: Заменить на реальные временные данные
                                borderColor: '#2563eb',
                                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                fill: true
                            },
                            {
                                label: 'На согласовании',
                                data: [data.approval || 0, 0, 0, 0, 0, 0, 0], // TODO: Заменить на реальные временные данные
                                borderColor: '#f59e0b',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                fill: true
                            },
                            {
                                label: 'Приглашен к рекрутеру',
                                data: [data.invited || 0, 0, 0, 0, 0, 0, 0], // TODO: Заменить на реальные временные данные
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
                                position: 'bottom',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20
                                }
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    drawBorder: false
                                },
                                ticks: {
                                    stepSize: 1
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    maxRotation: 45
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        }
                    }
                };
            } else {
                return {
                    type: 'doughnut',
                    data: {
                        labels: ['Перезвонить', 'На согласовании', 'Приглашен к рекрутеру'],
                        datasets: [{
                            data: [data.callback || 0, data.approval || 0, data.invited || 0],
                            backgroundColor: ['#2563eb', '#f59e0b', '#10b981'],
                            borderWidth: 0,
                            hoverOffset: 10,
                            borderColor: '#ffffff'
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
                                    padding: 20,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.label}: ${context.raw} лидов`;
                                    }
                                }
                            }
                        }
                    }
                };
            }
        }, [type, data.callback, data.approval, data.invited]); // Правильные зависимости

        React.useEffect(() => {
            if (chartRef.current && data && chartConfig) {
                const ctx = chartRef.current.getContext('2d');
                
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                chartInstance.current = new ChartJS(ctx, chartConfig);
            }

            return () => {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
            };
        }, [chartConfig]); // Только одна зависимость

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
                    <p className="text-xs mt-1 text-gray-500">Обновите страницу</p>
                </div>
            </div>
        );
    }
}
