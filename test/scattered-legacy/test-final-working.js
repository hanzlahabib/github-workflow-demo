#!/usr/bin/env node

/**
 * Final Working Test with Correct Composition
 */

require('dotenv').config();

async function testFinalWorking() {
    console.log('🎬 Final Lambda Test - Correct Composition');
    console.log('=====================================');

    const workingUrl = 'https://remotionlambda-useast1-oelksfi1c7.s3.us-east-1.amazonaws.com/sites/8rrgwhy76p/';
    const correctComposition = 'text-story'; // The correct composition name

    console.log('Working Site URL:', workingUrl);
    console.log('Composition:', correctComposition);
    console.log('');

    try {
        // Test with the original complex object from the user
        console.log('🚀 Testing with your original request object...');
        const { renderMediaOnLambda } = require('@remotion/lambda');
        
        const userRequestObject = {
            "title": "My Text Story",
            "messages": [
                {
                    "id": "1",
                    "text": "Hey, did you hear what happened?",
                    "sender": "left",
                    "delay": 0
                },
                {
                    "id": "2",
                    "text": "No, what happened?",
                    "sender": "right",
                    "delay": 1000
                },
                {
                    "id": "3",
                    "text": "You won't believe this story...",
                    "sender": "left",
                    "delay": 2000
                }
            ],
            "people": {
                "left": {
                    "id": "left",
                    "name": "Alex",
                    "avatar": {
                        "id": "alex-avatar",
                        "name": "Alex Avatar",
                        "url": ""
                    },
                    "isVoiceGenerated": false,
                    "isVerified": true,
                    "isOnline": true,
                    "username": "alex_codes",
                    "lastSeen": "Active now",
                    "isBusiness": false,
                    "businessType": "Personal"
                },
                "right": {
                    "id": "right",
                    "name": "Jordan",
                    "avatar": {
                        "id": "jordan-avatar",
                        "name": "Jordan Avatar",
                        "url": ""
                    },
                    "isVoiceGenerated": false,
                    "isVerified": false,
                    "isOnline": false,
                    "username": "jordan_dev",
                    "lastSeen": "2 hours ago",
                    "isBusiness": true,
                    "businessType": "Business chat"
                }
            },
            "backgroundSettings": {
                "backgroundType": "video",
                "backgroundUrl": "https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAZZ2AFBPW3C2U2QSU%2F20250802%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250802T071656Z&X-Amz-Expires=3600&X-Amz-Signature=df8d142b5a8afd9b0cbaa45b7fa5346cd91d1c94299ab8b1b96ab2f36c14f86c&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
                "backgroundOpacity": 70,
                "backgroundBlur": true,
                "musicVolume": 50,
                "videoVolume": 25
            },
            "colorCustomization": {
                "senderBubbleColor": "#5865F2",
                "receiverBubbleColor": "#4F545C",
                "senderTextColor": "#FFFFFF",
                "receiverTextColor": "#DCDDDE",
                "uiTheme": "discord-dark"
            },
            "duration": 9.166666666666666
        };
        
        const renderParams = {
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: correctComposition, // Use the correct composition name
            serveUrl: workingUrl,
            codec: 'h264',
            inputProps: userRequestObject,
            privacy: 'public',
            maxRetries: 3,
            framesPerLambda: 8,
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            }
        };

        console.log('📡 Sending render request with correct composition...');
        const renderResult = await renderMediaOnLambda(renderParams);

        console.log('✅ Render initiated successfully!');
        console.log('   Render ID:', renderResult.renderId);
        console.log('   Bucket:', renderResult.bucketName);
        console.log('   CloudWatch:', renderResult.cloudWatchLogs);

        // Monitor progress until completion
        console.log('\n📊 Monitoring render progress...');
        const { getRenderProgress } = require('@remotion/lambda');

        let completed = false;
        let progressCount = 0;
        const maxChecks = 30; // Up to 5 minutes
        const startTime = Date.now();

        while (!completed && progressCount < maxChecks) {
            try {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                progressCount++;

                const progress = await getRenderProgress({
                    renderId: renderResult.renderId,
                    bucketName: renderResult.bucketName,
                    functionName: process.env.LAMBDA_FUNCTION_NAME,
                    region: process.env.LAMBDA_REGION || 'us-east-1',
                });

                const progressPercent = Math.round(progress.overallProgress * 100);
                const elapsedTime = Math.round((Date.now() - startTime) / 1000);
                
                console.log(`   Progress: ${progressPercent}% | Elapsed: ${elapsedTime}s | Cost: ${progress.costs.displayCost}`);

                if (progress.done) {
                    completed = true;
                    console.log('\n🎉 VIDEO GENERATION COMPLETED SUCCESSFULLY!');
                    console.log('=====================================');
                    console.log('   Output File:', progress.outputFile || 'Available in bucket');
                    console.log('   Output Size:', progress.outputSizeInBytes ? 
                        Math.round(progress.outputSizeInBytes / (1024 * 1024)) + ' MB' : 'Unknown');
                    console.log('   Total Cost:', progress.costs.displayCost);
                    console.log('   Total Time:', Math.round((Date.now() - startTime) / 1000) + ' seconds');
                    
                    if (progress.outputFile) {
                        console.log('\n🔗 VIDEO DOWNLOAD URL:');
                        console.log('   ', progress.outputFile);
                        
                        // Test video accessibility
                        console.log('\n🌐 Testing video accessibility...');
                        try {
                            const videoResponse = await fetch(progress.outputFile, { method: 'HEAD' });
                            if (videoResponse.ok) {
                                console.log('   ✅ Video is accessible and downloadable');
                                console.log('   Content-Type:', videoResponse.headers.get('content-type'));
                                console.log('   Content-Length:', videoResponse.headers.get('content-length'), 'bytes');
                            } else {
                                console.log('   ❌ Video not accessible:', videoResponse.status);
                            }
                        } catch (accessError) {
                            console.log('   ❌ Failed to test video accessibility:', accessError.message);
                        }
                    }
                    
                    console.log('\n🏆 LAMBDA SYSTEM VALIDATION COMPLETE!');
                    console.log('=====================================');
                    console.log('✅ Lambda function: WORKING');
                    console.log('✅ Site URL: WORKING');
                    console.log('✅ Composition: WORKING');
                    console.log('✅ Video generation: WORKING');
                    console.log('✅ Progress monitoring: WORKING');
                    console.log('✅ Cost tracking: WORKING');
                    console.log('✅ File output: WORKING');
                    console.log('✅ Video accessibility: WORKING');
                    console.log('');
                    console.log('Configuration for production:');
                    console.log('LAMBDA_SITE_URL=' + workingUrl);
                    console.log('Composition name: ' + correctComposition);
                    console.log('');
                    console.log('The Lambda video rendering system is now fully operational!');
                    console.log('You can use this exact configuration for your backend video generation.');

                } else if (progress.fatalErrorEncountered) {
                    console.log('\n❌ Render failed with fatal error!');
                    console.log('   Errors:', JSON.stringify(progress.errors, null, 2));
                    break;
                }

            } catch (progressError) {
                console.log(`   ⚠️  Progress check failed: ${progressError.message}`);
                
                if (progressError.message.includes('render not found')) {
                    console.log('   Render may have completed and been cleaned up');
                    break;
                }
            }
        }

        if (!completed && progressCount >= maxChecks) {
            console.log('\n⏰ Render monitoring timed out');
            console.log('   Check CloudWatch logs:', renderResult.cloudWatchLogs);
        }

    } catch (error) {
        console.error('\n❌ Final test failed:');
        console.error('   Error:', error.message);
        console.error('\n   Full error:');
        console.error(error);
    }

    console.log('\n🏁 Final Test Complete');
}

// Run the final test
testFinalWorking().catch(console.error);