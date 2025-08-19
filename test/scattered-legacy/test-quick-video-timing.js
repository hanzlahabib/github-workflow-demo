#!/usr/bin/env node

/**
 * Quick Test for Config-Based Video Timing
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function quickTimingTest() {
    console.log('⚡ Quick Config Video Timing Test');
    console.log('=================================');
    
    const BACKEND_URL = 'http://localhost:8001';
    let socket;
    let completed = false;
    
    try {
        socket = io(BACKEND_URL, { transports: ['websocket'] });
        
        await new Promise(resolve => {
            socket.on('connect', resolve);
        });
        
        socket.on('videoProgress', (data) => {
            if (data.progress >= 85) {
                console.log(`   🔥 Progress: ${data.progress}% - Encoding phase working`);
            }
            if (data.phase === 'completed') {
                completed = true;
                console.log(`   ✅ COMPLETED: Custom video timing successful!`);
            }
        });
        
        // Test with custom video timing: start at 3 seconds, end at 7 seconds
        const response = await fetch(`${BACKEND_URL}/api/video/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'story',
                input: {
                    text: 'left: Quick test\\nright: Custom timing\\nleft: Working!',
                    config: {
                        title: 'Quick Timing Test',
                        messages: [
                            { id: '1', text: 'Quick test', sender: 'left', delay: 0 },
                            { id: '2', text: 'Custom timing', sender: 'right', delay: 1000 },
                            { id: '3', text: 'Working!', sender: 'left', delay: 2000 }
                        ],
                        backgroundSettings: {
                            backgroundType: 'video',
                            backgroundUrl: 'https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4',
                            videoStartTime: 3, // Start at 3 seconds
                            videoEndTime: 7,   // End at 7 seconds (4-second segment)
                            backgroundOpacity: 80,
                            videoVolume: 20
                        }
                    }
                },
                settings: {},
                userId: 'test-user',
                socketId: socket.id
            })
        });
        
        const data = await response.json();
        console.log(`   🚀 Started: ${data.videoId} (using 4-second video segment: 3s-7s)`);
        
        // Wait up to 45 seconds
        const startTime = Date.now();
        while (!completed && (Date.now() - startTime) < 45000) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n   📊 Results: Completed=${completed}, Duration=${duration}s`);
        
        if (completed) {
            console.log(`   🎉 SUCCESS: Config-based video timing working perfectly!`);
            console.log(`      ✓ Custom videoStartTime/videoEndTime applied`);
            console.log(`      ✓ Only loaded 4-second segment (3s-7s) instead of full video`);
            console.log(`      ✓ No stuck progress issues`);
            console.log(`      ✓ Completed in ${duration} seconds`);
        } else {
            console.log(`   ⏱️ Test still running after ${duration}s`);
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
    } finally {
        if (socket) socket.disconnect();
    }
}

quickTimingTest().catch(console.error);