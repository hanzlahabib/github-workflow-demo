#!/usr/bin/env node

/**
 * Test Background Video Rendering
 * Tests the full configuration with background video URL
 */

require('dotenv').config();

async function testBackgroundVideo() {
    console.log('🎬 Testing Background Video Rendering');
    console.log('=====================================');

    const fullConfigWithBackground = {
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
            "backgroundId": "1754021982623-ib27nd3vh5",
            "backgroundOpacity": 70,
            "backgroundBlur": true,
            "musicTrack": "upbeat-electronic",
            "musicVolume": 50,
            "ambientSounds": false,
            "videoVolume": 25,
            "musicStartTime": 0
        },
        "musicVolume": 50,
        "videoVolume": 25,
        "colorCustomization": {
            "senderBubbleColor": "#5865F2",
            "receiverBubbleColor": "#4F545C",
            "senderTextColor": "#FFFFFF",
            "receiverTextColor": "#DCDDDE",
            "chatHeaderBackground": "#2F3136",
            "chatHeaderText": "#FFFFFF",
            "statusBarBackground": "#075E54",
            "inputAreaBackground": "#2F3136",
            "chatContainerBackground": "#36393F",
            "chatContainerBorder": "#2F3136",
            "chatContainerShadow": "rgba(0,0,0,0.1)",
            "shortsBackground": "linear-gradient(135deg, #075E54 0%, #25D366 100%)",
            "shortsBackgroundType": "gradient",
            "accentColor": "#5865F2",
            "timestampColor": "#DCDDDE",
            "typingIndicatorColor": "#8696A0",
            "headerIconsColor": "#FFFFFF",
            "userNameColor": "#FFFFFF",
            "onlineStatusColor": "#A2D2FF",
            "callButtonColor": "#FFFFFF",
            "inputBorderColor": "#E3E3E3",
            "inputTextColor": "#000000",
            "inputPlaceholderColor": "#8696A0",
            "mediaButtonColor": "#8696A0",
            "sendButtonColor": "#FFFFFF"
        },
        "chatOverlay": {
            "opacity": 100,
            "verticalPosition": 50,
            "horizontalPosition": 50,
            "width": 400,
            "height": 550,
            "borderRadius": 20,
            "backgroundPattern": "none",
            "backgroundOpacity": 90,
            "scale": 2,
            "fontSize": 16,
            "autoScale": true
        },
        "uiTheme": "discord-dark",
        "captions": {
            "enabled": false,
            "autoGenerate": true,
            "language": "en",
            "style": {
                "fontFamily": "Arial, sans-serif",
                "fontSize": 24,
                "fontWeight": "bold",
                "color": "#FFFFFF",
                "backgroundColor": "rgba(0, 0, 0, 0.8)",
                "borderRadius": 8,
                "padding": 12,
                "margin": 20,
                "textAlign": "center",
                "textShadow": "2px 2px 4px rgba(0, 0, 0, 0.5)",
                "lineHeight": 1.4,
                "maxWidth": "80%",
                "position": "bottom",
                "animationType": "fade",
                "duration": 3000
            },
            "lines": []
        },
        "notificationSettings": {
            "showNotifications": true,
            "notificationStyle": "ios",
            "soundEnabled": true,
            "volume": 50,
            "vibrationEnabled": false,
            "soundType": "default",
            "bannerStyle": "modern",
            "showProfilePictures": true,
            "animationType": "slide"
        },
        "chatSimulationSettings": {
            "showReadReceipts": true,
            "showTypingIndicators": true,
            "showTimestamps": false,
            "showUsernames": true,
            "enableReactions": false,
            "simulateDelay": true,
            "showOnlineStatus": true,
            "showLastSeen": false,
            "typingSpeed": "medium",
            "readReceiptDelay": 1000,
            "typingIndicatorDuration": 2000,
            "messageDelay": 1500,
            "autoScroll": true,
            "showDeliveredStatus": true,
            "showSeenStatus": true,
            "reactionAnimations": true,
            "chatStartPosition": "bottom"
        },
        "visualEffectsSettings": {
            "screenShake": true,
            "particleEffects": true,
            "glitchEffects": true,
            "messageGlow": true,
            "pulseEffects": true,
            "backgroundBlur": false,
            "neonEffects": true,
            "matrixRain": false,
            "fireEffects": false,
            "hologramMode": false,
            "screenShakeIntensity": 65,
            "particleEffectsIntensity": 80,
            "glitchEffectsIntensity": 60,
            "messageGlowIntensity": 85,
            "pulseEffectsIntensity": 75,
            "backgroundBlurIntensity": 30,
            "neonEffectsIntensity": 90,
            "matrixRainIntensity": 60,
            "fireEffectsIntensity": 70,
            "hologramModeIntensity": 50
        },
        "voiceAudioSettings": {
            "masterVolume": 90,
            "voiceVolume": 95,
            "soundEffects": true,
            "bassBoost": true,
            "echoEffect": true,
            "reverbLevel": 25,
            "noiseReduction": true,
            "voiceStability": 55,
            "voiceSimilarity": 75,
            "voicePlaybackRate": 1.1,
            "voicePitch": 1.05
        },
        "animationSettings": {
            "messageAnimationType": "bounce",
            "animationSpeed": "fast",
            "transitionDuration": 250,
            "enablePhysics": true,
            "bounciness": 0.3,
            "dampening": 0.8,
            "stiffness": 200,
            "enableParallax": false,
            "parallaxStrength": 0.5,
            "enableBlur": false,
            "blurAmount": 5,
            "enableScale": true,
            "scaleAmount": 1.05,
            "enableRotation": false,
            "rotationAmount": 2,
            "easing": "ease-out",
            "swipeAnimations": true,
            "parallaxEffect": true,
            "morphingText": true,
            "bounceIntensity": 70,
            "showNotifications": true,
            "showTypingIndicators": true,
            "showMessageAnimations": true,
            "messageDelay": 1500,
            "baseDelay": 500
        },
        "videoSettings": {
            "duration": 9.166666666666666,
            "greenScreen": false,
            "unreadMessagesCount": 0,
            "brainrotMode": false,
            "showReadReceipts": true,
            "showTimestamps": false,
            "enableReactions": false,
            "showOnlineStatus": true,
            "showLastSeen": false,
            "simulateDelay": true
        },
        // Additional background configuration
        "background": "https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAZZ2AFBPW3C2U2QSU%2F20250802%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250802T071656Z&X-Amz-Expires=3600&X-Amz-Signature=df8d142b5a8afd9b0cbaa45b7fa5346cd91d1c94299ab8b1b96ab2f36c14f86c&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
        "duration": 9.166666666666666,
        "language": "en"
    };

    console.log('📋 Configuration Analysis:');
    console.log('Background Type:', fullConfigWithBackground.backgroundSettings.backgroundType);
    console.log('Background URL:', fullConfigWithBackground.backgroundSettings.backgroundUrl ? 'PROVIDED' : 'MISSING');
    console.log('Background Opacity:', fullConfigWithBackground.backgroundSettings.backgroundOpacity);
    console.log('Background Blur:', fullConfigWithBackground.backgroundSettings.backgroundBlur);
    console.log('Video Volume:', fullConfigWithBackground.backgroundSettings.videoVolume);
    console.log('');

    // Test background video accessibility first
    console.log('🌐 Testing background video accessibility...');
    try {
        const bgVideoUrl = fullConfigWithBackground.backgroundSettings.backgroundUrl;
        const bgResponse = await fetch(bgVideoUrl, { method: 'HEAD' });
        console.log('Background video status:', bgResponse.status);
        
        if (bgResponse.ok) {
            console.log('✅ Background video is accessible');
            console.log('   Content-Type:', bgResponse.headers.get('content-type'));
            console.log('   Content-Length:', bgResponse.headers.get('content-length'), 'bytes');
        } else {
            console.log('❌ Background video not accessible - this could be the issue!');
            console.log('   Status:', bgResponse.status, bgResponse.statusText);
        }
    } catch (bgError) {
        console.log('❌ Failed to test background video:', bgError.message);
    }

    try {
        console.log('\n🚀 Testing video generation with background...');
        const { renderMediaOnLambda } = require('@remotion/lambda');
        
        const workingUrl = process.env.LAMBDA_SITE_URL;
        
        const renderParams = {
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'text-story',
            serveUrl: workingUrl,
            codec: 'h264',
            inputProps: fullConfigWithBackground,
            privacy: 'public',
            maxRetries: 2,
            framesPerLambda: 8,
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            }
        };

        console.log('📡 Sending render request with background configuration...');
        const renderResult = await renderMediaOnLambda(renderParams);

        console.log('✅ Background video render initiated successfully!');
        console.log('   Render ID:', renderResult.renderId);
        console.log('   CloudWatch:', renderResult.cloudWatchLogs);

        // Monitor progress
        console.log('\n📊 Monitoring background video render...');
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
                    console.log('\n🎉 BACKGROUND VIDEO RENDER COMPLETED!');
                    console.log('=====================================');
                    console.log('   Output File:', progress.outputFile || 'Available in bucket');
                    console.log('   Output Size:', progress.outputSizeInBytes ? 
                        Math.round(progress.outputSizeInBytes / (1024 * 1024)) + ' MB' : 'Unknown');
                    console.log('   Total Cost:', progress.costs.displayCost);
                    console.log('   Total Time:', Math.round((Date.now() - startTime) / 1000) + ' seconds');
                    
                    if (progress.outputFile) {
                        console.log('\n🔗 VIDEO WITH BACKGROUND URL:');
                        console.log('   ', progress.outputFile);
                        
                        console.log('\n📊 Please check this video to verify:');
                        console.log('   ✓ Background video is visible');
                        console.log('   ✓ Background opacity (70%) is applied');
                        console.log('   ✓ Background blur is applied');
                        console.log('   ✓ Chat overlay is properly positioned');
                        console.log('   ✓ Video volume is at 25%');
                        
                        // Test video accessibility
                        console.log('\n🌐 Testing final video accessibility...');
                        try {
                            const videoResponse = await fetch(progress.outputFile, { method: 'HEAD' });
                            if (videoResponse.ok) {
                                console.log('   ✅ Video is accessible and downloadable');
                                console.log('   Size:', Math.round(parseInt(videoResponse.headers.get('content-length')) / (1024 * 1024)), 'MB');
                            }
                        } catch (accessError) {
                            console.log('   ❌ Failed to test video accessibility:', accessError.message);
                        }
                    }

                } else if (progress.fatalErrorEncountered) {
                    console.log('\n❌ Background video render failed!');
                    console.log('   Errors:', JSON.stringify(progress.errors, null, 2));
                    
                    // Check if it's a background video related error
                    const errorStr = JSON.stringify(progress.errors);
                    if (errorStr.includes('background') || errorStr.includes('video') || errorStr.includes('fetch') || errorStr.includes('CORS')) {
                        console.log('\n🔍 This appears to be a background video issue:');
                        console.log('   - Check if background video URL is accessible');
                        console.log('   - Verify CORS settings for background video');
                        console.log('   - Check if Remotion composition handles backgroundUrl properly');
                    }
                    break;
                }

            } catch (progressError) {
                console.log(`   ⚠️  Progress check failed: ${progressError.message}`);
            }
        }

        if (!completed && progressCount >= maxChecks) {
            console.log('\n⏰ Background video render monitoring timed out');
            console.log('   Check CloudWatch logs:', renderResult.cloudWatchLogs);
        }

    } catch (error) {
        console.error('\n❌ Background video test failed:');
        console.error('   Error:', error.message);
        
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            console.error('\n🔍 This appears to be a CORS or network issue with the background video:');
            console.error('   - The background video URL may not be accessible from Lambda');
            console.error('   - Check CORS policy on the S3 bucket containing the background video');
            console.error('   - Verify the presigned URL has not expired');
        }
    }

    console.log('\n🏁 Background Video Test Complete');
    
    // Provide debugging information
    console.log('\n🔧 Debugging Information:');
    console.log('=====================================');
    console.log('Background URL:', fullConfigWithBackground.backgroundSettings.backgroundUrl);
    console.log('');
    console.log('If background video is not showing, check:');
    console.log('1. Background video URL accessibility from Lambda environment');
    console.log('2. CORS settings on the S3 bucket');
    console.log('3. Remotion composition background handling in text-story composition');
    console.log('4. Presigned URL expiration (current URL expires in 1 hour)');
    console.log('5. Background video format compatibility with Remotion');
}

// Run the background video test
testBackgroundVideo().catch(console.error);