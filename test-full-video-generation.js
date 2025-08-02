#!/usr/bin/env node

/**
 * Full Video Generation Test with Real Request Object
 * Tests the complete pipeline with the exact object sent to backend
 */

require('dotenv').config();

const testRequest = {
    "type": "story",
    "input": {
        "text": "left: Hey, did you hear what happened?\nright: No, what happened?\nleft: You won't believe this story...",
        "config": {
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
            }
        }
    },
    "settings": {
        "duration": 9.166666666666666,
        "background": "https://reelspeed-media-storage.s3.us-east-1.amazonaws.com/users/1/videos/1754021982623-ib27nd3vh5.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAZZ2AFBPW3C2U2QSU%2F20250802%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250802T071656Z&X-Amz-Expires=3600&X-Amz-Signature=df8d142b5a8afd9b0cbaa45b7fa5346cd91d1c94299ab8b1b96ab2f36c14f86c&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
        "language": "en"
    },
    "userId": "1"
};

async function testFullVideoGeneration() {
    console.log('🎬 Full Video Generation Test');
    console.log('=====================================');
    console.log('Testing with real request object...\n');

    const startTime = Date.now();

    try {
        console.log('📋 Request Configuration:');
        console.log('Type:', testRequest.type);
        console.log('Duration:', testRequest.settings.duration, 'seconds');
        console.log('Messages:', testRequest.input.config.messages.length);
        console.log('User ID:', testRequest.userId);
        console.log('UI Theme:', testRequest.input.config.uiTheme);
        console.log('Background Type:', testRequest.input.config.backgroundSettings.backgroundType);
        console.log('');

        // Initiate Lambda render
        console.log('🚀 Initiating Lambda render...');
        const { renderMediaOnLambda } = require('@remotion/lambda');

        const renderParams = {
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'CleanTextStory', // Main composition for text stories
            serveUrl: process.env.LAMBDA_SITE_URL,
            codec: 'h264',
            inputProps: {
                // Map the request object to Remotion input props
                title: testRequest.input.config.title,
                messages: testRequest.input.config.messages,
                people: testRequest.input.config.people,
                backgroundSettings: testRequest.input.config.backgroundSettings,
                colorCustomization: testRequest.input.config.colorCustomization,
                chatOverlay: testRequest.input.config.chatOverlay,
                uiTheme: testRequest.input.config.uiTheme,
                captions: testRequest.input.config.captions,
                notificationSettings: testRequest.input.config.notificationSettings,
                chatSimulationSettings: testRequest.input.config.chatSimulationSettings,
                visualEffectsSettings: testRequest.input.config.visualEffectsSettings,
                voiceAudioSettings: testRequest.input.config.voiceAudioSettings,
                animationSettings: testRequest.input.config.animationSettings,
                videoSettings: testRequest.input.config.videoSettings,
                // Additional settings
                duration: testRequest.settings.duration,
                background: testRequest.settings.background,
                language: testRequest.settings.language
            },
            privacy: 'public',
            maxRetries: 3,
            framesPerLambda: 8,
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            },
        };

        console.log('📡 Sending render request to Lambda...');
        const renderResult = await renderMediaOnLambda(renderParams);

        console.log('✅ Render initiated successfully!');
        console.log('   Render ID:', renderResult.renderId);
        console.log('   Bucket:', renderResult.bucketName);
        console.log('   CloudWatch Logs:', renderResult.cloudWatchLogs);
        console.log('');

        // Monitor progress until completion
        console.log('📊 Monitoring render progress...');
        const { getRenderProgress } = require('@remotion/lambda');

        let completed = false;
        let progressCount = 0;
        const maxChecks = 60; // Maximum 10 minutes (60 checks * 10 seconds)

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
                    console.log('\n🎉 Render completed successfully!');
                    console.log('   Output File:', progress.outputFile || 'Available in bucket');
                    console.log('   Output Size:', progress.outputSizeInBytes ? 
                        Math.round(progress.outputSizeInBytes / (1024 * 1024)) + ' MB' : 'Unknown');
                    console.log('   Total Cost:', progress.costs.displayCost);
                    console.log('   Total Time:', Math.round((Date.now() - startTime) / 1000) + ' seconds');
                    
                    if (progress.outputFile) {
                        console.log('   Download URL:', progress.outputFile);
                    }
                } else if (progress.fatalErrorEncountered) {
                    console.log('\n❌ Render failed with fatal error!');
                    console.log('   Error:', progress.errors?.join(', ') || 'Unknown error');
                    break;
                }

            } catch (progressError) {
                console.log(`   ⚠️  Progress check failed: ${progressError.message}`);
                
                // If it's a render not found error, the render might have completed
                if (progressError.message.includes('render not found') || 
                    progressError.message.includes('does not exist')) {
                    console.log('   Render may have completed and been cleaned up');
                    break;
                }
            }
        }

        if (!completed && progressCount >= maxChecks) {
            console.log('\n⏰ Render monitoring timed out after 10 minutes');
            console.log('   The render may still be processing in the background');
            console.log('   Check CloudWatch logs for details:', renderResult.cloudWatchLogs);
        }

    } catch (error) {
        console.error('\n❌ Video generation test failed:');
        console.error('   Error:', error.message);
        
        if (error.message.includes('AccessDenied')) {
            console.error('   This appears to be an AWS permissions issue');
        } else if (error.message.includes('composition')) {
            console.error('   This appears to be a composition or site deployment issue');
        } else if (error.message.includes('timeout')) {
            console.error('   This appears to be a timeout issue');
        }
        
        console.error('\n   Full error details:');
        console.error(error);
    }

    console.log('\n🏁 Test Complete');
    console.log('Total test duration:', Math.round((Date.now() - startTime) / 1000) + ' seconds');
}

// Run the test
testFullVideoGeneration().catch(console.error);