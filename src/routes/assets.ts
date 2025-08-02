import express from 'express';
import { getStorageProvider, uploadFile, uploadBuffer, deleteFile, getPublicUrl, listFiles, healthCheck, switchStorageProvider, getProviderInfo } from '../services/storageService';
import { videoUpload, audioUpload, handleUploadError } from '../middleware/upload';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// List background videos from current storage provider
router.get('/videos/backgrounds', async (req, res) => {
  try {
    // List objects with prefix for background videos
    const result = await listFiles('backgrounds/videos/', 100);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to list background videos'
      });
    }

    // Transform storage objects to video metadata format
    const videos = result.files
      .filter(obj => obj.key.match(/\.(mp4|mov|avi|webm)$/i))
      .map(obj => ({
        id: obj.key.replace('backgrounds/videos/', '').replace(/\.[^/.]+$/, ''),
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        category: 'background',
        videoUrl: getPublicUrl(obj.key),
        size: obj.size,
        duration: null, // Would need additional metadata
        uploadedAt: obj.lastModified,
        isPublic: true
      }));

    res.json({
      success: true,
      videos,
      provider: getProviderInfo()
    });
  } catch (error) {
    console.error('Error listing background videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list background videos'
    });
  }
});

// List user's videos from current storage provider
router.get('/videos/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // List objects with prefix for user videos
    const result = await listFiles(`users/${userId}/videos/`, 100);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to list user videos'
      });
    }

    // Transform storage objects to video metadata format with signed URLs
    const storageProvider = getStorageProvider();
    const videos = await Promise.all(
      result.files
        .filter(obj => obj.key.match(/\.(mp4|mov|avi|webm)$/i))
        .map(async obj => ({
          id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
          name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
          category: 'custom',
          videoUrl: await storageProvider.getSignedUrl(obj.key, 3600),
          size: obj.size,
          duration: null,
          uploadedAt: obj.lastModified,
          isPublic: false
        }))
    );

    res.json({
      success: true,
      videos,
      provider: getProviderInfo()
    });
  } catch (error) {
    console.error('Error listing user videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list user videos'
    });
  }
});

// List background audio tracks from current storage provider
router.get('/audio/backgrounds', async (req, res) => {
  try {
    // List objects with prefix for background audio
    const result = await listFiles('backgrounds/audio/', 100);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to list background audio'
      });
    }

    // Transform storage objects to audio metadata format
    const tracks = result.files
      .filter(obj => obj.key.match(/\.(mp3|wav|m4a|aac|ogg)$/i))
      .map(obj => ({
        id: obj.key.replace('backgrounds/audio/', '').replace(/\.[^/.]+$/, ''),
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        category: 'background',
        url: getPublicUrl(obj.key),
        size: obj.size,
        duration: null,
        uploadedAt: obj.lastModified,
        isPublic: true
      }));

    res.json({
      success: true,
      tracks,
      provider: getProviderInfo()
    });
  } catch (error) {
    console.error('Error listing background audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list background audio'
    });
  }
});

// List user's audio tracks from current storage provider
router.get('/audio/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // List objects with prefix for user audio
    const result = await listFiles(`users/${userId}/audio/`, 100);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to list user audio'
      });
    }

    // Transform storage objects to audio metadata format
    const tracks = result.files
      .filter(obj => obj.key.match(/\.(mp3|wav|m4a|aac|ogg)$/i))
      .map(obj => ({
        id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
        name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
        category: 'custom',
        url: getPublicUrl(obj.key),
        size: obj.size,
        duration: null,
        uploadedAt: obj.lastModified,
        isPublic: false
      }));

    res.json({
      success: true,
      tracks,
      provider: getProviderInfo()
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

    // List objects with prefix for user assets
    const result = await listFiles(`users/${userId}/`, 1000);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to list user assets'
      });
    }

    // Filter and transform objects based on type with signed URLs
    const storageProvider = getStorageProvider();
    let assets = await Promise.all(
      result.files.map(async obj => {
        const isVideo = obj.key.match(/\.(mp4|mov|avi|webm)$/i);
        const isAudio = obj.key.match(/\.(mp3|wav|m4a|aac|ogg)$/i);
        const isImage = obj.key.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        if (!isVideo && !isAudio && !isImage) return null;

        return {
          id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
          name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
          type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          url: await storageProvider.getSignedUrl(obj.key, 3600),
          size: obj.size,
          uploadedAt: obj.lastModified,
          isPublic: false
        };
      })
    );
    assets = assets.filter(Boolean);

    // Filter by type if specified
    if (type && type !== 'all') {
      assets = assets.filter(asset => asset?.type === type);
    }

    res.json({
      success: true,
      assets,
      count: assets.length,
      provider: getProviderInfo()
    });
  } catch (error) {
    console.error('Error listing user assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list user assets'
    });
  }
});

