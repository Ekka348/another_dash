function Chart({ title, type, data }) {
  try {
    const chartRef = React.useRef(null);
    const chartInstanceRef = React.useRef(null);

    React.useEffect(() => {
      if (chartRef.current && ChartJS) {
        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        chartInstanceRef.current = new ChartJS(ctx, {
          type: type,
          data: data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: type === 'doughnut',
                position: 'bottom'
              }
            },
            scales: type === 'doughnut' ? {} : {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }

      return () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }
      };
    }, [type, data]);

    return (
      <div className="card" data-name="chart" data-file="components/Chart.js">
        <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-4">{title}</h3>
        <div className="relative h-64">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Chart component error:', error);
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-[var(--text-light)]">
          Ошибка загрузки графика
        </div>
      </div>
    );
  }
}