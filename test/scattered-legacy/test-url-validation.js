#!/usr/bin/env node

/**
 * Test URL Validation Logic
 * Test just the URL validation without full video generation
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUrlValidation() {
    console.log('🔍 Testing URL Validation Logic');
    console.log('===============================');
    
    const BACKEND_URL = 'http://localhost:8001';
    
    const testUrls = [
        {
            name: 'R2 URL (Should be converted)',
            url: 'https://pub-420a50a1e05f4020a8dc33550151c686.r2.dev/test-video.mp4',
            expectedConversion: true
        },
        {
            name: 'Blob URL (Should be converted)', 
            url: 'blob:http://localhost:3000/test-video.mp4',
            expectedConversion: true
        },
        {
            name: 'S3 URL (Should be allowed)',
            url: 'https://remotionlambda-useast1-oelksfi1c7.s3.us-east-1.amazonaws.com/test.mp4',
            expectedConversion: false
        }
    ];
    
    for (const test of testUrls) {
        console.log(`\n🧪 Testing: ${test.name}`);
        console.log(`   URL: ${test.url}`);
        console.log(`   Expected conversion: ${test.expectedConversion}`);
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/video/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'story',
                    input: {
                        text: 'left: URL test\nright: Testing validation',
                        config: {
                            title: 'URL Validation Test',
                            messages: [
                                { id: '1', text: 'URL test', sender: 'left', delay: 0 },
                                { id: '2', text: 'Testing validation', sender: 'right', delay: 1000 }
                            ],
                            backgroundSettings: {
                                backgroundType: 'video',
                                backgroundUrl: test.url,
                                backgroundOpacity: 80
                            }
                        }
                    },
                    settings: {},
                    userId: 'test-user'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`   ✅ Request accepted: ${data.videoId}`);
                console.log(`   🔍 Check backend logs for URL validation messages`);
                
                // Wait 2 seconds to see initial processing
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check status to see if background was modified
                const statusResponse = await fetch(`${BACKEND_URL}/api/video/status/${data.videoId}`);
                if (statusResponse.ok) {
                    const status = await statusResponse.json();
                    console.log(`   📊 Status: ${status.progress}% - ${status.message}`);
                }
                
            } else {
                console.log(`   ❌ Request failed: ${response.status}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('   ⏱️  Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n✅ URL Validation Test Complete');
    console.log('Check backend console for validation log messages');
}

testUrlValidation().catch(console.error);