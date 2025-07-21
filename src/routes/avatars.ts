import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../utils/jwt';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getStorageConfig } from '../config';

const router = express.Router();

// Configure AWS S3 using centralized configuration
const storageConfig = getStorageConfig();
const s3 = new S3Client({
  region: storageConfig.aws?.region || 'us-east-1',
  credentials: {
    accessKeyId: storageConfig.aws?.accessKeyId || '',
    secretAccessKey: storageConfig.aws?.secretAccessKey || '',
  },
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload new avatar for user
router.post('/upload', authenticateToken, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Avatar name is required' });
    }

    // Process image with sharp - resize and optimize
    const processedBuffer = await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Generate unique filename
    const avatarId = uuidv4();
    const fileName = `avatars/${req.user.id}/${avatarId}.jpg`;

    // Upload to S3
    const uploadParams = {
      Bucket: storageConfig.aws?.bucket || 'reelspeed-assets',
      Key: fileName,
      Body: processedBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read' as const
    };

    const command = new PutObjectCommand(uploadParams);
    const result = await s3.send(command);
    const location = `https://${uploadParams.Bucket}.s3.${storageConfig.aws?.region || 'us-east-1'}.amazonaws.com/${fileName}`;

    // Create avatar object
    const avatar = {
      id: avatarId,
      name: name,
      url: location,
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    // In a real app, you'd save this to your database
    // For now, we'll return the avatar object
    res.json({
      success: true,
      avatar
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get user's custom avatars
router.get('/library', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // In a real app, you'd fetch from your database
    // For now, return mock data
    const customAvatars = [
      {
        id: 'custom1',
        name: 'My Photo',
        url: 'https://ui-avatars.com/api/?name=Custom&background=FF6B6B&color=fff&size=128',
        userId: req.user.id,
        createdAt: new Date().toISOString(),
        isCustom: true
      }
    ];

    res.json({
      avatars: customAvatars
    });
  } catch (error) {
    console.error('Error fetching avatar library:', error);
    res.status(500).json({ error: 'Failed to fetch avatar library' });
  }
});

// Delete custom avatar
router.delete('/:avatarId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { avatarId } = req.params;

    // In a real app, you'd:
    // 1. Verify the avatar belongs to the user
    // 2. Delete from S3
    // 3. Remove from database

    const deleteParams = {
      Bucket: storageConfig.aws?.bucket || 'reelspeed-assets',
      Key: `avatars/${req.user.id}/${avatarId}.jpg`
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3.send(command);

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

export { router as avatarRoutes };
