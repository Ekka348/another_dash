function LeadsChart({ type, data, labels, showLegend = true }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    // Проверка на пустые данные
    const isEmptyData = !data || 
        (type === 'line' && (!data.callback || data.callback.every(val => val === 0))) ||
        (type === 'doughnut' && data.callback === 0 && data.approval === 0 && data.invited === 0);

    React.useEffect(() => {
        if (!chartRef.current || isEmptyData) return;

        const ctx = chartRef.current.getContext('2d');
        
        // Уничтожаем предыдущий график
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        let config;
        
        if (type === 'line') {
            // Данные для линейного графика - только статус "Перезвонить"
            config = {
                type: 'line',
                data: {
                    labels: labels || ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                    datasets: [
                        {
                            label: 'Лиды в статусе "Перезвонить"',
                            data: data.callback || [],
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
                            display: showLegend,
                            position: 'top'
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
                                stepSize: 1
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
            // Остальной код для круговых диаграмм без изменений
            // ...
        }

        // Создаем новый график
        chartInstance.current = new ChartJS(ctx, config);

        // Cleanup функция
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [type, data, labels, showLegend, isEmptyData]);

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
