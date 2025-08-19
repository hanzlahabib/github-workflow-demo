import React from 'react';
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

describe('UserProfile Component', () => {
  const mockUser = {
    userId: 'user-123',
    name: 'Ahmed Al-Rashid',
    email: 'ahmed.rashid@mosd.gov.om',
    role: 'case_worker' as const,
    lastActive: new Date('2023-12-01T10:30:00Z')
  };

  test('renders user information correctly', () => {
    render(<UserProfile {...mockUser} />);
    
    expect(screen.getByText('Ahmed Al-Rashid')).toBeInTheDocument();
    expect(screen.getByText('ahmed.rashid@mosd.gov.om')).toBeInTheDocument();
    expect(screen.getByText('ID: user-123')).toBeInTheDocument();
  });

  test('displays correct role badge for case worker', () => {
    render(<UserProfile {...mockUser} />);
    
    expect(screen.getByText('Case Worker')).toBeInTheDocument();
  });

  test('shows admin warning for admin users', () => {
    const adminUser = { ...mockUser, role: 'admin' as const };
    render(<UserProfile {...adminUser} />);
    
    expect(screen.getByText(/Administrator privileges/)).toBeInTheDocument();
  });

  test('handles missing last active date', () => {
    const userWithoutLastActive = { ...mockUser, lastActive: undefined };
    render(<UserProfile {...userWithoutLastActive} />);
    
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  test('displays user initials in avatar', () => {
    render(<UserProfile {...mockUser} />);
    
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});