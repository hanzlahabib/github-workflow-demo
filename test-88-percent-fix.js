#!/usr/bin/env node

/**
 * Test 88% Progress Stuck Issue Fix
 * Validates that the optimized encoding configuration resolves the stuck issue
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test88PercentFix() {
    console.log('🔧 Testing 88% Progress Stuck Issue Fix');
    console.log('=======================================');
    console.log('Testing optimized Lambda configuration to prevent 88% stuck issue...\n');
    
    const BACKEND_URL = 'http://localhost:8001';
    
    // Test scenario that previously got stuck at 88%
    const testScenario = {
        name: 'Background Video (Previously Stuck at 88%)',
        backgroundType: 'video',
        backgroundUrl: 'https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4',
        expectedBehavior: 'Should complete encoding past 88% with new optimized settings'
    };
    
    console.log(`🧪 Test: ${testScenario.name}`);
    console.log(`   Background URL: ${testScenario.backgroundUrl}`);
    console.log(`   Expected: ${testScenario.expectedBehavior}`);
    console.log(`   Fix Applied: concurrencyPerLambda=1, framesPerLambda=15, 2x timeout at 85%+\n`);
    
    await testFixedScenario(BACKEND_URL, testScenario);
    
    console.log('\n🏁 88% Stuck Issue Fix Test Complete');
    console.log('====================================');
}

async function testFixedScenario(backendUrl, scenario) {
    let socket;
    let progressReceived = [];
    let testCompleted = false;
    let stuckAt88 = false;
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
            progressReceived.push(data);
            
            // Track critical thresholds
            if (data.progress >= 88) {
                console.log(`   🔥 CRITICAL: Reached ${data.progress}% - testing encoding phase...`);
                
                if (data.progress > 88) {
                    passedCriticalThreshold = true;
                    console.log(`   ✅ SUCCESS: Progress advanced beyond 88% to ${data.progress}%!`);
                }
            }
            
            // Monitor for 88% stuck pattern (stuck for 30+ seconds)
            if (data.progress === 88) {
                const now = Date.now();
                setTimeout(() => {
                    if (!testCompleted && !passedCriticalThreshold) {
                        const latestProgress = progressReceived[progressReceived.length - 1]?.progress;
                        if (latestProgress === 88) {
                            stuckAt88 = true;
                            console.log(`   ⚠️  WARNING: Still stuck at 88% after 30 seconds - fix may not be working`);
                        }
                    }
                }, 30000); // Check if stuck for 30 seconds
            }
            
            if (data.phase === 'completed' || data.phase === 'failed') {
                testCompleted = true;
            }
        });
        
        // Start video generation with same parameters that previously failed
        const generateResponse = await fetch(`${backendUrl}/api/video/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'story',
                input: {
                    text: 'left: Testing the 88% fix\\nright: Will it complete encoding?\\nleft: Lets find out!',
                    config: {
                        title: '88% Encoding Fix Test',
                        messages: [
                            { id: '1', text: 'Testing the 88% fix', sender: 'left', delay: 0 },
                            { id: '2', text: 'Will it complete encoding?', sender: 'right', delay: 1000 },
                            { id: '3', text: 'Lets find out!', sender: 'left', delay: 2000 }
                        ],
                        backgroundSettings: {
                            backgroundType: scenario.backgroundType,
                            backgroundUrl: scenario.backgroundUrl,
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
        
        // Monitor for 5 minutes max (enough time to test encoding phase)
        const startTime = Date.now();
        const maxWaitTime = 5 * 60 * 1000; // 5 minutes
        
        while (!testCompleted && !stuckAt88 && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Analyze results
        console.log(`\n   📊 Test Results:`);
        console.log(`      Total progress updates: ${progressReceived.length}`);
        console.log(`      Test completed: ${testCompleted}`);
        console.log(`      Stuck at 88%: ${stuckAt88}`);
        console.log(`      Passed 88% threshold: ${passedCriticalThreshold}`);
        console.log(`      Test duration: ${Math.round((Date.now() - startTime) / 1000)}s`);
        
        if (progressReceived.length > 0) {
            const finalProgress = progressReceived[progressReceived.length - 1];
            const maxProgress = Math.max(...progressReceived.map(p => p.progress));
            console.log(`      Final progress: ${finalProgress.progress}% (${finalProgress.phase})`);
            console.log(`      Max progress reached: ${maxProgress}%`);
            
            // Success criteria
            if (testCompleted && passedCriticalThreshold && !stuckAt88) {
                console.log(`\n   ✅ SUCCESS: 88% stuck issue appears to be FIXED!`);
                console.log(`      ✓ Completed encoding past critical 88% threshold`);
                console.log(`      ✓ No stuck pattern detected`);
                console.log(`      ✓ Render completed successfully`);
                if (finalProgress.videoUrl) {
                    console.log(`      ✓ Video URL: ${finalProgress.videoUrl}`);
                }
            } else if (passedCriticalThreshold && !testCompleted) {
                console.log(`\n   🔄 PARTIAL SUCCESS: Passed 88% but test incomplete`);
                console.log(`      ✓ Critical threshold passed (88% → ${maxProgress}%)`);
                console.log(`      ⏱️ Test may need more time to complete`);
            } else if (stuckAt88) {
                console.log(`\n   ❌ FAILED: Still experiencing 88% stuck issue`);
                console.log(`      ✗ Progress stopped at 88% for 30+ seconds`);
                console.log(`      ⚠️ Additional optimization needed`);
            } else {
                console.log(`\n   ⏱️ TIMEOUT: Test did not reach critical threshold`);
                console.log(`      ⚠️ May need longer test duration or different approach`);
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
test88PercentFix().catch(console.error);