// Generic upload endpoint for library assets
router.post('/upload', videoUpload.single('video'), handleUploadError, async (req, res) => {
  try {
    const uploadedFile = req.file;
    const { userId = '1' } = req.body; // Default to user 1 if not provided

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    // Determine file type
    const isVideo = uploadedFile.mimetype.startsWith('video/');
    const isAudio = uploadedFile.mimetype.startsWith('audio/');
    
    if (!isVideo && !isAudio) {
      return res.status(400).json({
        success: false,
        error: 'Only video and audio files are supported'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const assetType = isVideo ? 'videos' : 'audio';
    const s3Key = `users/${userId}/${assetType}/${fileName}`;

    // Read file and upload using storage service
    const fileBuffer = fs.readFileSync(uploadedFile.path);
    const uploadResult = await uploadBuffer(fileBuffer, s3Key, {
      contentType: uploadedFile.mimetype
    });

    // Clean up temporary file
    fs.unlinkSync(uploadedFile.path);

    res.json({
      success: true,
      asset: {
        id: fileName.replace(fileExtension, ''),
        name: uploadedFile.originalname.replace(fileExtension, ''),
        type: assetType.slice(0, -1), // Remove 's' to get 'video' or 'audio'
        url: uploadResult.url,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        isPublic: false
      }
    });

  } catch (error) {
    console.error('Error uploading asset:', error);
    
    // Clean up temporary file on error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload asset'
    });
  }
});

// Upload video to user's library
router.post('/videos/upload/:userId', videoUpload.single('video'), handleUploadError, async (req, res) => {
  try {
    const { userId } = req.params;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const s3Key = `users/${userId}/videos/${fileName}`;

    // Read file and upload using storage service
    const fileBuffer = fs.readFileSync(uploadedFile.path);
    const uploadResult = await uploadBuffer(fileBuffer, s3Key, {
      contentType: uploadedFile.mimetype
    });

    // Clean up temporary file
    fs.unlinkSync(uploadedFile.path);

    res.json({
      success: true,
      video: {
        id: fileName.replace(fileExtension, ''),
        name: uploadedFile.originalname.replace(fileExtension, ''),
        type: 'video',
        url: uploadResult.url,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        isPublic: false
      }
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    
    // Clean up temporary file on error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload video'
    });
  }
});

// Upload audio to user's library
router.post('/audio/upload/:userId', audioUpload.single('audio'), handleUploadError, async (req, res) => {
  try {
    const { userId } = req.params;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const s3Key = `users/${userId}/audio/${fileName}`;

    // Read file and upload using storage service
    const fileBuffer = fs.readFileSync(uploadedFile.path);
    const uploadResult = await uploadBuffer(fileBuffer, s3Key, {
      contentType: uploadedFile.mimetype
    });

    // Clean up temporary file
    fs.unlinkSync(uploadedFile.path);

    res.json({
      success: true,
      audio: {
        id: fileName.replace(fileExtension, ''),
        name: uploadedFile.originalname.replace(fileExtension, ''),
        type: 'audio',
        url: uploadResult.url,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        isPublic: false
      }
    });

  } catch (error) {
    console.error('Error uploading audio:', error);
    
    // Clean up temporary file on error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload audio'
    });
  }
});

// Delete a specific asset
router.delete('/delete/:userId/:assetId', async (req, res) => {
  try {
    const { userId, assetId } = req.params;
    const { type } = req.query; // 'video', 'audio', or 'image'
    
    if (!userId || !assetId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or assetId'
      });
    }

    // Determine asset type and build potential keys to check
    const assetTypes = type ? [type] : ['videos', 'audio', 'images'];
    let deletedKey = null;
    let assetFound = false;

    for (const assetType of assetTypes) {
      // List objects with the user's prefix to find the exact key
      const result = await listFiles(`users/${userId}/${assetType}/`, 1000);
      
      if (!result.success) {
        continue;
      }

      // Find the object that matches the assetId (filename without extension)
      const matchingObject = result.files.find(obj => {
        const fileName = obj.key.split('/').pop();
        const fileNameWithoutExt = fileName?.replace(/\.[^/.]+$/, '');
        return fileNameWithoutExt === assetId;
      });

      if (matchingObject) {
        const deleteResult = await deleteFile(matchingObject.key);
        if (deleteResult.success) {
          deletedKey = matchingObject.key;
          assetFound = true;
          break;
        }
      }
    }

    if (!assetFound) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    console.log(`[Assets] Successfully deleted: ${deletedKey}`);

    res.json({
      success: true,
      message: 'Asset deleted successfully',
      deletedKey
    });

  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete asset'
    });
  }
});

