import express from 'express';

const router = express.Router();

// Mock data for development
const mockKillSwitches = [
  {
    id: 'ks-1',
    type: 'service',
    target: 'video-processing',
    reason: 'High CPU usage detected',
    severity: 'medium',
    isActive: true,
    createdAt: new Date('2025-08-02T06:00:00Z'),
    expiresAt: new Date('2025-08-02T18:00:00Z'),
    createdBy: 'admin@reelspeed.com'
  },
  {
    id: 'ks-2',
    type: 'feature',
    target: 'ai-voice-generation',
    reason: 'API rate limit exceeded',
    severity: 'high',
    isActive: true,
    createdAt: new Date('2025-08-02T05:30:00Z'),
    expiresAt: new Date('2025-08-02T15:30:00Z'),
    createdBy: 'system@reelspeed.com'
  }
];

const mockUsers = [
  {
    id: 'user-1',
    email: 'john.doe@example.com',
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    role: 'admin',
    tier: 'pro',
    isActive: true,
    createdAt: new Date('2025-07-15T00:00:00Z'),
    lastLoginAt: new Date('2025-08-02T06:30:00Z'),
    stats: {
      totalSpent: 299.99,
      totalVideos: 45,
      storageUsed: 1024000000,
      apiCalls: 1250
    },
    limits: {
      dailySpendLimit: 50,
      monthlySpendLimit: 500,
      dailyVideoLimit: 10,
      monthlyVideoLimit: 100,
      storageLimit: 5000000000,
      apiCallLimit: 1000
    }
  },
  {
    id: 'user-2',
    email: 'jane.smith@company.com',
    username: 'janesmith',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'moderator',
    tier: 'enterprise',
    isActive: true,
    createdAt: new Date('2025-07-10T00:00:00Z'),
    lastLoginAt: new Date('2025-08-01T14:20:00Z'),
    stats: {
      totalSpent: 1250.50,
      totalVideos: 124,
      storageUsed: 3024000000,
      apiCalls: 3500
    },
    limits: {
      dailySpendLimit: 200,
      monthlySpendLimit: 2000,
      dailyVideoLimit: 50,
      monthlyVideoLimit: 500,
      storageLimit: 10000000000,
      apiCallLimit: 5000
    }
  }
];

const mockConfigs = [
  {
    id: 'config-1',
    service: 'video-processing',
    key: 'max_concurrent_jobs',
    value: 10,
    environment: 'production',
    description: 'Maximum number of concurrent video processing jobs',
    isActive: true,
    lastModified: new Date('2025-08-01T00:00:00Z'),
    modifiedBy: 'admin@reelspeed.com'
  },
  {
    id: 'config-2',
    service: 'ai-voice',
    key: 'rate_limit_per_minute',
    value: 100,
    environment: 'production',
    description: 'Rate limit for AI voice generation requests per minute',
    isActive: true,
    lastModified: new Date('2025-07-30T00:00:00Z'),
    modifiedBy: 'system@reelspeed.com'
  }
];

// Kill Switches API
router.get('/kill-switches', (req, res) => {
  const { page = 1, limit = 20, search, type, status } = req.query;
  
  let filteredSwitches = [...mockKillSwitches];
  
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filteredSwitches = filteredSwitches.filter(ks => 
      ks.target.toLowerCase().includes(searchLower) ||
      ks.reason.toLowerCase().includes(searchLower)
    );
  }
  
  if (type && type !== 'all') {
    filteredSwitches = filteredSwitches.filter(ks => ks.type === type);
  }
  
  if (status && status !== 'all') {
    const isActive = status === 'active';
    filteredSwitches = filteredSwitches.filter(ks => ks.isActive === isActive);
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedSwitches = filteredSwitches.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedSwitches,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: filteredSwitches.length,
      totalPages: Math.ceil(filteredSwitches.length / Number(limit))
    }
  });
});

router.get('/kill-switches/active', (req, res) => {
  const activeSwitches = mockKillSwitches.filter(ks => ks.isActive);
  res.json({
    success: true,
    data: activeSwitches
  });
});

// Users API
router.get('/users', (req, res) => {
  const { page = 1, limit = 20, search, role, tier, status } = req.query;
  
  let filteredUsers = [...mockUsers];
  
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filteredUsers = filteredUsers.filter(user => 
      user.email.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
    );
  }
  
  if (role && role !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }
  
  if (tier && tier !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.tier === tier);
  }
  
  if (status && status !== 'all') {
    const isActive = status === 'active';
    filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / Number(limit))
    }
  });
});

// Configs API
router.get('/configs', (req, res) => {
  const { page = 1, limit = 20, search, service, environment } = req.query;
  
  let filteredConfigs = [...mockConfigs];
  
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filteredConfigs = filteredConfigs.filter(config => 
      config.key.toLowerCase().includes(searchLower) ||
      config.description.toLowerCase().includes(searchLower)
    );
  }
  
  if (service && service !== 'all') {
    filteredConfigs = filteredConfigs.filter(config => config.service === service);
  }
  
  if (environment && environment !== 'all') {
    filteredConfigs = filteredConfigs.filter(config => config.environment === environment);
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedConfigs = filteredConfigs.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedConfigs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: filteredConfigs.length,
      totalPages: Math.ceil(filteredConfigs.length / Number(limit))
    }
  });
});

export default router;