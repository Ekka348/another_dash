// LeadsChart.js
function LeadsChart({ type, data, labels, color, title, showLegend = true }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);
    const isEmptyData = !data || data.length === 0 || data.every(val => val === 0);

    React.useEffect(() => {
        if (!chartRef.current || isEmptyData) return;

        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        let config;
        
        if (type === 'line') {
            config = {
                type: 'line',
                data: {
                    labels: labels || Array.from({length: data.length}, (_, i) => `Пункт ${i + 1}`),
                    datasets: [{
                        label: title,
                        data: data,
                        borderColor: color,
                        backgroundColor: color + '20',
                        tension: 0.4,
                        borderWidth: 3,
                        fill: true,
                        pointBackgroundColor: color,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: showLegend,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: { size: 12 }
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
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            ticks: {
                                stepSize: Math.max(1, Math.floor(Math.max(...data) / 5)) || 1
                            }
                        },
                        x: {
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            };
        } else if (type === 'bar') {
            config = {
                type: 'bar',
                data: {
                    labels: labels || Array.from({length: data.length}, (_, i) => `Пункт ${i + 1}`),
                    datasets: [{
                        label: title,
                        data: data,
                        backgroundColor: color,
                        borderColor: color,
                        borderWidth: 1,
                        borderRadius: 6,
                        hoverBackgroundColor: color + 'CC'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: showLegend,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
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
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            ticks: {
                                stepSize: Math.max(1, Math.floor(Math.max(...data) / 5)) || 1
                            }
                        },
                        x: {
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                        }
                    }
                }
            };
        } else {
            const total = data.reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? Math.round((data[0] / total) * 100) : 0;
            
            config = {
                type: 'doughnut',
                data: {
                    labels: [title, 'Остальное'],
                    datasets: [{
                        data: [total, 100 - percentage],
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
                            display: showLegend,
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.parsed}`;
                                }
                            }
                        }
                    }
                }
            };
        }

        chartInstance.current = new ChartJS(ctx, config);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [type, data, labels, color, title, showLegend, isEmptyData]);

    if (isEmptyData) {
        return (
            <div className="h-48 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                    <div className={`icon-${type === 'doughnut' ? 'pie-chart' : 'bar-chart-3'} text-3xl mb-2 opacity-50`}></div>
                    <p>Нет данных для отображения</p>
                    <p className="text-xs mt-1">Выберите другие фильтры</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-48 relative" data-name="leads-chart">
            <canvas ref={chartRef}></canvas>
            {type === 'doughnut' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-lg font-bold" style={{ color: color }}>
                            {data.reduce((sum, val) => sum + val, 0)}
                        </div>
                        <div className="text-xs text-gray-500">всего</div>
                    </div>
                </div>
            )}
        </div>
    );
}
