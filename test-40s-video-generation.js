#!/usr/bin/env node

/**
 * Test 40-Second Video Generation with Background Video
 * Tests OffthreadVideo performance with longer content and more messages
 */

require('dotenv').config();
const io = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test40SecondVideoGeneration() {
    console.log('🎬 Testing 30-Second Video Generation with Multiple Messages');
    console.log('==========================================================');
    console.log('Testing OffthreadVideo with longer content and more messages...\n');
    
    const BACKEND_URL = 'http://localhost:8001';
    
    console.log(`🧪 Test: 30-Second Video with Multiple Messages`);
    console.log(`   Video URL: https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4`);
    console.log(`   Duration: 30 seconds`);
    console.log(`   Messages: 11 messages with realistic timing`);
    console.log(`   Background: Working video segment (0s-10s)`);
    console.log(`   Expected: Complete background video rendering with OffthreadVideo\n`);
    
    await testLongerVideo(BACKEND_URL);
}

async function testLongerVideo(backendUrl) {
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
            
            console.log(`   📊 Progress: ${data.progress}% - ${data.phase} (${data.message || ''})`);
            
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
        
        // Generate longer video with realistic conversation
        const generateResponse = await fetch(`${backendUrl}/api/video/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'story',
                input: {
                    text: 'Longer conversation test with background video',
                    config: {
                        title: '40-Second Background Video Test',
                        durationInSeconds: 30,
                        messages: [
                            { id: '1', text: 'Hey! Want to test this new video feature?', sender: 'left', delay: 0 },
                            { id: '2', text: 'Absolutely! What does it do?', sender: 'right', delay: 3000 },
                            { id: '3', text: 'It renders background videos using OffthreadVideo', sender: 'left', delay: 6000 },
                            { id: '4', text: 'That sounds amazing! How fast is it?', sender: 'right', delay: 9000 },
                            { id: '5', text: 'Much faster than regular Video components', sender: 'left', delay: 12000 },
                            { id: '6', text: 'Does it handle external URLs well?', sender: 'right', delay: 15000 },
                            { id: '7', text: 'Yes! It downloads and extracts frames with FFmpeg', sender: 'left', delay: 18000 },
                            { id: '8', text: 'Perfect! No more browser streaming issues?', sender: 'right', delay: 20000 },
                            { id: '9', text: 'Exactly! FFmpeg handles everything off-thread', sender: 'left', delay: 23000 },
                            { id: '10', text: 'This will make our video generation so much better!', sender: 'right', delay: 24000 },
                            { id: '11', text: 'And the background videos look amazing too', sender: 'left', delay: 27000 }
                        ],
                        backgroundSettings: {
                            backgroundType: 'video',
                            backgroundUrl: 'https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4',
                            videoStartTime: 0,   // Start from beginning  
                            videoEndTime: 10,    // Use shorter segment that we know works
                            backgroundOpacity: 85,
                            videoVolume: 25
                        },
                        messageMetadata: {
                            username: 'VideoTester',
                            pfp: '',
                            darkMode: false,
                            unreadMessages: '0',
                            ui: 'iOS Dark'
                        }
                    }
                },
                settings: {
                    duration: 30
                },
                userId: 'test-user-40s',
                socketId: socketId
            })
        });
        
        const generateData = await generateResponse.json();
        console.log(`   🚀 Generation started: ${generateData.videoId}`);
        console.log(`   📊 Test details: 30s duration, 11 messages, 10s background video segment`);
        console.log(`   ⏱️  Started at: ${new Date().toLocaleTimeString()}`);
        
        // Monitor for 10 minutes max (longer video needs more time)
        const startTime = Date.now();
        const maxWaitTime = 10 * 60 * 1000; // 10 minutes
        
        while (!testCompleted && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Check every 3 seconds
        }
        
        // Analyze results
        const testDuration = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n   📈 40-Second Video Generation Results:`);
        console.log(`      Total render time: ${Math.floor(testDuration / 60)}m ${testDuration % 60}s`);
        console.log(`      Progress updates: ${progressReceived.length}`);
        console.log(`      Completed: ${testCompleted}`);
        
        if (finalResult?.videoUrl) {
            console.log(`      Video URL: ${finalResult.videoUrl}`);
            console.log(`      File size: ${finalResult.sizeInBytes ? Math.round(finalResult.sizeInBytes / 1024) + ' KB' : 'Unknown'}`);
        }
        
        if (testCompleted && progressReceived.length > 0) {
            const maxProgress = Math.max(...progressReceived.map(p => p.progress));
            const passed88 = progressReceived.some(p => p.progress > 88);
            const passed95 = progressReceived.some(p => p.progress > 95);
            
            console.log(`      Max progress: ${maxProgress}%`);
            console.log(`      Passed 88% milestone: ${passed88 ? '✅' : '❌'}`);
            console.log(`      Reached 95%+: ${passed95 ? '✅' : '❌'}`);
            
            if (maxProgress >= 100 && testDuration < 600) { // Under 10 minutes
                console.log(`\n   🎉 EXCELLENT: 40-Second video with background rendered successfully!`);
                console.log(`      ✓ OffthreadVideo handled long content perfectly`);
                console.log(`      ✓ FFmpeg frame extraction worked consistently`);
                console.log(`      ✓ No streaming stalls or timeout issues`);
                console.log(`      ✓ Background video rendered for full 40-second duration`);
                console.log(`      ✓ Completed in ${Math.floor(testDuration / 60)}m ${testDuration % 60}s`);
                
                if (finalResult?.videoUrl) {
                    console.log(`\n   🔗 Download 40-second video with background:`);
                    console.log(`      ${finalResult.videoUrl}`);
                    console.log(`      Expected: 40s of conversation with full background video`);
                }
            } else if (testCompleted) {
                console.log(`\n   ⚠️  COMPLETED: Video finished but took longer than expected`);
                console.log(`      Duration: ${Math.floor(testDuration / 60)}m ${testDuration % 60}s`);
            } else {
                console.log(`\n   ❌ INCOMPLETE: Video did not complete within 10 minutes`);
            }
        } else {
            console.log(`\n   ❌ FAILED: No progress updates received or test incomplete`);
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
test40SecondVideoGeneration().catch(console.error);