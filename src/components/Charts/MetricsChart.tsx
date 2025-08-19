/**
 * MetricsChart Component
 * Displays time-series data for dashboard metrics using Chart.js
 */

import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TimeSeriesData {
  date: string;
  cases: number;
  resolved: number;
  consultations: number;
}

interface MetricsChartProps {
  data: TimeSeriesData[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  data,
  timeRange,
  height = 400,
  showGrid = true,
  animated = true
}) => {
  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    
    switch (timeRange) {
      case '7d':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case '30d':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '90d':
      case '1y':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const chartData: ChartData<'line'> = {
    labels: data.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'New Cases',
        data: data.map(item => item.cases),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      },
      {
        label: 'Resolved Cases',
        data: data.map(item => item.resolved),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      },
      {
        label: 'Consultations',
        data: data.map(item => item.consultations),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#F59E0B',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    animation: animated ? {
      duration: 1000,
      easing: 'easeInOutQuart'
    } : false,
    plugins: {
      title: {
        display: true,
        text: 'Case Management Trends',
        font: {
          size: 18,
          weight: 'bold'
        },
        color: '#1e293b',
        padding: {
          bottom: 20
        }
      },
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          },
          color: '#64748b'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1e293b',
        bodyColor: '#64748b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const originalDate = data[context[0].dataIndex]?.date;
            if (originalDate) {
              return new Date(originalDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
            return '';
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: showGrid,
          color: '#f1f5f9',
          lineWidth: 1
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12
          },
          maxTicksLimit: timeRange === '7d' ? 7 : timeRange === '30d' ? 10 : 12
        },
        border: {
          display: false
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          display: showGrid,
          color: '#f1f5f9',
          lineWidth: 1
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12
          },
          callback: function(value) {
            return typeof value === 'number' ? value.toString() : value;
          }
        },
        border: {
          display: false
        }
      }
    },
    elements: {
      point: {
        hoverBorderWidth: 3
      }
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data: chartData,
      options: chartOptions
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, timeRange, showGrid, animated]);

  const calculateTotalCases = (): number => {
    return data.reduce((sum, item) => sum + item.cases, 0);
  };

  const calculateTotalResolved = (): number => {
    return data.reduce((sum, item) => sum + item.resolved, 0);
  };

  const calculateResolutionRate = (): string => {
    const total = calculateTotalCases();
    const resolved = calculateTotalResolved();
    if (total === 0) return '0%';
    return `${((resolved / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="metrics-chart-container">
      <div className="chart-header">
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Total Cases</span>
            <span className="stat-value">{calculateTotalCases()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Resolved</span>
            <span className="stat-value">{calculateTotalResolved()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Resolution Rate</span>
            <span className="stat-value">{calculateResolutionRate()}</span>
          </div>
        </div>
      </div>
      
      <div className="chart-wrapper" style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} />
      </div>
      
      <div className="chart-footer">
        <p className="chart-description">
          Tracking case management performance over the selected time period. 
          Resolution rate indicates the percentage of cases successfully resolved.
        </p>
      </div>
    </div>
  );
};

export default MetricsChart;