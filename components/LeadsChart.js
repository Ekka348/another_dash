// LeadsChart.js
function LeadsChart({ type, data, labels, color, title, filters }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    const isEmptyData = !data || data.length === 0 || data.every(val => val === 0);

    React.useEffect(() => {
        if (!chartRef.current || isEmptyData) return;

        const ctx = chartRef.current.getContext('2d');
        
        // Уничтожаем предыдущий график
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        let config;
        
        if (type === 'line') {
            // Данные для линейного графика
            config = {
                type: 'line',
                data: {
                    labels: labels || ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                    datasets: [
                        {
                            label: title,
                            data: data,
                            borderColor: color,
                            backgroundColor: color + '20', // Добавляем прозрачность
                            tension: 0.4,
                            borderWidth: 3,
                            fill: true,
                            pointBackgroundColor: color,
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
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y}`;
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
                                stepSize: Math.max(1, Math.floor(Math.max(...data) / 5)) || 1
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
            const total = data.reduce((sum, val) => sum + val, 0);
            
            config = {
                type: 'doughnut',
                data: {
                    labels: [title, ''],
                    datasets: [{
                        data: [total, 1],
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
                                    return `${title}: ${total}`;
                                }
                            }
                        }
                    }
                }
            };
        }

        // Создаем новый график
        chartInstance.current = new ChartJS(ctx, config);

        // Cleanup функция
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [type, data, labels, color, title, isEmptyData]);

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
        <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">{title}</h4>
                {filters && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {filters}
                    </span>
                )}
            </div>
            <div className="h-48" data-name="leads-chart">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
}
