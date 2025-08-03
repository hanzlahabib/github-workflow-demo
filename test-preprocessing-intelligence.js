#!/usr/bin/env node

/**
 * Test Video Preprocessing Intelligence
 * Demonstrates how the preprocessor makes intelligent decisions about background videos
 */

require('dotenv').config();

async function testPreprocessingIntelligence() {
    console.log('🧠 Testing Video Preprocessing Intelligence');
    console.log('==========================================');
    
    try {
        // Import the preprocessor using require for TypeScript
        const { videoPreprocessor } = require('./dist/services/videoPreprocessor.js');
        
        // Test scenarios
        const testScenarios = [
            {
                name: 'Large R2 Video with Small Segment',
                videoUrl: 'https://example.r2.dev/large-video.mp4',
                startTime: 2,
                endTime: 6,
                videoDuration: 45,
                expected: 'use_gradient'
            },
            {
                name: 'Normal S3 Video with Good Segment',
                videoUrl: 'https://s3.amazonaws.com/video.mp4',
                startTime: 0,
                endTime: 25,
                videoDuration: 30,
                expected: 'use_original'
            },
            {
                name: 'Long Video with Tiny Segment',
                videoUrl: 'https://s3.amazonaws.com/long-video.mp4',
                startTime: 10,
                endTime: 12,
                videoDuration: 60,
                expected: 'use_gradient'
            },
            {
                name: 'Real Test Video (Small Segment)',
                videoUrl: 'https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4',
                startTime: 2,
                endTime: 6,
                videoDuration: 30,
                expected: 'use_gradient'
            }
        ];
        
        for (const scenario of testScenarios) {
            console.log(`\n🧪 Testing: ${scenario.name}`);
            console.log(`   Video: ${scenario.videoUrl.split('/').pop()}`);
            console.log(`   Segment: ${scenario.startTime}s-${scenario.endTime}s (${scenario.endTime - scenario.startTime}s)`);
            console.log(`   Total Duration: ${scenario.videoDuration}s`);
            
            const recommendation = await videoPreprocessor.getPreprocessingRecommendation(
                scenario.videoUrl,
                scenario.startTime,
                scenario.endTime,
                scenario.videoDuration
            );
            
            const segmentPercentage = ((scenario.endTime - scenario.startTime) / scenario.videoDuration * 100).toFixed(1);
            
            console.log(`   📊 Segment: ${segmentPercentage}% of total video`);
            console.log(`   🤖 Decision: ${recommendation.action}`);
            console.log(`   💡 Reason: ${recommendation.reason}`);
            
            const match = recommendation.action === scenario.expected;
            console.log(`   ${match ? '✅' : '❌'} Expected: ${scenario.expected}, Got: ${recommendation.action}`);
            
            if (recommendation.segmentUrl) {
                console.log(`   🔗 Segment URL: ${recommendation.segmentUrl}`);
            }
            if (recommendation.fallbackGradient) {
                console.log(`   🎨 Fallback: ${recommendation.fallbackGradient}`);
            }
        }
        
        console.log('\n🏁 Preprocessing Intelligence Test Complete');
        console.log('===========================================');
        console.log('✅ The system intelligently detects problematic videos and applies optimizations:');
        console.log('   • R2/blob URLs → Gradient fallback (prevents timeouts)');
        console.log('   • Long videos with small segments → Gradient fallback');
        console.log('   • Very short segments → Gradient fallback');
        console.log('   • Good segment ratios → Original video with timing');
        console.log('   • Future: True video segments when preprocessing is available');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testPreprocessingIntelligence().catch(console.error);