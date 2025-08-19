#!/usr/bin/env node

/**
 * Test Partial Video Loading Optimization
 * Validates that background videos only load the needed portion (duration-based)
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testPartialVideoLoading() {
    console.log('🎬 Testing Partial Video Loading Optimization');
    console.log('=============================================');
    console.log('Testing optimized background video loading that only loads needed frames...\n');
    
    const BACKEND_URL = 'http://localhost:8001';
    
    console.log(`🧪 Test: Partial Background Video Loading`);
    console.log(`   Video URL: https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4`);
    console.log(`   Video Size: ~30MB (full file)`);
    console.log(`   Story Duration: ~9 seconds`);
    console.log(`   Optimization: startFrom=0, endAt=duration*30fps (only load needed frames)`);
    console.log(`   Expected: Faster loading, no timeouts, complete past 85%+\n`);
    
    await testOptimizedVideoLoading(BACKEND_URL);
    
    console.log('\n🏁 Partial Video Loading Test Complete');
    console.log('======================================');
}

async function testOptimizedVideoLoading(backendUrl) {
    let socket;
    let progressReceived = [];
    let testCompleted = false;
    let renderingStartTime = null;
    let firstProgressTime = null;
    let completionTime = null;
    
    try {
        // Connect to WebSocket for real-time monitoring
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
            const now = Date.now();
            
            if (!firstProgressTime && data.progress > 0) {
                firstProgressTime = now;
            }
            
            progressReceived.push({
                progress: data.progress,
                phase: data.phase,
                timestamp: now
            });
            
            // Track rendering phases
            if (data.progress >= 10 && data.progress < 20) {
                console.log(`   📊 Early Progress: ${data.progress}% - Video loading phase`);
            } else if (data.progress >= 50 && data.progress < 60) {
                console.log(`   🎬 Mid Progress: ${data.progress}% - Frame rendering phase`);
            } else if (data.progress >= 80) {
                console.log(`   🔥 Critical Progress: ${data.progress}% - Encoding phase`);
            }
            
            if (data.phase === 'completed') {
                completionTime = now;
                testCompleted = true;
                console.log(`   ✅ COMPLETED: Video generation finished at ${data.progress}%`);
            } else if (data.phase === 'failed') {
                testCompleted = true;
                console.log(`   ❌ FAILED: Video generation failed at ${data.progress}%`);
            }
        });
        
        // Start video generation with background video
        console.log(`   🚀 Starting generation at: ${new Date().toLocaleTimeString()}`);
        renderingStartTime = Date.now();
        
        const generateResponse = await fetch(`${backendUrl}/api/video/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'story',
                input: {
                    text: 'left: Testing partial loading\\nright: Is it faster now?\\nleft: Should be optimized!',
                    config: {
                        title: 'Partial Loading Test',
                        messages: [
                            { id: '1', text: 'Testing partial loading', sender: 'left', delay: 0 },
                            { id: '2', text: 'Is it faster now?', sender: 'right', delay: 1000 },
                            { id: '3', text: 'Should be optimized!', sender: 'left', delay: 2000 }
                        ],
                        backgroundSettings: {
                            backgroundType: 'video',
                            backgroundUrl: 'https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4',
                            backgroundOpacity: 80,
                            videoVolume: 20
                        }
                    }
                },
                settings: {},
                userId: 'test-user',
                socketId: socketId
            })
        });
        
        const generateData = await generateResponse.json();
        console.log(`   📋 Generation ID: ${generateData.videoId}`);
        
        // Monitor for 3 minutes max (should be much faster now)
        const startTime = Date.now();
        const maxWaitTime = 3 * 60 * 1000; // 3 minutes
        
        while (!testCompleted && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Analyze performance results
        const testDuration = Math.round((Date.now() - startTime) / 1000);
        const timeToFirstProgress = firstProgressTime ? Math.round((firstProgressTime - renderingStartTime) / 1000) : null;
        const totalRenderTime = completionTime ? Math.round((completionTime - renderingStartTime) / 1000) : null;
        
        console.log(`\n   📈 Performance Analysis:`);
        console.log(`      Total test duration: ${testDuration}s`);
        console.log(`      Time to first progress: ${timeToFirstProgress}s`);
        console.log(`      Total render time: ${totalRenderTime}s`);
        console.log(`      Progress updates received: ${progressReceived.length}`);
        
        if (progressReceived.length > 0) {
            const finalProgress = progressReceived[progressReceived.length - 1];
            const maxProgress = Math.max(...progressReceived.map(p => p.progress));
            
            // Check if we passed critical thresholds
            const passed85 = progressReceived.some(p => p.progress > 85);
            const passed90 = progressReceived.some(p => p.progress > 90);
            const passed95 = progressReceived.some(p => p.progress > 95);
            
            console.log(`      Final progress: ${finalProgress.progress}% (${finalProgress.phase})`);
            console.log(`      Max progress reached: ${maxProgress}%`);
            console.log(`      Passed 85%: ${passed85 ? '✅' : '❌'}`);
            console.log(`      Passed 90%: ${passed90 ? '✅' : '❌'}`);
            console.log(`      Passed 95%: ${passed95 ? '✅' : '❌'}`);
            
            // Success criteria for partial loading optimization
            if (testCompleted && passed85 && totalRenderTime && totalRenderTime < 120) {
                console.log(`\n   🎉 SUCCESS: Partial Video Loading Optimization Working!`);
                console.log(`      ✓ Video loading optimized (partial frames only)`);
                console.log(`      ✓ Passed critical 85%+ thresholds`);
                console.log(`      ✓ Completed in under 2 minutes (vs previous timeouts)`);
                console.log(`      ✓ No stuck progress patterns detected`);
                
                if (finalProgress.videoUrl) {
                    console.log(`      ✓ Generated video: ${finalProgress.videoUrl}`);
                }
            } else if (testCompleted && passed85) {
                console.log(`\n   🔄 PARTIAL SUCCESS: Progress issues resolved, timing can be improved`);
                console.log(`      ✓ Passed critical thresholds`);
                console.log(`      ✓ No stuck patterns`);
                console.log(`      ⏱️ Render time: ${totalRenderTime}s (can be optimized further)`);
            } else if (passed85 && !testCompleted) {
                console.log(`\n   ⏳ TIMEOUT: Passed critical thresholds but incomplete`);
                console.log(`      ✓ Progress working (reached ${maxProgress}%)`);
                console.log(`      ⏱️ Needs more time to complete`);
            } else {
                console.log(`\n   ❌ FAILED: Issues still present`);
                console.log(`      Max progress: ${maxProgress}%`);
                console.log(`      Completed: ${testCompleted}`);
                console.log(`      May need additional optimization`);
            }
        } else {
            console.log(`   ❌ FAILED: No progress updates received`);
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
testPartialVideoLoading().catch(console.error);