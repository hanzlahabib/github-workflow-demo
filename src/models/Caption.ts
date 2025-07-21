import mongoose, { Document, Schema } from 'mongoose';

export interface ICaptionLine {
  id: string;
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
  isEdited?: boolean;
  originalText?: string;
}

export interface ICaptionStyle {
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'typewriter' | 'fade' | 'pop';
  maxWordsPerLine: number;
  highlightKeywords: boolean;
  addEmojis: boolean;
  borderRadius: number;
  padding: number;
  shadow: boolean;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
}

export interface ICaption extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  videoId?: mongoose.Types.ObjectId;
  title: string;
  language: string;
  status: 'processing' | 'completed' | 'failed' | 'editing';

  // Methods
  calculateAverageConfidence(): number;
  getWordCount(): number;
  getDuration(): number;
  exportToSRT(): string;
  exportToVTT(): string;
  formatTime(seconds: number): string;

  // Caption content
  lines: ICaptionLine[];
  totalDuration: number;

  // Styling
  style: ICaptionStyle;

  // Settings
  settings: {
    timing: 'auto' | 'manual';
    autoSync: boolean;
    speakerDetection: boolean;
    noiseReduction: boolean;
    enhanceAudio: boolean;
    customDictionary: string[];
    confidenceThreshold: number;
  };

  // Source information
  source: {
    type: 'upload' | 'url' | 'generated';
    originalFilename?: string;
    fileSize?: number;
    duration?: number;
    audioFormat?: string;
    videoFormat?: string;
    sourceUrl?: string;
  };

  // Processing metadata
  processing: {
    engineUsed: 'whisper' | 'deepgram' | 'azure' | 'google';
    processingTime: number;
    averageConfidence: number;
    qualityScore: number;
    wordsPerMinute: number;
    errorCount: number;
    warnings: string[];
  };

  // Usage tracking
  usage: {
    exportCount: number;
    lastExported?: Date;
    formats: string[];
    platforms: string[];
  };

  // Templates and presets
  template?: {
    id: string;
    name: string;
    category: 'youtube' | 'tiktok' | 'instagram' | 'professional' | 'custom';
  };

  // Collaboration
  isShared: boolean;
  sharedWith: mongoose.Types.ObjectId[];
  permissions: {
    canEdit: boolean;
    canExport: boolean;
    canShare: boolean;
  };

  // Analytics
  analytics: {
    viewCount: number;
    editCount: number;
    exportCount: number;
    shareCount: number;
    lastAccessed: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const captionLineSchema = new Schema<ICaptionLine>({
  id: { type: String, required: true },
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  text: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  speaker: String,
  isEdited: { type: Boolean, default: false },
  originalText: String
});

const captionStyleSchema = new Schema<ICaptionStyle>({
  fontSize: { type: Number, default: 24, min: 12, max: 72 },
  fontFamily: { type: String, default: 'Arial' },
  fontColor: { type: String, default: '#FFFFFF' },
  backgroundColor: { type: String, default: '#000000' },
  backgroundOpacity: { type: Number, default: 70, min: 0, max: 100 },
  position: { type: String, enum: ['top', 'center', 'bottom'], default: 'bottom' },
  animation: { type: String, enum: ['none', 'typewriter', 'fade', 'pop'], default: 'none' },
  maxWordsPerLine: { type: Number, default: 8, min: 3, max: 20 },
  highlightKeywords: { type: Boolean, default: false },
  addEmojis: { type: Boolean, default: false },
  borderRadius: { type: Number, default: 4, min: 0, max: 20 },
  padding: { type: Number, default: 8, min: 0, max: 20 },
  shadow: { type: Boolean, default: false },
  outline: { type: Boolean, default: false },
  outlineColor: { type: String, default: '#000000' },
  outlineWidth: { type: Number, default: 1, min: 0, max: 5 }
});

const captionSchema = new Schema<ICaption>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: false
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  language: {
    type: String,
    required: true,
    default: 'en'
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'editing'],
    default: 'processing'
  },

  // Caption content
  lines: [captionLineSchema],
  totalDuration: { type: Number, default: 0 },

  // Styling
  style: {
    type: captionStyleSchema,
    default: () => ({})
  },

  // Settings
  settings: {
    timing: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    autoSync: { type: Boolean, default: true },
    speakerDetection: { type: Boolean, default: false },
    noiseReduction: { type: Boolean, default: true },
    enhanceAudio: { type: Boolean, default: true },
    customDictionary: [String],
    confidenceThreshold: { type: Number, default: 0.7, min: 0, max: 1 }
  },

  // Source information
  source: {
    type: { type: String, enum: ['upload', 'url', 'generated'], required: true },
    originalFilename: String,
    fileSize: Number,
    duration: Number,
    audioFormat: String,
    videoFormat: String,
    sourceUrl: String
  },

  // Processing metadata
  processing: {
    engineUsed: { type: String, enum: ['whisper', 'deepgram', 'azure', 'google'], default: 'whisper' },
    processingTime: { type: Number, default: 0 },
    averageConfidence: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0 },
    wordsPerMinute: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    warnings: [String]
  },

  // Usage tracking
  usage: {
    exportCount: { type: Number, default: 0 },
    lastExported: Date,
    formats: [String],
    platforms: [String]
  },

  // Templates and presets
  template: {
    id: String,
    name: String,
    category: { type: String, enum: ['youtube', 'tiktok', 'instagram', 'professional', 'custom'] }
  },

  // Collaboration
  isShared: { type: Boolean, default: false },
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  permissions: {
    canEdit: { type: Boolean, default: true },
    canExport: { type: Boolean, default: true },
    canShare: { type: Boolean, default: false }
  },

  // Analytics
  analytics: {
    viewCount: { type: Number, default: 0 },
    editCount: { type: Number, default: 0 },
    exportCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
captionSchema.index({ userId: 1, createdAt: -1 });
captionSchema.index({ videoId: 1 });
captionSchema.index({ status: 1 });
captionSchema.index({ language: 1 });
captionSchema.index({ 'template.category': 1 });
captionSchema.index({ isShared: 1 });

// Methods
captionSchema.methods.calculateAverageConfidence = function() {
  if (this.lines.length === 0) return 0;
  const total = this.lines.reduce((sum, line) => sum + line.confidence, 0);
  return total / this.lines.length;
};

captionSchema.methods.getWordCount = function() {
  return this.lines.reduce((count, line) => count + line.text.split(' ').length, 0);
};

captionSchema.methods.getDuration = function() {
  if (this.lines.length === 0) return 0;
  const lastLine = this.lines[this.lines.length - 1];
  return lastLine.end;
};

captionSchema.methods.exportToSRT = function() {
  return this.lines.map((line, index) => {
    const start = this.formatTime(line.start);
    const end = this.formatTime(line.end);
    return `${index + 1}\n${start} --> ${end}\n${line.text}\n`;
  }).join('\n');
};

captionSchema.methods.exportToVTT = function() {
  const header = 'WEBVTT\n\n';
  const content = this.lines.map(line => {
    const start = this.formatTime(line.start);
    const end = this.formatTime(line.end);
    return `${start} --> ${end}\n${line.text}\n`;
  }).join('\n');
  return header + content;
};

captionSchema.methods.formatTime = function(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const Caption = mongoose.model<ICaption>('Caption', captionSchema);
