#!/usr/bin/env node

/**
 * Test WebSocket Progress Updates
 * Validates that the backend emits real-time progress via WebSocket
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWebSocketProgress() {
    console.log('🔌 Testing WebSocket Progress Updates');
    console.log('=====================================');
    
    const BACKEND_URL = 'http://localhost:8001';
    let socket;
    let progressReceived = [];
    let testCompleted = false;
    
    try {
        // Connect to WebSocket
        console.log('📡 Connecting to WebSocket...');
        socket = io(BACKEND_URL, {
            transports: ['websocket'],
            upgrade: false
        });
        
        let socketId = null;
        
        socket.on('connect', () => {
            socketId = socket.id;
            console.log(`✅ WebSocket connected: ${socketId}`);
        });
        
        socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
        });
        
        // Listen for video progress events
        socket.on('videoProgress', (data) => {
            progressReceived.push(data);
            console.log(`📊 Progress update: ${data.progress}% - ${data.message} (Phase: ${data.phase})`);
            
            if (data.phase === 'completed' || data.phase === 'failed') {
                testCompleted = true;
                console.log(`✅ Video generation ${data.phase}!`);
                if (data.videoUrl) {
                    console.log(`   Video URL: ${data.videoUrl}`);
                }
            }
        });
        
        // Wait for connection
        await new Promise(resolve => {
            if (socket.connected) {
                resolve();
            } else {
                socket.on('connect', resolve);
            }
        });
        
        // Start video generation with socketId
        console.log('\n🎬 Starting video generation with WebSocket...');
        const generateResponse = await fetch(`${BACKEND_URL}/api/video/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'story',
                input: {
                    text: 'left: Hello!\nright: Hi there!\nleft: How are you?',
                    config: {
                        title: 'WebSocket Test',
                        messages: [
                            { id: '1', text: 'Hello!', sender: 'left', delay: 0 },
                            { id: '2', text: 'Hi there!', sender: 'right', delay: 1000 },
                            { id: '3', text: 'How are you?', sender: 'left', delay: 2000 }
                        ]
                    }
                },
                settings: {},
                userId: 'test-user',
                socketId: socketId
            })
        });
        
        if (!generateResponse.ok) {
            throw new Error(`Failed to start generation: ${generateResponse.status}`);
        }
        
        const generateData = await generateResponse.json();
        console.log(`✅ Generation started: ${generateData.videoId}`);
        
        // Monitor progress for up to 10 minutes
        console.log('\n📊 Monitoring WebSocket progress...');
        const startTime = Date.now();
        const maxWaitTime = 10 * 60 * 1000; // 10 minutes
        
        while (!testCompleted && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Show progress every 30 seconds
            if (progressReceived.length > 0 && (Date.now() - startTime) % 30000 < 1000) {
                const latest = progressReceived[progressReceived.length - 1];
                console.log(`⏱️  ${Math.round((Date.now() - startTime) / 1000)}s elapsed - Latest: ${latest.progress}%`);
            }
        }
        
        // Test results
        console.log('\n📋 WebSocket Test Results');
        console.log('=========================');
        console.log(`Progress updates received: ${progressReceived.length}`);
        console.log(`Test completed: ${testCompleted}`);
        console.log(`Total test time: ${Math.round((Date.now() - startTime) / 1000)}s`);
        
        if (progressReceived.length > 0) {
            console.log('\n📊 Progress Timeline:');
            progressReceived.forEach((update, index) => {
                console.log(`   ${index + 1}. ${update.progress}% - ${update.phase} - ${update.message}`);
            });
            
            // Check if we got real-time updates
            const hasRealTimeUpdates = progressReceived.some(update => 
                update.phase === 'rendering' && update.progress > 5 && update.progress < 100
            );
            
            if (hasRealTimeUpdates) {
                console.log('\n✅ SUCCESS: Real-time WebSocket progress updates are working!');
                console.log('   The frontend should now receive actual Lambda rendering progress');
            } else {
                console.log('\n⚠️  WARNING: Only initial/completion updates received');
                console.log('   Check Lambda rendering progress emission in video.ts');
            }
        } else {
            console.log('\n❌ FAILED: No WebSocket progress updates received');
            console.log('   Check WebSocket connection and emission in backend');
        }
        
    } catch (error) {
        console.error('\n❌ WebSocket test failed:', error.message);
        console.error('   Full error:', error);
    } finally {
        if (socket) {
            socket.disconnect();
            console.log('\n🔌 WebSocket disconnected');
        }
    }
}

// Run the test
testWebSocketProgress().catch(console.error);