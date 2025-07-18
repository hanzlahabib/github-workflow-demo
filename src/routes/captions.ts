import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Caption, Video } from '../models';
import { whisperService } from '../services/whisper';
import { upload } from '../middleware/upload';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../temp/videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `caption-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const videoUpload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Get all captions for a user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, status, language, search } = req.query;
    
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (language) {
      query.language = language;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'lines.text': { $regex: search, $options: 'i' } }
      ];
    }
    
    const captions = await Caption.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('videoId', 'title type output.videoUrl output.thumbnailUrl');
    
    const total = await Caption.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        captions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching captions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get specific caption by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const caption = await Caption.findOne({ _id: req.params.id, userId })
      .populate('videoId', 'title type output.videoUrl output.thumbnailUrl');
    
    if (!caption) {
      return res.status(404).json({ success: false, message: 'Caption not found' });
    }
    
    // Update analytics
    caption.analytics.viewCount += 1;
    caption.analytics.lastAccessed = new Date();
    await caption.save();
    
    res.json({
      success: true,
      data: { caption }
    });
  } catch (error) {
    console.error('Error fetching caption:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new caption from video upload
router.post('/upload', authenticateToken, videoUpload.single('video'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }
    
    const {
      title,
      language = 'en',
      settings = {}
    } = req.body;
    
    // Create caption record
    const caption = new Caption({
      userId,
      title: title || file.originalname,
      language,
      status: 'processing',
      source: {
        type: 'upload',
        originalFilename: file.originalname,
        fileSize: file.size,
        videoFormat: file.mimetype
      },
      settings: {
        timing: 'auto',
        autoSync: true,
        speakerDetection: false,
        noiseReduction: true,
        enhanceAudio: true,
        customDictionary: [],
        confidenceThreshold: 0.7,
        ...settings
      },
      lines: [],
      totalDuration: 0
    });
    
    await caption.save();
    
    // Process video in background
    processVideoForCaptions(caption._id.toString(), file.path);
    
    res.json({
      success: true,
      data: { caption }
    });
    
  } catch (error) {
    console.error('Error uploading video for captions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create caption from existing video
router.post('/from-video/:videoId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { videoId } = req.params;
    const { title, language = 'en', settings = {} } = req.body;
    
    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    
    // Create caption record
    const caption = new Caption({
      userId,
      videoId,
      title: title || `${video.title} - Captions`,
      language,
      status: 'processing',
      source: {
        type: 'generated',
        duration: video.output.duration,
        videoFormat: video.metadata.format
      },
      settings: {
        timing: 'auto',
        autoSync: true,
        speakerDetection: false,
        noiseReduction: true,
        enhanceAudio: true,
        customDictionary: [],
        confidenceThreshold: 0.7,
        ...settings
      },
      lines: [],
      totalDuration: video.output.duration || 0
    });
    
    await caption.save();
    
    // Process video for captions
    if (video.output.videoUrl) {
      processVideoUrlForCaptions(caption._id.toString(), video.output.videoUrl);
    }
    
    res.json({
      success: true,
      data: { caption }
    });
    
  } catch (error) {
    console.error('Error creating caption from video:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update caption
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, language, lines, style, settings } = req.body;
    
    const caption = await Caption.findOne({ _id: req.params.id, userId });
    if (!caption) {
      return res.status(404).json({ success: false, message: 'Caption not found' });
    }
    
    // Update fields
    if (title) caption.title = title;
    if (language) caption.language = language;
    if (lines) {
      caption.lines = lines;
      caption.totalDuration = caption.getDuration();
    }
    if (style) caption.style = { ...caption.style, ...style };
    if (settings) caption.settings = { ...caption.settings, ...settings };
    
    // Update analytics
    caption.analytics.editCount += 1;
    caption.analytics.lastAccessed = new Date();
    
    await caption.save();
    
    res.json({
      success: true,
      data: { caption }
    });
    
  } catch (error) {
    console.error('Error updating caption:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete caption
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const caption = await Caption.findOne({ _id: req.params.id, userId });
    
    if (!caption) {
      return res.status(404).json({ success: false, message: 'Caption not found' });
    }
    
    await Caption.deleteOne({ _id: req.params.id, userId });
    
    res.json({
      success: true,
      message: 'Caption deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting caption:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Export caption in various formats
router.get('/:id/export/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { format } = req.params;
    
    const caption = await Caption.findOne({ _id: req.params.id, userId });
    if (!caption) {
      return res.status(404).json({ success: false, message: 'Caption not found' });
    }
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    switch (format.toLowerCase()) {
      case 'srt':
        content = caption.exportToSRT();
        filename = `${caption.title}.srt`;
        mimeType = 'application/x-subrip';
        break;
      case 'vtt':
        content = caption.exportToVTT();
        filename = `${caption.title}.vtt`;
        mimeType = 'text/vtt';
        break;
      case 'json':
        content = JSON.stringify(caption.lines, null, 2);
        filename = `${caption.title}.json`;
        mimeType = 'application/json';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unsupported format' });
    }
    
    // Update usage tracking
    caption.usage.exportCount += 1;
    caption.usage.lastExported = new Date();
    if (!caption.usage.formats.includes(format)) {
      caption.usage.formats.push(format);
    }
    caption.analytics.exportCount += 1;
    
    await caption.save();
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mimeType);
    res.send(content);
    
  } catch (error) {
    console.error('Error exporting caption:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Apply caption template
router.post('/:id/apply-template', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { templateId, templateName, category } = req.body;
    
    const caption = await Caption.findOne({ _id: req.params.id, userId });
    if (!caption) {
      return res.status(404).json({ success: false, message: 'Caption not found' });
    }
    
    // Apply template styles based on category
    const templateStyles = getTemplateStyles(category);
    
    caption.style = { ...caption.style, ...templateStyles };
    caption.template = {
      id: templateId,
      name: templateName,
      category
    };
    
    await caption.save();
    
    res.json({
      success: true,
      data: { caption }
    });
    
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get caption templates
router.get('/templates/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'youtube-style',
        name: 'YouTube Style',
        category: 'youtube',
        preview: '/api/templates/youtube-preview.png',
        style: {
          fontSize: 24,
          fontFamily: 'Arial',
          fontColor: '#FFFFFF',
          backgroundColor: '#000000',
          backgroundOpacity: 70,
          position: 'bottom',
          animation: 'none'
        }
      },
      {
        id: 'tiktok-style',
        name: 'TikTok Style',
        category: 'tiktok',
        preview: '/api/templates/tiktok-preview.png',
        style: {
          fontSize: 28,
          fontFamily: 'Impact',
          fontColor: '#FFFFFF',
          backgroundColor: '#000000',
          backgroundOpacity: 0,
          position: 'center',
          animation: 'pop'
        }
      },
      {
        id: 'instagram-style',
        name: 'Instagram Style',
        category: 'instagram',
        preview: '/api/templates/instagram-preview.png',
        style: {
          fontSize: 26,
          fontFamily: 'Helvetica',
          fontColor: '#FFFFFF',
          backgroundColor: '#000000',
          backgroundOpacity: 50,
          position: 'bottom',
          animation: 'fade'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        category: 'professional',
        preview: '/api/templates/professional-preview.png',
        style: {
          fontSize: 22,
          fontFamily: 'Times New Roman',
          fontColor: '#FFFFFF',
          backgroundColor: '#000000',
          backgroundOpacity: 80,
          position: 'bottom',
          animation: 'none'
        }
      }
    ];
    
    res.json({
      success: true,
      data: { templates }
    });
    
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Helper functions
async function processVideoForCaptions(captionId: string, videoPath: string) {
  try {
    const caption = await Caption.findById(captionId);
    if (!caption) return;
    
    const startTime = Date.now();
    
    // Use Whisper service to generate captions
    const result = await whisperService.transcribeVideo(videoPath);
    
    const processingTime = Date.now() - startTime;
    
    // Update caption with results
    caption.lines = result.segments.map((segment: any, index: number) => ({
      id: `line-${index}`,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      confidence: segment.confidence || 0.9,
      speaker: segment.speaker || undefined
    }));
    
    caption.totalDuration = caption.getDuration();
    caption.status = 'completed';
    caption.processing = {
      engineUsed: 'whisper',
      processingTime,
      averageConfidence: caption.calculateAverageConfidence(),
      qualityScore: result.qualityScore || 0.8,
      wordsPerMinute: (caption.getWordCount() / (caption.totalDuration / 60)) || 0,
      errorCount: result.errors?.length || 0,
      warnings: result.warnings || []
    };
    
    await caption.save();
    
    // Clean up temporary file
    fs.unlinkSync(videoPath);
    
  } catch (error) {
    console.error('Error processing video for captions:', error);
    
    // Update caption with error status
    const caption = await Caption.findById(captionId);
    if (caption) {
      caption.status = 'failed';
      caption.processing.warnings.push(`Processing failed: ${error.message}`);
      await caption.save();
    }
  }
}

async function processVideoUrlForCaptions(captionId: string, videoUrl: string) {
  try {
    const caption = await Caption.findById(captionId);
    if (!caption) return;
    
    const startTime = Date.now();
    
    // Use Whisper service to generate captions from URL
    const result = await whisperService.transcribeVideoFromUrl(videoUrl);
    
    const processingTime = Date.now() - startTime;
    
    // Update caption with results
    caption.lines = result.segments.map((segment: any, index: number) => ({
      id: `line-${index}`,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      confidence: segment.confidence || 0.9,
      speaker: segment.speaker || undefined
    }));
    
    caption.totalDuration = caption.getDuration();
    caption.status = 'completed';
    caption.processing = {
      engineUsed: 'whisper',
      processingTime,
      averageConfidence: caption.calculateAverageConfidence(),
      qualityScore: result.qualityScore || 0.8,
      wordsPerMinute: (caption.getWordCount() / (caption.totalDuration / 60)) || 0,
      errorCount: result.errors?.length || 0,
      warnings: result.warnings || []
    };
    
    await caption.save();
    
  } catch (error) {
    console.error('Error processing video URL for captions:', error);
    
    // Update caption with error status
    const caption = await Caption.findById(captionId);
    if (caption) {
      caption.status = 'failed';
      caption.processing.warnings.push(`Processing failed: ${error.message}`);
      await caption.save();
    }
  }
}

function getTemplateStyles(category: string) {
  const templates = {
    youtube: {
      fontSize: 24,
      fontFamily: 'Arial',
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 70,
      position: 'bottom' as const,
      animation: 'none' as const
    },
    tiktok: {
      fontSize: 28,
      fontFamily: 'Impact',
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0,
      position: 'center' as const,
      animation: 'pop' as const
    },
    instagram: {
      fontSize: 26,
      fontFamily: 'Helvetica',
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 50,
      position: 'bottom' as const,
      animation: 'fade' as const
    },
    professional: {
      fontSize: 22,
      fontFamily: 'Times New Roman',
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 80,
      position: 'bottom' as const,
      animation: 'none' as const
    }
  };
  
  return templates[category] || templates.youtube;
}

export default router;