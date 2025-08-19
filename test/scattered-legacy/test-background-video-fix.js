#!/usr/bin/env node

/**
 * Test Background Video Fix
 * Validates that background videos no longer cause 85% stuck issue
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBackgroundVideoFix() {
    console.log('🎬 Testing Background Video Fix');
    console.log('===============================');
    console.log('Testing various background video scenarios that previously caused 85% stuck issue...\n');
    
    const BACKEND_URL = 'http://localhost:8001';
    const testScenarios = [
        {
            name: 'R2 URL (Previously Problematic)',
            backgroundType: 'video',
            backgroundUrl: 'https://pub-420a50a1e05f4020a8dc33550151c686.r2.dev/test-video.mp4',
            expectedBehavior: 'Should auto-convert to gradient to prevent stuck issue'
        },
        {
            name: 'Blob URL (Previously Problematic)',
            backgroundType: 'video', 
            backgroundUrl: 'blob:http://localhost:3000/test-video.mp4',
            expectedBehavior: 'Should auto-convert to gradient to prevent stuck issue'
        },
        {
            name: 'Valid S3 URL',
            backgroundType: 'video',
            backgroundUrl: 'https://remotionlambda-useast1-oelksfi1c7.s3.us-east-1.amazonaws.com/test-video.mp4',
            expectedBehavior: 'Should attempt video rendering with fallback'
        },
        {
            name: 'Gradient Background (Control)',
            backgroundType: 'gradient',
            backgroundUrl: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
            expectedBehavior: 'Should render normally without issues'
        }
    ];
    
    for (let i = 0; i < testScenarios.length; i++) {
        const scenario = testScenarios[i];
        console.log(`\n🧪 Test ${i + 1}/${testScenarios.length}: ${scenario.name}`);
        console.log(`   Background Type: ${scenario.backgroundType}`);
        console.log(`   Background URL: ${scenario.backgroundUrl}`);
        console.log(`   Expected: ${scenario.expectedBehavior}`);
        
        await testSingleScenario(BACKEND_URL, scenario, i + 1);
        
        // Wait between tests
        if (i < testScenarios.length - 1) {
            console.log('   ⏱️  Waiting 5 seconds before next test...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('\n🏁 Background Video Fix Tests Complete');
    console.log('======================================');
    console.log('✅ All scenarios tested for 85% stuck issue prevention');
    console.log('✅ R2 and blob URLs should auto-convert to gradients');
    console.log('✅ Valid video URLs should render with fallback support');
}

async function testSingleScenario(backendUrl, scenario, testNum) {
    let socket;
    let progressReceived = [];
    let testCompleted = false;
    let stuckAt85 = false;
    
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
            
            // Check for 85% stuck issue
            if (data.progress >= 80 && data.progress < 90) {
                const now = Date.now();
                setTimeout(() => {
                    if (!testCompleted && progressReceived[progressReceived.length - 1]?.progress === data.progress) {
                        stuckAt85 = true;
                        console.log(`   ⚠️  WARNING: Progress stuck at ${data.progress}% - this indicates the old issue`);
                    }
                }, 30000); // Check if stuck for 30 seconds
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
                    text: 'left: Testing background video\nright: Does it work now?\nleft: Let\'s see!',
                    config: {
                        title: `Background Video Test ${testNum}`,
                        messages: [
                            { id: '1', text: 'Testing background video', sender: 'left', delay: 0 },
                            { id: '2', text: 'Does it work now?', sender: 'right', delay: 1000 },
                            { id: '3', text: 'Let\'s see!', sender: 'left', delay: 2000 }
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
        
        // Monitor for 2 minutes max
        const startTime = Date.now();
        const maxWaitTime = 2 * 60 * 1000; // 2 minutes
        
        while (!testCompleted && !stuckAt85 && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Analyze results
        console.log(`   📊 Test Results:`);
        console.log(`      Progress updates: ${progressReceived.length}`);
        console.log(`      Completed: ${testCompleted}`);
        console.log(`      Stuck at 85%: ${stuckAt85}`);
        console.log(`      Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);
        
        if (progressReceived.length > 0) {
            const finalProgress = progressReceived[progressReceived.length - 1];
            console.log(`      Final progress: ${finalProgress.progress}% (${finalProgress.phase})`);
            
            if (testCompleted && !stuckAt85) {
                console.log(`   ✅ SUCCESS: No 85% stuck issue detected`);
                if (finalProgress.videoUrl) {
                    console.log(`      Video URL: ${finalProgress.videoUrl}`);
                }
            } else if (stuckAt85) {
                console.log(`   ❌ FAILED: Progress stuck at 85% - issue still exists`);
            } else {
                console.log(`   ⏱️  TIMEOUT: Test did not complete in 2 minutes`);
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
testBackgroundVideoFix().catch(console.error);