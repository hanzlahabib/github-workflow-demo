import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { predictTwitterPerformance } from '../../services/twitter';

const router = express.Router();

// USP: Twitter Performance Prediction
router.post('/predict-performance', authMiddleware, async (req, res) => {
  try {
    const { tweets, threadConfiguration, targetPlatforms } = req.body;

    // Simulate performance prediction
    await new Promise(resolve => setTimeout(resolve, 2200));

    const predictions = predictTwitterPerformance(tweets, threadConfiguration, targetPlatforms);

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to predict performance'
    });
  }
});

export default router;
