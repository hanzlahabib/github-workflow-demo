#!/usr/bin/env node

/**
 * Generate Fresh Background Video URL
 * Creates a new presigned URL with longer expiration for testing
 */

require('dotenv').config();

async function generateFreshBackgroundUrl() {
    console.log('🔗 Generating Fresh Background Video URL');
    console.log('=====================================');

    try {
        // Use AWS SDK to generate a fresh presigned URL
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        // Original video details from the URL
        const bucketName = 'reelspeed-media-storage';
        const videoKey = 'users/1/videos/1754021982623-ib27nd3vh5.mp4';

        console.log('📋 Video Details:');
        console.log('Bucket:', bucketName);
        console.log('Key:', videoKey);
        console.log('');

        // Test if video exists first
        console.log('🔍 Testing video accessibility...');
        try {
            const headCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: videoKey
            });
            
            const headResult = await s3Client.send(headCommand);
            console.log('✅ Video exists and is accessible');
            console.log('   Content-Type:', headResult.ContentType);
            console.log('   Content-Length:', headResult.ContentLength, 'bytes');
            console.log('   Last Modified:', headResult.LastModified);
        } catch (headError) {
            console.log('❌ Video not accessible:', headError.message);
            return;
        }

        // Generate fresh presigned URL with 4 hour expiration
        console.log('\n🔗 Generating fresh presigned URL...');
        const getObjectCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: videoKey
        });

        const freshUrl = await getSignedUrl(s3Client, getObjectCommand, {
            expiresIn: 14400 // 4 hours
        });

        console.log('✅ Fresh presigned URL generated:');
        console.log('   Expires in: 4 hours');
        console.log('   URL:', freshUrl);

        // Test the fresh URL
        console.log('\n🌐 Testing fresh URL accessibility...');
        try {
            const testResponse = await fetch(freshUrl, { method: 'HEAD' });
            console.log('   Status:', testResponse.status);
            
            if (testResponse.ok) {
                console.log('   ✅ Fresh URL is accessible!');
                console.log('   Content-Type:', testResponse.headers.get('content-type'));
                console.log('   Content-Length:', testResponse.headers.get('content-length'), 'bytes');
                
                // Now test with this fresh URL in a video render
                console.log('\n🎬 Testing video render with fresh background URL...');
                await testWithFreshUrl(freshUrl);
                
            } else {
                console.log('   ❌ Fresh URL still not accessible');
            }
        } catch (testError) {
            console.log('   ❌ Failed to test fresh URL:', testError.message);
        }

    } catch (error) {
        console.error('❌ Failed to generate fresh URL:', error.message);
        console.error(error);
    }
}

async function testWithFreshUrl(freshBackgroundUrl) {
    try {
        const { renderMediaOnLambda } = require('@remotion/lambda');
        
        // Configuration with fresh background URL
        const configWithFreshUrl = {
            "title": "Test with Fresh Background",
            "messages": [
                {
                    "id": "1",
                    "text": "Testing fresh background URL",
                    "sender": "left",
                    "delay": 0
                },
                {
                    "id": "2",
                    "text": "This should show the background video!",
                    "sender": "right",
                    "delay": 1000
                }
            ],
            "people": {
                "left": {
                    "id": "left",
                    "name": "Alex",
                    "username": "alex_test"
                },
                "right": {
                    "id": "right",
                    "name": "Jordan",
                    "username": "jordan_test"
                }
            },
            "backgroundSettings": {
                "backgroundType": "video",
                "backgroundUrl": freshBackgroundUrl,
                "backgroundOpacity": 70,
                "backgroundBlur": true,
                "videoVolume": 25
            },
            "uiTheme": "discord-dark",
            "duration": 6
        };

        const renderParams = {
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'text-story',
            serveUrl: process.env.LAMBDA_SITE_URL,
            codec: 'h264',
            inputProps: configWithFreshUrl,
            privacy: 'public',
            maxRetries: 2,
            framesPerLambda: 8,
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            }
        };

        console.log('   📡 Sending render with fresh background URL...');
        const renderResult = await renderMediaOnLambda(renderParams);

        console.log('   ✅ Render with fresh background initiated!');
        console.log('   Render ID:', renderResult.renderId);

        // Quick progress check
        console.log('\n   📊 Checking render progress...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

        const { getRenderProgress } = require('@remotion/lambda');
        
        const progress = await getRenderProgress({
            renderId: renderResult.renderId,
            bucketName: renderResult.bucketName,
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            region: process.env.LAMBDA_REGION || 'us-east-1',
        });

        console.log('   Progress:', Math.round(progress.overallProgress * 100) + '%');
        
        if (progress.done) {
            console.log('   🎉 RENDER COMPLETED WITH FRESH BACKGROUND!');
            console.log('   Output:', progress.outputFile);
            console.log('');
            console.log('   📝 Solution: Use fresh presigned URLs with longer expiration');
            console.log('   💡 Recommendation: Generate presigned URLs with at least 4-hour expiration');
        } else if (progress.fatalErrorEncountered) {
            console.log('   ❌ Render still failed with fresh URL');
            console.log('   Errors:', JSON.stringify(progress.errors, null, 2));
        } else {
            console.log('   ⏳ Render still in progress with fresh background URL');
        }

    } catch (freshUrlError) {
        console.log('   ❌ Failed to test with fresh URL:', freshUrlError.message);
    }
}

// Run the test
generateFreshBackgroundUrl().catch(console.error);