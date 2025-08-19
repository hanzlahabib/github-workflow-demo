import React from 'react';

interface UserProfileProps {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'case_worker' | 'consultant' | 'viewer';
  lastActive?: Date;
}

/**
 * UserProfile component displays user information in the MOSD system
 * Supports different user roles with appropriate permissions display
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  name,
  email,
  role,
  lastActive
}) => {
  const getRoleDisplay = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'System Administrator';
      case 'case_worker':
        return 'Case Worker';
      case 'consultant':
        return 'Consultant';
      case 'viewer':
        return 'Viewer';
      default:
        return 'Unknown Role';
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'case_worker':
        return 'bg-blue-100 text-blue-800';
      case 'consultant':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastActive = (date?: Date): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xl font-semibold text-gray-600">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600">{email}</p>
          <p className="text-xs text-gray-500">ID: {userId}</p>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
        >
          {getRoleDisplay(role)}
        </span>
        
        <div className="text-right">
          <p className="text-xs text-gray-500">Last Active</p>
          <p className="text-sm font-medium text-gray-900">
            {formatLastActive(lastActive)}
          </p>
        </div>
      </div>
      
      {role === 'admin' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-xs text-yellow-800">
            ⚠️ Administrator privileges - Full system access
          </p>
        </div>
      )}
    </div>
  );
};

export default UserProfile;