#!/usr/bin/env node

/**
 * Fix S3 CORS Configuration for Background Videos
 * Applies the recommended CORS settings to enable Lambda access
 */

require('dotenv').config();

async function fixS3CORS() {
    console.log('🔧 Fixing S3 CORS Configuration');
    console.log('=====================================');

    const bucketName = 'reelspeed-media-storage';
    
    try {
        const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
        
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        console.log('📋 Target Bucket:', bucketName);
        console.log('');

        // Check current CORS configuration
        console.log('🔍 Checking current CORS configuration...');
        try {
            const currentCors = await s3Client.send(new GetBucketCorsCommand({
                Bucket: bucketName
            }));
            console.log('Current CORS rules:');
            console.log(JSON.stringify(currentCors.CORSRules, null, 2));
        } catch (corsError) {
            if (corsError.name === 'NoSuchCORSConfiguration') {
                console.log('❌ No CORS configuration currently exists');
            } else {
                console.log('❌ Failed to get current CORS:', corsError.message);
            }
        }

        // Apply the recommended CORS configuration
        console.log('\n🛠️ Applying recommended CORS configuration...');
        
        const corsConfiguration = {
            CORSRules: [
                {
                    ID: 'LambdaVideoAccess',
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['GET', 'HEAD'],
                    AllowedOrigins: ['*'],
                    ExposeHeaders: [],
                    MaxAgeSeconds: 3600
                },
                {
                    ID: 'RemotionLambdaAccess', 
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                    AllowedOrigins: [
                        'https://*.amazonaws.com',
                        'https://*.lambda.amazonaws.com',
                        'https://remotionlambda-*'
                    ],
                    ExposeHeaders: ['ETag', 'Content-Length'],
                    MaxAgeSeconds: 86400
                }
            ]
        };

        const putCorsCommand = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: corsConfiguration
        });

        await s3Client.send(putCorsCommand);
        console.log('✅ CORS configuration applied successfully!');

        // Verify the configuration
        console.log('\n🔍 Verifying new CORS configuration...');
        const verifiedCors = await s3Client.send(new GetBucketCorsCommand({
            Bucket: bucketName
        }));

        console.log('✅ New CORS rules applied:');
        verifiedCors.CORSRules.forEach((rule, index) => {
            console.log(`   Rule ${index + 1}: ${rule.ID}`);
            console.log(`     Methods: ${rule.AllowedMethods.join(', ')}`);
            console.log(`     Origins: ${rule.AllowedOrigins.join(', ')}`);
            console.log(`     Max Age: ${rule.MaxAgeSeconds} seconds`);
        });

        // Test background video access after CORS fix
        console.log('\n🧪 Testing background video access after CORS fix...');
        await testBackgroundVideoAccess();

    } catch (error) {
        console.error('❌ Failed to fix CORS configuration:', error.message);
        console.error(error);
    }
}

async function testBackgroundVideoAccess() {
    try {
        // Generate a fresh presigned URL
        console.log('🔗 Generating fresh presigned URL...');
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        const bucketName = 'reelspeed-media-storage';
        const videoKey = 'users/1/videos/1754021982623-ib27nd3vh5.mp4';

        const getObjectCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: videoKey
        });

        const freshUrl = await getSignedUrl(s3Client, getObjectCommand, {
            expiresIn: 14400 // 4 hours
        });

        console.log('✅ Fresh presigned URL generated');

        // Test URL accessibility
        console.log('🌐 Testing fresh URL after CORS fix...');
        
        // Wait a moment for CORS changes to propagate
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const testResponse = await fetch(freshUrl, { method: 'HEAD' });
        console.log('   Status:', testResponse.status);
        
        if (testResponse.ok) {
            console.log('   ✅ Background video is now accessible!');
            console.log('   Content-Type:', testResponse.headers.get('content-type'));
            console.log('   Content-Length:', testResponse.headers.get('content-length'), 'bytes');
            
            // Test complete video generation with background
            console.log('\n🎬 Testing complete video generation with working background...');
            await testCompleteVideoWithBackground(freshUrl);
            
        } else {
            console.log('   ❌ Still not accessible. CORS changes may need time to propagate.');
            console.log('   💡 Try again in 5-10 minutes for CORS changes to take effect.');
        }

    } catch (accessError) {
        console.log('❌ Failed to test background video access:', accessError.message);
    }
}

