/**
 * Main Dashboard Component for MOSD Drug Control System
 * Displays key metrics, recent activities, and navigation
 */

import React, { useState, useEffect } from 'react';

interface DashboardMetrics {
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  pendingCases: number;
  monthlyGrowth: number;
  averageResolutionTime: number;
}

interface RecentActivity {
  id: string;
  type: 'case_created' | 'case_updated' | 'case_resolved' | 'consultation_scheduled';
  title: string;
  description: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCases: 0,
    activeCases: 0,
    resolvedCases: 0,
    pendingCases: 0,
    monthlyGrowth: 0,
    averageResolutionTime: 0
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMetrics({
        totalCases: 2847,
        activeCases: 342,
        resolvedCases: 2456,
        pendingCases: 49,
        monthlyGrowth: 12.5,
        averageResolutionTime: 3.2
      });

      setRecentActivities([
        {
          id: '1',
          type: 'case_created',
          title: 'New Drug Possession Case',
          description: 'Case filed for drug possession in Al-Ain district',
          timestamp: new Date('2024-01-15T10:30:00'),
          priority: 'high',
          assignee: 'Ahmed Al-Mansouri'
        },
        {
          id: '2',
          type: 'case_resolved',
          title: 'Consultation Case Resolved',
          description: 'Family consultation case successfully completed',
          timestamp: new Date('2024-01-15T09:15:00'),
          priority: 'medium',
          assignee: 'Fatima Al-Zahra'
        },
        {
          id: '3',
          type: 'consultation_scheduled',
          title: 'Rehabilitation Consultation',
          description: 'Scheduled consultation for ongoing rehabilitation program',
          timestamp: new Date('2024-01-15T08:45:00'),
          priority: 'medium',
          assignee: 'Dr. Mohammad Al-Rashid'
        },
        {
          id: '4',
          type: 'case_updated',
          title: 'Investigation Update',
          description: 'Evidence collected and case file updated',
          timestamp: new Date('2024-01-14T16:20:00'),
          priority: 'high',
          assignee: 'Khalid Al-Mansoori'
        },
        {
          id: '5',
          type: 'case_created',
          title: 'Drug Trafficking Investigation',
          description: 'Major trafficking case opened requiring immediate attention',
          timestamp: new Date('2024-01-14T14:10:00'),
          priority: 'critical',
          assignee: 'Saeed Al-Mukhaini'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'new_case',
      title: 'Create New Case',
      description: 'File a new drug-related case',
      icon: '📋',
      route: '/cases/new',
      color: '#3B82F6'
    },
    {
      id: 'schedule_consultation',
      title: 'Schedule Consultation',
      description: 'Book consultation session',
      icon: '📅',
      route: '/consultations/new',
      color: '#10B981'
    },
    {
      id: 'generate_report',
      title: 'Generate Report',
      description: 'Create monthly performance report',
      icon: '📊',
      route: '/reports/generate',
      color: '#F59E0B'
    },
    {
      id: 'manage_users',
      title: 'User Management',
      description: 'Manage system users and permissions',
      icon: '👥',
      route: '/admin/users',
      color: '#8B5CF6'
    }
  ];

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#EAB308';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'case_created': return '📝';
      case 'case_updated': return '🔄';
      case 'case_resolved': return '✅';
      case 'consultation_scheduled': return '📅';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>MOSD Drug Control Dashboard</h1>
        <div className="time-range-selector">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card total-cases">
          <div className="metric-header">
            <h3>Total Cases</h3>
            <span className="metric-icon">📊</span>
          </div>
          <div className="metric-value">{metrics.totalCases.toLocaleString()}</div>
          <div className="metric-growth positive">
            +{metrics.monthlyGrowth}% this month
          </div>
        </div>

        <div className="metric-card active-cases">
          <div className="metric-header">
            <h3>Active Cases</h3>
            <span className="metric-icon">🔍</span>
          </div>
          <div className="metric-value">{metrics.activeCases}</div>
          <div className="metric-subtitle">Currently under investigation</div>
        </div>

        <div className="metric-card resolved-cases">
          <div className="metric-header">
            <h3>Resolved Cases</h3>
            <span className="metric-icon">✅</span>
          </div>
          <div className="metric-value">{metrics.resolvedCases}</div>
          <div className="metric-subtitle">Successfully closed</div>
        </div>

        <div className="metric-card pending-cases">
          <div className="metric-header">
            <h3>Pending Cases</h3>
            <span className="metric-icon">⏳</span>
          </div>
          <div className="metric-value">{metrics.pendingCases}</div>
          <div className="metric-subtitle">Awaiting action</div>
        </div>

        <div className="metric-card resolution-time">
          <div className="metric-header">
            <h3>Avg Resolution Time</h3>
            <span className="metric-icon">⏱️</span>
          </div>
          <div className="metric-value">{metrics.averageResolutionTime} days</div>
          <div className="metric-subtitle">Average case duration</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            {quickActions.map(action => (
              <div 
                key={action.id} 
                className="quick-action-card"
                style={{ borderLeftColor: action.color }}
                onClick={() => window.location.href = action.route}
              >
                <div className="action-icon" style={{ color: action.color }}>
                  {action.icon}
                </div>
                <div className="action-content">
                  <h4>{action.title}</h4>
                  <p>{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="recent-activities-section">
          <div className="section-header">
            <h2>Recent Activities</h2>
            <button className="view-all-btn">View All</button>
          </div>
          
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-header">
                    <h4>{activity.title}</h4>
                    <div 
                      className="activity-priority"
                      style={{ 
                        backgroundColor: getPriorityColor(activity.priority),
                        color: 'white'
                      }}
                    >
                      {activity.priority}
                    </div>
                  </div>
                  <p className="activity-description">{activity.description}</p>
                  <div className="activity-meta">
                    <span className="activity-time">{formatDate(activity.timestamp)}</span>
                    {activity.assignee && (
                      <span className="activity-assignee">Assigned to: {activity.assignee}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <div className="system-status">
          <span className="status-indicator online"></span>
          <span>System Status: Online</span>
        </div>
        <div className="last-updated">
          Last updated: {formatDate(new Date())}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;