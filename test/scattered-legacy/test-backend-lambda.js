#!/usr/bin/env node

/**
 * Test Backend Lambda Service Directly
 * Uses the actual backend Lambda service implementation
 */

require('dotenv').config();

async function testBackendLambdaService() {
    console.log('🎬 Backend Lambda Service Test');
    console.log('=====================================');

    const startTime = Date.now();

    try {
        // Load the actual Lambda service from the backend
        console.log('📦 Loading backend Lambda service...');
        
        // We need to compile the TypeScript or use a simpler approach
        // Let's test the Lambda configuration first
        console.log('\n📋 Current Lambda Configuration:');
        console.log('Function Name:', process.env.LAMBDA_FUNCTION_NAME);
        console.log('Region:', process.env.LAMBDA_REGION);
        console.log('Bucket Name:', process.env.LAMBDA_BUCKET_NAME);
        console.log('Site URL:', process.env.LAMBDA_SITE_URL);

        // Test function accessibility
        console.log('\n🔍 Testing Lambda function accessibility...');
        const { getFunctionInfo } = require('@remotion/lambda');
        
        try {
            const functionInfo = await getFunctionInfo({
                region: process.env.LAMBDA_REGION || 'us-east-1',
                functionName: process.env.LAMBDA_FUNCTION_NAME
            });
            
            console.log('✅ Lambda function is accessible:');
            console.log('   Function Name:', functionInfo.functionName);
            console.log('   Memory:', functionInfo.memorySizeInMb, 'MB');
            console.log('   Timeout:', functionInfo.timeoutInSeconds, 'seconds');
            console.log('   Version:', functionInfo.version);
        } catch (funcError) {
            console.log('❌ Lambda function not accessible:', funcError.message);
            return;
        }

        // Test site accessibility with composition check
        console.log('\n🌐 Testing site and compositions...');
        try {
            const { getCompositionsOnLambda } = require('@remotion/lambda');
            
            const compositions = await getCompositionsOnLambda({
                region: process.env.LAMBDA_REGION || 'us-east-1',
                functionName: process.env.LAMBDA_FUNCTION_NAME,
                serveUrl: process.env.LAMBDA_SITE_URL,
                inputProps: {}
            });
            
            console.log('✅ Site is accessible with compositions:');
            compositions.forEach(comp => {
                console.log(`   - ${comp.id} (${comp.width}x${comp.height}, ${comp.fps}fps, ${comp.durationInFrames} frames)`);
            });
            
            // Check if our target composition exists
            const targetComp = compositions.find(c => c.id === 'CleanTextStory');
            if (targetComp) {
                console.log('\n✅ Target composition "CleanTextStory" found');
                console.log('   Duration:', Math.round(targetComp.durationInFrames / targetComp.fps), 'seconds');
            } else {
                console.log('\n❌ Target composition "CleanTextStory" not found');
                console.log('   Available compositions:', compositions.map(c => c.id).join(', '));
                return;
            }
            
        } catch (siteError) {
            console.log('❌ Site not accessible or compositions failed:', siteError.message);
            
            // Try alternative composition
            console.log('\n🔄 Trying alternative approach...');
            try {
                const response = await fetch(process.env.LAMBDA_SITE_URL);
                console.log('   Site HTTP status:', response.status);
                
                if (response.ok) {
                    const content = await response.text();
                    console.log('   Site content length:', content.length, 'bytes');
                    
                    // Check if it looks like a valid Remotion site
                    if (content.includes('remotion') || content.includes('compositions')) {
                        console.log('   ✅ Appears to be a valid Remotion site');
                    } else {
                        console.log('   ❌ Does not appear to be a valid Remotion site');
                    }
                }
            } catch (httpError) {
                console.log('   ❌ Site HTTP test failed:', httpError.message);
            }
            return;
        }

        // Test with very minimal props to isolate issues
        console.log('\n🚀 Testing minimal video generation...');
        const { renderMediaOnLambda } = require('@remotion/lambda');

        const minimalProps = {
            messages: [
                { id: "1", text: "Hello", sender: "left" },
                { id: "2", text: "Hi there!", sender: "right" }
            ]
        };

        const renderParams = {
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'CleanTextStory',
            serveUrl: process.env.LAMBDA_SITE_URL,
            codec: 'h264',
            inputProps: minimalProps,
            privacy: 'public',
            maxRetries: 1,
            framesPerLambda: 4, // Smaller chunks for faster processing
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            }
        };

        console.log('📡 Sending minimal render request...');
        const renderResult = await renderMediaOnLambda(renderParams);

        console.log('✅ Minimal render initiated successfully!');
        console.log('   Render ID:', renderResult.renderId);
        console.log('   CloudWatch:', renderResult.cloudWatchLogs);

        // Quick progress check
        console.log('\n📊 Quick progress check...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

        const { getRenderProgress } = require('@remotion/lambda');
        
        try {
            const progress = await getRenderProgress({
                renderId: renderResult.renderId,
                bucketName: renderResult.bucketName,
                functionName: process.env.LAMBDA_FUNCTION_NAME,
                region: process.env.LAMBDA_REGION || 'us-east-1',
            });

            console.log('   Progress:', Math.round(progress.overallProgress * 100) + '%');
            console.log('   Done:', progress.done);
            console.log('   Cost:', progress.costs.displayCost);
            
            if (progress.fatalErrorEncountered) {
                console.log('   ❌ Fatal error encountered');
                
                // Try to extract better error info
                if (progress.errors) {
                    console.log('   Errors:');
                    progress.errors.forEach((error, index) => {
                        console.log(`   ${index + 1}.`, JSON.stringify(error, null, 2));
                    });
                }
            } else if (progress.done) {
                console.log('   ✅ Render completed!');
                if (progress.outputFile) {
                    console.log('   Output:', progress.outputFile);
                }
            } else {
                console.log('   ⏳ Still processing...');
            }
            
        } catch (progressError) {
            console.log('   ❌ Progress check failed:', progressError.message);
        }

    } catch (error) {
        console.error('\n❌ Backend Lambda service test failed:');
        console.error('   Error:', error.message);
        console.error('\n   Stack trace:');
        console.error(error.stack);
    }

    console.log('\n🏁 Backend Test Complete');
    console.log('Total test duration:', Math.round((Date.now() - startTime) / 1000) + ' seconds');
}

// Run the test
testBackendLambdaService().catch(console.error);