async function testCompleteVideoWithBackground(workingBackgroundUrl) {
    try {
        console.log('📡 Initiating complete test with working background...');
        
        const { renderMediaOnLambda } = require('@remotion/lambda');
        
        // Your original configuration with the working background URL
        const completeConfig = {
            "title": "My Text Story - Fixed Background",
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
                "backgroundUrl": workingBackgroundUrl,
                "backgroundId": "1754021982623-ib27nd3vh5",
                "backgroundOpacity": 70,
                "backgroundBlur": true,
                "musicTrack": "upbeat-electronic",
                "musicVolume": 50,
                "ambientSounds": false,
                "videoVolume": 25,
                "musicStartTime": 0
            },
            "colorCustomization": {
                "senderBubbleColor": "#5865F2",
                "receiverBubbleColor": "#4F545C",
                "senderTextColor": "#FFFFFF",
                "receiverTextColor": "#DCDDDE",
                "uiTheme": "discord-dark"
            },
            "uiTheme": "discord-dark",
            "duration": 9.166666666666666
        };

        const renderParams = {
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'text-story',
            serveUrl: process.env.LAMBDA_SITE_URL,
            codec: 'h264',
            inputProps: completeConfig,
            privacy: 'public',
            maxRetries: 3,
            framesPerLambda: 8,
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            }
        };

        const renderResult = await renderMediaOnLambda(renderParams);

        console.log('✅ Complete render with background initiated!');
        console.log('   Render ID:', renderResult.renderId);
        console.log('   CloudWatch:', renderResult.cloudWatchLogs);

        // Monitor for completion
        console.log('\n📊 Monitoring complete render with background...');
        const { getRenderProgress } = require('@remotion/lambda');

        let completed = false;
        let progressCount = 0;
        const maxChecks = 20;
        const startTime = Date.now();

        while (!completed && progressCount < maxChecks) {
            try {
                await new Promise(resolve => setTimeout(resolve, 10000));
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
                    console.log('\n🎉 COMPLETE SUCCESS! Background video working!');
                    console.log('=====================================');
                    console.log('   ✅ S3 CORS configuration: FIXED');
                    console.log('   ✅ Background video access: WORKING');
                    console.log('   ✅ Lambda video generation: WORKING');
                    console.log('   ✅ Complete configuration: WORKING');
                    console.log('');
                    console.log('   📹 Final video with background:');
                    console.log('   ', progress.outputFile);
                    console.log('   Output Size:', Math.round(progress.outputSizeInBytes / (1024 * 1024)), 'MB');
                    console.log('   Total Cost:', progress.costs.displayCost);
                    console.log('   Total Time:', Math.round((Date.now() - startTime) / 1000), 'seconds');
                    console.log('');
                    console.log('🏆 ALL ISSUES RESOLVED!');
                    console.log('Your Lambda system now supports background videos fully.');

                } else if (progress.fatalErrorEncountered) {
                    console.log('\n❌ Render failed:');
                    console.log('   Errors:', JSON.stringify(progress.errors, null, 2));
                    break;
                }

            } catch (progressError) {
                console.log(`   ⚠️  Progress check failed: ${progressError.message}`);
            }
        }

        if (!completed && progressCount >= maxChecks) {
            console.log('\n⏰ Monitoring timed out - check CloudWatch logs');
        }

    } catch (completeError) {
        console.log('❌ Complete test failed:', completeError.message);
    }
}

// Run the fix
fixS3CORS().catch(console.error);