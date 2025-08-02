#!/usr/bin/env node

/**
 * Simplified Video Generation Test
 * Tests with core essential properties only
 */

require('dotenv').config();

async function testSimplifiedVideoGeneration() {
    console.log('🎬 Simplified Video Generation Test');
    console.log('=====================================');

    const startTime = Date.now();

    try {
        // Simplified input props focusing on core functionality
        const simplifiedProps = {
            title: "My Text Story",
            messages: [
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
            people: {
                "left": {
                    "id": "left",
                    "name": "Alex",
                    "username": "alex_codes"
                },
                "right": {
                    "id": "right",
                    "name": "Jordan", 
                    "username": "jordan_dev"
                }
            },
            uiTheme: "discord-dark",
            duration: 9.17
        };

        console.log('📋 Simplified Configuration:');
        console.log('Messages:', simplifiedProps.messages.length);
        console.log('Duration:', simplifiedProps.duration, 'seconds');
        console.log('Theme:', simplifiedProps.uiTheme);
        console.log('');

        // Initiate Lambda render with simplified props
        console.log('🚀 Initiating simplified Lambda render...');
        const { renderMediaOnLambda } = require('@remotion/lambda');

        const renderParams = {
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'CleanTextStory',
            serveUrl: process.env.LAMBDA_SITE_URL,
            codec: 'h264',
            inputProps: simplifiedProps,
            privacy: 'public',
            maxRetries: 3,
            framesPerLambda: 8,
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            }
        };

        console.log('📡 Sending simplified render request...');
        const renderResult = await renderMediaOnLambda(renderParams);

        console.log('✅ Simplified render initiated successfully!');
        console.log('   Render ID:', renderResult.renderId);
        console.log('   Bucket:', renderResult.bucketName);
        console.log('');

        // Monitor progress
        console.log('📊 Monitoring simplified render progress...');
        const { getRenderProgress } = require('@remotion/lambda');

        let completed = false;
        let progressCount = 0;
        const maxChecks = 30; // 5 minutes max

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
                    console.log('\n🎉 Simplified render completed successfully!');
                    console.log('   Output File:', progress.outputFile || 'Available in bucket');
                    console.log('   Output Size:', progress.outputSizeInBytes ? 
                        Math.round(progress.outputSizeInBytes / (1024 * 1024)) + ' MB' : 'Unknown');
                    console.log('   Total Cost:', progress.costs.displayCost);
                    console.log('   Total Time:', Math.round((Date.now() - startTime) / 1000) + ' seconds');
                    
                    if (progress.outputFile) {
                        console.log('\n🔗 Video Download URL:');
                        console.log('   ', progress.outputFile);
                    }

                    // Test video accessibility
                    if (progress.outputFile) {
                        console.log('\n🌐 Testing video accessibility...');
                        try {
                            const videoResponse = await fetch(progress.outputFile, { method: 'HEAD' });
                            if (videoResponse.ok) {
                                console.log('   ✅ Video is accessible');
                                console.log('   Content-Type:', videoResponse.headers.get('content-type'));
                                console.log('   Content-Length:', videoResponse.headers.get('content-length'), 'bytes');
                            } else {
                                console.log('   ❌ Video not accessible:', videoResponse.status);
                            }
                        } catch (accessError) {
                            console.log('   ❌ Failed to test video accessibility:', accessError.message);
                        }
                    }

                } else if (progress.fatalErrorEncountered) {
                    console.log('\n❌ Simplified render failed with fatal error!');
                    console.log('   Error:', progress.errors?.join(', ') || 'Unknown error');
                    
                    // Try to get more details from the progress object
                    if (progress.errors && progress.errors.length > 0) {
                        console.log('\n   Detailed errors:');
                        progress.errors.forEach((error, index) => {
                            console.log(`   ${index + 1}. ${error}`);
                        });
                    }
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
        console.error('\n❌ Simplified video generation test failed:');
        console.error('   Error:', error.message);
        console.error('\n   Full error details:');
        console.error(error);
    }

    console.log('\n🏁 Simplified Test Complete');
    console.log('Total test duration:', Math.round((Date.now() - startTime) / 1000) + ' seconds');
}

// Run the test
testSimplifiedVideoGeneration().catch(console.error);