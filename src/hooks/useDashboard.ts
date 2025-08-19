/**
 * Custom hook for dashboard data management
 * Handles API calls, state management, and data transformations
 */

import { useState, useEffect, useCallback } from 'react';

export interface DashboardMetrics {
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  pendingCases: number;
  monthlyGrowth: number;
  averageResolutionTime: number;
  criticalCases: number;
  consultationsScheduled: number;
}

export interface CaseDistribution {
  label: string;
  value: number;
  color: string;
}

export interface TimeSeriesData {
  date: string;
  cases: number;
  resolved: number;
  consultations: number;
}

export interface DashboardFilters {
  timeRange: '7d' | '30d' | '90d' | '1y';
  department?: string;
  caseType?: string;
  priority?: string;
}

export interface UseDashboardReturn {
  metrics: DashboardMetrics;
  caseDistribution: CaseDistribution[];
  timeSeriesData: TimeSeriesData[];
  loading: boolean;
  error: string | null;
  filters: DashboardFilters;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  refreshData: () => Promise<void>;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Mock data generator for demo purposes
const generateMockMetrics = (timeRange: string): DashboardMetrics => {
  const baseMetrics = {
    totalCases: 2847,
    activeCases: 342,
    resolvedCases: 2456,
    pendingCases: 49,
    monthlyGrowth: 12.5,
    averageResolutionTime: 3.2,
    criticalCases: 15,
    consultationsScheduled: 78
  };

  // Adjust metrics based on time range
  const multiplier = timeRange === '7d' ? 0.2 : timeRange === '30d' ? 1 : timeRange === '90d' ? 2.5 : 4;
  
  return {
    ...baseMetrics,
    totalCases: Math.floor(baseMetrics.totalCases * multiplier),
    activeCases: Math.floor(baseMetrics.activeCases * multiplier),
    resolvedCases: Math.floor(baseMetrics.resolvedCases * multiplier),
    pendingCases: Math.floor(baseMetrics.pendingCases * multiplier),
    criticalCases: Math.floor(baseMetrics.criticalCases * multiplier),
    consultationsScheduled: Math.floor(baseMetrics.consultationsScheduled * multiplier)
  };
};

const generateMockCaseDistribution = (): CaseDistribution[] => [
  { label: 'Drug Possession', value: 45, color: '#3B82F6' },
  { label: 'Drug Trafficking', value: 25, color: '#EF4444' },
  { label: 'Consultation Cases', value: 20, color: '#10B981' },
  { label: 'Rehabilitation', value: 10, color: '#F59E0B' }
];

const generateMockTimeSeriesData = (timeRange: string): TimeSeriesData[] => {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const data: TimeSeriesData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      cases: Math.floor(Math.random() * 20) + 5,
      resolved: Math.floor(Math.random() * 15) + 3,
      consultations: Math.floor(Math.random() * 8) + 2
    });
  }
  
  return data;
};

export const useDashboard = (initialFilters: DashboardFilters = { timeRange: '30d' }): UseDashboardReturn => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCases: 0,
    activeCases: 0,
    resolvedCases: 0,
    pendingCases: 0,
    monthlyGrowth: 0,
    averageResolutionTime: 0,
    criticalCases: 0,
    consultationsScheduled: 0
  });

  const [caseDistribution, setCaseDistribution] = useState<CaseDistribution[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<DashboardFilters>(initialFilters);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // In a real application, these would be actual API calls
      const metricsData = generateMockMetrics(filters.timeRange);
      const distributionData = generateMockCaseDistribution();
      const timeSeriesDataSet = generateMockTimeSeriesData(filters.timeRange);

      setMetrics(metricsData);
      setCaseDistribution(distributionData);
      setTimeSeriesData(timeSeriesDataSet);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const setFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refreshData = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refreshData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loading, refreshData]);

  return {
    metrics,
    caseDistribution,
    timeSeriesData,
    loading,
    error,
    filters,
    setFilters,
    refreshData
  };
};

// Utility functions for data formatting
export const formatMetricValue = (value: number, type: 'number' | 'percentage' | 'currency' | 'days' = 'number'): string => {
  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-AE', { 
        style: 'currency', 
        currency: 'AED' 
      }).format(value);
    case 'days':
      return `${value.toFixed(1)} days`;
    default:
      return value.toLocaleString();
  }
};

export const calculateTrend = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'stable' } => {
  if (previous === 0) return { value: 0, direction: 'stable' };
  
  const change = ((current - previous) / previous) * 100;
  
  return {
    value: Math.abs(change),
    direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable'
  };
};

export const getMetricColor = (metric: keyof DashboardMetrics): string => {
  const colorMap: Record<string, string> = {
    totalCases: '#3B82F6',
    activeCases: '#F59E0B',
    resolvedCases: '#10B981',
    pendingCases: '#EF4444',
    criticalCases: '#DC2626',
    consultationsScheduled: '#8B5CF6'
  };
  
  return colorMap[metric] || '#6B7280';
};

export default useDashboard;