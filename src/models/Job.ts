import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  data: {
    input: any;
    output?: any;
    error?: string;
  };
  steps: {
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  }[];
  startedAt?: Date;
  completedAt?: Date;
  processingTime?: number;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  data: {
    input: Schema.Types.Mixed,
    output: Schema.Types.Mixed,
    error: String
  },
  steps: [{
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    error: String
  }],
  startedAt: Date,
  completedAt: Date,
  processingTime: Number,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1 });
jobSchema.index({ type: 1 });

export const Job = mongoose.model<IJob>('Job', jobSchema);