// Delete multiple assets at once
router.delete('/delete-batch/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { assetIds } = req.body; // Array of asset IDs
    
    if (!userId || !assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or assetIds array'
      });
    }

    // Get all user objects to find matching keys
    const result = await listFiles(`users/${userId}/`, 1000);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to list user assets'
      });
    }

    // Find keys that match the provided asset IDs
    const keysToDelete: string[] = [];
    const notFoundIds: string[] = [];

    for (const assetId of assetIds) {
      const matchingObject = result.files.find(obj => {
        const fileName = obj.key.split('/').pop();
        const fileNameWithoutExt = fileName?.replace(/\.[^/.]+$/, '');
        return fileNameWithoutExt === assetId;
      });

      if (matchingObject) {
        keysToDelete.push(matchingObject.key);
      } else {
        notFoundIds.push(assetId);
      }
    }

    if (keysToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching assets found',
        notFoundIds
      });
    }

    // Delete the files
    const deletePromises = keysToDelete.map(key => deleteFile(key));
    await Promise.all(deletePromises);

    console.log(`[Assets] Successfully deleted ${keysToDelete.length} assets for user ${userId}`);

    res.json({
      success: true,
      message: `Successfully deleted ${keysToDelete.length} asset(s)`,
      deletedCount: keysToDelete.length,
      deletedKeys: keysToDelete,
      notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined
    });

  } catch (error) {
    console.error('Error deleting assets in batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assets'
    });
  }
});

// ===============================
// ADMIN ENDPOINTS FOR STORAGE MANAGEMENT
// ===============================

// Get current storage provider info
router.get('/admin/storage/info', async (req, res) => {
  try {
    const info = getProviderInfo();
    const health = await healthCheck();
    
    res.json({
      success: true,
      storage: {
        ...info,
        ...health
      }
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage information'
    });
  }
});

// Switch storage provider
router.post('/admin/storage/switch', async (req, res) => {
  try {
    const { provider, bucket } = req.body;
    
    if (!provider || !['aws', 'r2'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "aws" or "r2"'
      });
    }

    console.log(`[Admin] Switching storage provider to: ${provider}`);
    
    // Switch the provider
    const newProvider = switchStorageProvider(provider, bucket);
    
    // Test the new provider
    const health = await healthCheck();
    
    if (!health.healthy) {
      return res.status(500).json({
        success: false,
        error: `Failed to switch to ${provider}: ${health.error}`
      });
    }

    // Update environment variable (runtime only, not persistent)
    process.env.STORAGE_PROVIDER = provider;
    if (bucket) {
      if (provider === 'aws') {
        process.env.AWS_S3_BUCKET = bucket;
      } else {
        process.env.R2_BUCKET_NAME = bucket;
      }
    }

    res.json({
      success: true,
      message: `Successfully switched to ${provider} provider`,
      storage: {
        ...getProviderInfo(),
        ...health
      }
    });

  } catch (error) {
    console.error('Error switching storage provider:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to switch storage provider'
    });
  }
});

// Storage health check
router.get('/admin/storage/health', async (req, res) => {
  try {
    const health = await healthCheck();
    
    res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      ...health
    });
  } catch (error) {
    console.error('Error checking storage health:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

// Upload default assets (admin only - for populating background videos/audio)
router.post('/admin/assets/upload', videoUpload.single('file'), handleUploadError, async (req, res) => {
  try {
    const uploadedFile = req.file;
    const { category, name } = req.body; // category: 'backgrounds/videos' or 'backgrounds/audio'

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    if (!category || !['backgrounds/videos', 'backgrounds/audio'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Must be "backgrounds/videos" or "backgrounds/audio"'
      });
    }

    // Generate filename
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = name ? `${name}${fileExtension}` : uploadedFile.originalname;
    const s3Key = `${category}/${fileName}`;

    // Read file and upload using storage service
    const fileBuffer = fs.readFileSync(uploadedFile.path);
    const uploadResult = await uploadBuffer(fileBuffer, s3Key, {
      contentType: uploadedFile.mimetype
    });

    // Clean up temporary file
    fs.unlinkSync(uploadedFile.path);

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        error: uploadResult.error || 'Upload failed'
      });
    }

    res.json({
      success: true,
      asset: {
        id: fileName.replace(fileExtension, ''),
        name: fileName.replace(fileExtension, ''),
        category: category.split('/')[1], // 'videos' or 'audio'
        url: uploadResult.url,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        isPublic: true,
        provider: getProviderInfo().provider
      }
    });

  } catch (error) {
    console.error('Error uploading admin asset:', error);
    
    // Clean up temporary file on error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload asset'
    });
  }
});

// Delete default assets (admin only)
router.delete('/admin/assets/delete', async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Asset key is required'
      });
    }

    const deleteResult = await deleteFile(key);

    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        error: deleteResult.error || 'Delete failed'
      });
    }

    res.json({
      success: true,
      message: 'Asset deleted successfully',
      deletedKey: key,
      provider: getProviderInfo().provider
    });

  } catch (error) {
    console.error('Error deleting admin asset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete asset'
    });
  }
});

export default router;