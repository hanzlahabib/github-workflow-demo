// Top 5 Videos Routes
// Modularized into focused service modules in /routes/top5/
// This file serves as the main entry point and backwards compatibility layer

import express from 'express';
import top5Routes from './top5';

const router = express.Router();

// Redirect all Top 5 video routes to the modular structure
router.use('/', top5Routes);

// Backwards compatibility - redirect old endpoints
router.get('/trending-topics', (req, res) => {
  res.redirect(308, '/api/top5/trending/topics' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
});

router.post('/generate-ai-list', (req, res) => {
  res.redirect(308, '/api/top5/analysis/generate-ai-list');
});

router.post('/analyze-viral-potential', (req, res) => {
  res.redirect(308, '/api/top5/analysis/viral-potential');
});

router.post('/predict-performance', (req, res) => {
  res.redirect(308, '/api/top5/performance/predict');
});

router.post('/analyze-competitors', (req, res) => {
  res.redirect(308, '/api/top5/performance/competitors');
});

router.get('/viral-templates', (req, res) => {
  res.redirect(308, '/api/top5/templates/viral' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
});

export default router;
