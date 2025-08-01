import express from 'express';
import { getS3Service } from '../services/s3';
import { videoUpload, audioUpload, handleUploadError } from '../middleware/upload';
import fs from 'fs';
import path from 'path';

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

    // Transform S3 objects to video metadata format with signed URLs
    const videos = await Promise.all(
      objects
        .filter(obj => obj.key.match(/\.(mp4|mov|avi|webm)$/i))
        .map(async obj => ({
          id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
          name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
          category: 'custom',
          videoUrl: await s3Service.getSignedUrl(obj.key, 'getObject', { expires: 3600 }),
          size: obj.size,
          duration: null,
          uploadedAt: obj.lastModified,
          isPublic: false
        }))
    );

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

    // Filter and transform objects based on type with signed URLs
    let assets = await Promise.all(
      objects.map(async obj => {
        const isVideo = obj.key.match(/\.(mp4|mov|avi|webm)$/i);
        const isAudio = obj.key.match(/\.(mp3|wav|m4a|aac|ogg)$/i);
        const isImage = obj.key.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        if (!isVideo && !isAudio && !isImage) return null;

        return {
          id: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
          name: obj.key.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
          type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          url: await s3Service.getSignedUrl(obj.key, 'getObject', { expires: 3600 }),
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

    const s3Service = getS3Service();
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
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

    // Upload file to S3
    const uploadResult = await s3Service.uploadFile(uploadedFile.path, {
      key: s3Key,
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

    const s3Service = getS3Service();
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const s3Key = `users/${userId}/videos/${fileName}`;

    // Upload file to S3
    const uploadResult = await s3Service.uploadFile(uploadedFile.path, {
      key: s3Key,
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

    const s3Service = getS3Service();
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const s3Key = `users/${userId}/audio/${fileName}`;

    // Upload file to S3
    const uploadResult = await s3Service.uploadFile(uploadedFile.path, {
      key: s3Key,
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

    const s3Service = getS3Service();
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // Determine asset type and build potential keys to check
    const assetTypes = type ? [type] : ['videos', 'audio', 'images'];
    let deletedKey = null;
    let assetFound = false;

    for (const assetType of assetTypes) {
      // List objects with the user's prefix to find the exact key
      const objects = await s3Service.listObjects({
        prefix: `users/${userId}/${assetType}/`,
        maxKeys: 1000
      });

      // Find the object that matches the assetId (filename without extension)
      const matchingObject = objects.find(obj => {
        const fileName = obj.key.split('/').pop();
        const fileNameWithoutExt = fileName?.replace(/\.[^/.]+$/, '');
        return fileNameWithoutExt === assetId;
      });

      if (matchingObject) {
        await s3Service.deleteFile(matchingObject.key);
        deletedKey = matchingObject.key;
        assetFound = true;
        break;
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

    const s3Service = getS3Service();
    if (!s3Service) {
      return res.status(503).json({
        success: false,
        error: 'Storage service not available'
      });
    }

    // Get all user objects to find matching keys
    const objects = await s3Service.listObjects({
      prefix: `users/${userId}/`,
      maxKeys: 1000
    });

    // Find keys that match the provided asset IDs
    const keysToDelete: string[] = [];
    const notFoundIds: string[] = [];

    for (const assetId of assetIds) {
      const matchingObject = objects.find(obj => {
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
    await s3Service.deleteFiles(keysToDelete);

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

export default router;