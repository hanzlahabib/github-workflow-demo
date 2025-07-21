import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplate extends Document {
  _id: string;
  name: string;
  description: string;
  type: 'background' | 'caption' | 'preset';
  category: string;
  previewUrl: string;
  assetUrl: string;
  isTrending: boolean;
  isPremium: boolean;
  metadata: {
    duration?: number;
    resolution?: string;
    format?: string;
    tags: string[];
  };
  usage: {
    count: number;
    rating: number;
    reviews: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['background', 'caption', 'preset']
  },
  category: {
    type: String,
    required: true
  },
  previewUrl: {
    type: String,
    required: true
  },
  assetUrl: {
    type: String,
    required: true
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  metadata: {
    duration: Number,
    resolution: String,
    format: String,
    tags: [String]
  },
  usage: {
    count: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    reviews: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

templateSchema.index({ type: 1, category: 1 });
templateSchema.index({ isTrending: -1, 'usage.count': -1 });
templateSchema.index({ isPremium: 1 });

export const Template = mongoose.model<ITemplate>('Template', templateSchema);
