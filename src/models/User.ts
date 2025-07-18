import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  plan: 'free' | 'premium';
  points: number;
  badges: string[];
  videosCreated: number;
  subscription?: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd: Date;
  };
  preferences: {
    language: string;
    defaultVoice: string;
    theme: 'light' | 'dark';
  };
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  points: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String
  }],
  videosCreated: {
    type: Number,
    default: 0
  },
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due']
    },
    currentPeriodEnd: Date
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    defaultVoice: {
      type: String,
      default: 'alloy'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', userSchema);