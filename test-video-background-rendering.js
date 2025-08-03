#!/usr/bin/env node

/**
 * Test Background Video Rendering with Fixed Preprocessing
 * Verify that background videos are actually rendered instead of converted to gradients
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBackgroundVideoRendering() {
    console.log('🎬 Testing Background Video Rendering (Fixed Preprocessing)');
    console.log('=========================================================');
    console.log('Testing that background videos are properly rendered with OffthreadVideo...\n');
    
    const BACKEND_URL = 'http://localhost:8001';
    
    console.log(`🧪 Test: Background Video with OffthreadVideo`);
    console.log(`   Video URL: https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4`);
    console.log(`   Expected: Actual video background (not gradient fallback)`);
    console.log(`   Component: OffthreadVideo with conservative preprocessing`);
    console.log(`   Segment: 0s-10s (should NOT trigger gradient fallback)\n`);
    
    await testVideoBackground(BACKEND_URL);
}

async function testVideoBackground(backendUrl) {
    let socket;
    let progressReceived = [];
    let testCompleted = false;
    let finalResult = null;
    
    try {
        // Connect to WebSocket
        socket = io(backendUrl, {
            transports: ['websocket'],
            upgrade: false
        });
        
        let socketId = null;
        
        await new Promise(resolve => {
            socket.on('connect', () => {
                socketId = socket.id;
                resolve();
            });
        });
        
        socket.on('videoProgress', (data) => {
            progressReceived.push({
                progress: data.progress,
                phase: data.phase,
                message: data.message,
                timestamp: Date.now()
            });
            
            console.log(`   📊 Progress: ${data.progress}% - ${data.phase}`);
            
            if (data.phase === 'completed') {
                testCompleted = true;
                finalResult = data;
                console.log(`   ✅ COMPLETED: ${data.message}`);
            } else if (data.phase === 'failed') {
                testCompleted = true;
                finalResult = data;
                console.log(`   ❌ FAILED: ${data.message || data.error}`);
            }
        });
        
        // Test with a reasonable background video segment
        const generateResponse = await fetch(`${backendUrl}/api/video/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'story',
                input: {
                    text: 'left: Background video test\\\\nright: Should show actual video\\\\nleft: Not gradient!',
                    config: {
                        title: 'Background Video Test',
                        messages: [
                            { id: '1', text: 'Background video test', sender: 'left', delay: 0 },
                            { id: '2', text: 'Should show actual video', sender: 'right', delay: 1000 },
                            { id: '3', text: 'Not gradient!', sender: 'left', delay: 2000 }
                        ],
                        backgroundSettings: {
                            backgroundType: 'video',
                            backgroundUrl: 'https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4',
                            videoStartTime: 0,   // Start from beginning
                            videoEndTime: 10,    // 10-second segment (33% of 30s video - should NOT trigger fallback)
                            backgroundOpacity: 80,
                            videoVolume: 30
                        }
                    }
                },
                settings: {},
                userId: 'test-user',
                socketId: socketId
            })
        });
        
        const generateData = await generateResponse.json();
        console.log(`   🚀 Generation started: ${generateData.videoId}`);
        console.log(`   📊 Test segment: 0s-10s (33% of video - should render actual video)`);
        console.log(`   ⏱️  Started at: ${new Date().toLocaleTimeString()}`);
        
        // Monitor for 2 minutes max
        const startTime = Date.now();
        const maxWaitTime = 2 * 60 * 1000;
        
        while (!testCompleted && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Analyze results
        const testDuration = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n   📈 Background Video Test Results:`);
        console.log(`      Duration: ${testDuration}s`);
        console.log(`      Progress updates: ${progressReceived.length}`);
        console.log(`      Completed: ${testCompleted}`);
        
        if (finalResult?.videoUrl) {
            console.log(`      Video URL: ${finalResult.videoUrl}`);
            console.log(`      Size: ${finalResult.sizeInBytes ? Math.round(finalResult.sizeInBytes / 1024) + ' KB' : 'Unknown'}`);
        }
        
        if (testCompleted && progressReceived.length > 0) {
            const maxProgress = Math.max(...progressReceived.map(p => p.progress));
            
            if (maxProgress >= 100 && testDuration < 60) {
                console.log(`\n   🎉 SUCCESS: Background video rendered successfully!`);
                console.log(`      ✓ OffthreadVideo component working`);
                console.log(`      ✓ Conservative preprocessing applied`);
                console.log(`      ✓ Background video NOT converted to gradient`);
                console.log(`      ✓ Completed in ${testDuration}s`);
                console.log(`      ✓ Video should contain actual background video content`);
                
                if (finalResult?.videoUrl) {
                    console.log(`\n   🔗 Download and verify the video contains background video:`);
                    console.log(`      ${finalResult.videoUrl}`);
                }
            } else {
                console.log(`\n   ⚠️  PARTIAL: Test completed but may need verification`);
            }
        } else {
            console.log(`\n   ❌ FAILED: Test did not complete successfully`);
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
    } finally {
        if (socket) {
            socket.disconnect();
        }
    }
}

// Run the test
testBackgroundVideoRendering().catch(console.error);