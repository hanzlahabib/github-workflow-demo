#!/usr/bin/env node

/**
 * Test 85% Progress Stuck Issue Fix
 * Validates that the reduced concurrency configuration resolves the stuck issue
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test85PercentFix() {
    console.log('🔧 Testing 85% Progress Stuck Issue Fix');
    console.log('=======================================');
    console.log('Testing reduced Lambda concurrency (1 per Lambda, 15 frames) to prevent stuck issue...\n');
    
    const BACKEND_URL = 'http://localhost:8001';
    
    console.log(`🧪 Test: Background Video with Optimized Settings`);
    console.log(`   Background URL: https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4`);
    console.log(`   New Settings: concurrencyPerLambda=1, framesPerLambda=15`);
    console.log(`   Expected: Should complete past 85% without sticking\n`);
    
    await testOptimizedSettings(BACKEND_URL);
    
    console.log('\n🏁 85% Stuck Issue Fix Test Complete');
    console.log('====================================');
}

async function testOptimizedSettings(backendUrl) {
    let socket;
    let progressReceived = [];
    let testCompleted = false;
    let stuckAt85 = false;
    let passedCriticalThreshold = false;
    
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
            progressReceived.push({
                progress: data.progress,
                phase: data.phase,
                timestamp: Date.now()
            });
            
            // Track critical threshold
            if (data.progress >= 85) {
                const progressStr = `${data.progress}%`;
                console.log(`   🔥 CRITICAL: Reached ${progressStr} at ${new Date().toLocaleTimeString()}`);
                
                if (data.progress > 85) {
                    passedCriticalThreshold = true;
                    console.log(`   ✅ SUCCESS: Progress advanced beyond 85% to ${progressStr}!`);
                }
            }
            
            // Monitor for 85% stuck pattern (no progress for 30+ seconds)
            if (data.progress === 85) {
                setTimeout(() => {
                    if (!testCompleted && !passedCriticalThreshold) {
                        const latestProgress = progressReceived[progressReceived.length - 1]?.progress;
                        if (latestProgress === 85) {
                            stuckAt85 = true;
                            console.log(`   ⚠️  WARNING: Still stuck at 85% after 30 seconds`);
                        }
                    }
                }, 30000);
            }
            
            if (data.phase === 'completed' || data.phase === 'failed') {
                testCompleted = true;
            }
        });
        
        // Start video generation
        const generateResponse = await fetch(`${backendUrl}/api/video/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'story',
                input: {
                    text: 'left: Testing optimized settings\\nright: Will it pass 85%?\\nleft: Lets see!',
                    config: {
                        title: 'Optimized Lambda Test',
                        messages: [
                            { id: '1', text: 'Testing optimized settings', sender: 'left', delay: 0 },
                            { id: '2', text: 'Will it pass 85%?', sender: 'right', delay: 1000 },
                            { id: '3', text: 'Lets see!', sender: 'left', delay: 2000 }
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
        console.log(`   🚀 Generation started: ${generateData.videoId}`);
        console.log(`   ⏱️  Started at: ${new Date().toLocaleTimeString()}`);
        
        // Monitor for 4 minutes max
        const startTime = Date.now();
        const maxWaitTime = 4 * 60 * 1000; // 4 minutes
        
        while (!testCompleted && !stuckAt85 && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Analyze results
        const testDuration = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n   📊 Final Test Results:`);
        console.log(`      Duration: ${testDuration}s`);
        console.log(`      Progress updates: ${progressReceived.length}`);
        console.log(`      Test completed: ${testCompleted}`);
        console.log(`      Stuck at 85%: ${stuckAt85}`);
        console.log(`      Passed 85% threshold: ${passedCriticalThreshold}`);
        
        if (progressReceived.length > 0) {
            const finalProgress = progressReceived[progressReceived.length - 1];
            const maxProgress = Math.max(...progressReceived.map(p => p.progress));
            const progressAtSteps = [70, 75, 80, 85, 90, 95, 100].map(threshold => {
                const step = progressReceived.find(p => p.progress >= threshold);
                return step ? `${threshold}%: ✓` : `${threshold}%: ✗`;
            }).join(' | ');
            
            console.log(`      Final progress: ${finalProgress.progress}% (${finalProgress.phase})`);
            console.log(`      Max progress: ${maxProgress}%`);
            console.log(`      Progress steps: ${progressAtSteps}`);
            
            // Success criteria
            if (testCompleted && passedCriticalThreshold && !stuckAt85) {
                console.log(`\n   🎉 SUCCESS: 85% stuck issue is FIXED!`);
                console.log(`      ✓ Passed critical 85% threshold`);
                console.log(`      ✓ No stuck pattern detected`);
                console.log(`      ✓ Render completed successfully`);
                console.log(`      ✓ Optimized concurrency settings working`);
            } else if (passedCriticalThreshold && !testCompleted) {
                console.log(`\n   🔄 PARTIAL SUCCESS: Passed 85% but incomplete`);
                console.log(`      ✓ Critical threshold passed (85% → ${maxProgress}%)`);
                console.log(`      ⏱️ May need more time to complete`);
            } else if (stuckAt85) {
                console.log(`\n   ❌ FAILED: Still stuck at 85%`);
                console.log(`      ✗ Progress stopped at 85% for 30+ seconds`);
                console.log(`      ⚠️ Additional optimization needed`);
            } else {
                console.log(`\n   ⏱️ TIMEOUT: Test incomplete after ${testDuration}s`);
                console.log(`      Max progress reached: ${maxProgress}%`);
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
test85PercentFix().catch(console.error);