import express from 'express';
import { getS3Service } from '../services/s3';

const router = express.Router();

// List background videos from R2
router.get('/videos/backgrounds', async (req, res) => {
  try {
    const s3Service = getS3Service();
    
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // List objects with prefix for background videos
    const objects = await s3Service.listObjects({
      prefix: 'backgrounds/videos/',
      maxKeys: 100
    });

    // Transform S3 objects to video metadata format
    const videos = objects
      .filter(obj => obj.key.match(/\.(mp4|mov|avi|webm)$/i))
      .map(obj => ({
        id: obj.key.replace('backgrounds/videos/', '').replace(/\.[^/.]+$/, ''),
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        category: 'background',
        videoUrl: s3Service.getPublicUrl(obj.key),
        size: obj.size,
        duration: null, // Would need additional metadata
        uploadedAt: obj.lastModified,
        isPublic: true
      }));

    res.json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('Error listing background videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list background videos'
    });
  }
});

// List user's videos from R2
router.get('/videos/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const s3Service = getS3Service();
    
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // List objects with prefix for user videos
    const objects = await s3Service.listObjects({
      prefix: `users/${userId}/videos/`,
      maxKeys: 100
    });

    // Transform S3 objects to video metadata format
    const videos = objects
      .filter(obj => obj.key.match(/\.(mp4|mov|avi|webm)$/i))
      .map(obj => ({
        id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        category: 'custom',
        videoUrl: s3Service.getPublicUrl(obj.key),
        size: obj.size,
        duration: null,
        uploadedAt: obj.lastModified,
        isPublic: false
      }));

    res.json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('Error listing user videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list user videos'
    });
  }
});

// List background audio tracks from R2
router.get('/audio/backgrounds', async (req, res) => {
  try {
    const s3Service = getS3Service();
    
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // List objects with prefix for background audio
    const objects = await s3Service.listObjects({
      prefix: 'backgrounds/audio/',
      maxKeys: 100
    });

    // Transform S3 objects to audio metadata format
    const tracks = objects
      .filter(obj => obj.key.match(/\.(mp3|wav|m4a|aac|ogg)$/i))
      .map(obj => ({
        id: obj.key.replace('backgrounds/audio/', '').replace(/\.[^/.]+$/, ''),
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        category: 'background',
        url: s3Service.getPublicUrl(obj.key),
        size: obj.size,
        duration: null,
        uploadedAt: obj.lastModified,
        isPublic: true
      }));

    res.json({
      success: true,
      tracks
    });
  } catch (error) {
    console.error('Error listing background audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list background audio'
    });
  }
});

// List user's audio tracks from R2
router.get('/audio/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const s3Service = getS3Service();
    
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // List objects with prefix for user audio
    const objects = await s3Service.listObjects({
      prefix: `users/${userId}/audio/`,
      maxKeys: 100
    });

    // Transform S3 objects to audio metadata format
    const tracks = objects
      .filter(obj => obj.key.match(/\.(mp3|wav|m4a|aac|ogg)$/i))
      .map(obj => ({
        id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        category: 'custom',
        url: s3Service.getPublicUrl(obj.key),
        size: obj.size,
        duration: null,
        uploadedAt: obj.lastModified,
        isPublic: false
      }));

    res.json({
      success: true,
      tracks
    });
  } catch (error) {
    console.error('Error listing user audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list user audio'
    });
  }
});

// List all assets for a user
router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // 'video', 'audio', or 'all'
    const s3Service = getS3Service();
    
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // List objects with prefix for user assets
    const objects = await s3Service.listObjects({
      prefix: `users/${userId}/`,
      maxKeys: 1000
    });

    // Filter and transform objects based on type
    let assets = objects.map(obj => {
      const isVideo = obj.key.match(/\.(mp4|mov|avi|webm)$/i);
      const isAudio = obj.key.match(/\.(mp3|wav|m4a|aac|ogg)$/i);
      const isImage = obj.key.match(/\.(jpg|jpeg|png|gif|webp)$/i);

      if (!isVideo && !isAudio && !isImage) return null;

      return {
        id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        url: s3Service.getPublicUrl(obj.key),
        size: obj.size,
        uploadedAt: obj.lastModified,
        isPublic: false
      };
    }).filter(Boolean);

    // Filter by type if specified
    if (type && type !== 'all') {
      assets = assets.filter(asset => asset?.type === type);
    }

    res.json({
      success: true,
      assets,
      count: assets.length
    });
  } catch (error) {
    console.error('Error listing user assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list user assets'
    });
  }
});

export default router;