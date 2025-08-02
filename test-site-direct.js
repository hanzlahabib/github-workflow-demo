#!/usr/bin/env node

/**
 * Test Site Direct Access
 * Try accessing the index.html file directly and check bucket policy
 */

require('dotenv').config();

async function testSiteDirectAccess() {
    console.log('🔍 Testing Direct Site Access');
    console.log('=====================================');

    const bucketName = process.env.LAMBDA_BUCKET_NAME;
    const region = process.env.LAMBDA_REGION || 'us-east-1';
    
    // Test each site with different URL patterns
    const sites = [
        '8rrgwhy76p',
        'reelspeed-optimized-20250802115737', 
        'video-service-fixed-progress-202508011606'
    ];

    for (const siteName of sites) {
        console.log(`\n📦 Testing site: ${siteName}`);
        
        // Try different URL patterns
        const urlPatterns = [
            `https://${bucketName}.s3.${region}.amazonaws.com/sites/${siteName}/`,
            `https://${bucketName}.s3.${region}.amazonaws.com/sites/${siteName}/index.html`,
            `https://${bucketName}.s3.amazonaws.com/sites/${siteName}/`,
            `https://${bucketName}.s3.amazonaws.com/sites/${siteName}/index.html`,
            `https://s3.${region}.amazonaws.com/${bucketName}/sites/${siteName}/index.html`
        ];

        for (const url of urlPatterns) {
            try {
                console.log(`   Testing: ${url}`);
                const response = await fetch(url);
                console.log(`   Status: ${response.status}`);
                
                if (response.ok) {
                    console.log('   ✅ SUCCESS! Site is accessible');
                    
                    // Get the content
                    const content = await response.text();
                    console.log('   Content length:', content.length);
                    
                    // Check if it's a valid Remotion site
                    if (content.includes('remotion') || content.includes('Remotion')) {
                        console.log('   ✅ Appears to be a valid Remotion site');
                        
                        // Use the base URL without index.html for compositions
                        const baseUrl = url.replace('/index.html', '/');
                        console.log('   Base URL:', baseUrl);
                        
                        // Test compositions with this working URL
                        await testCompositionsWithUrl(baseUrl);
                        return baseUrl; // Return the working URL
                    }
                }
            } catch (error) {
                console.log(`   Error: ${error.message}`);
            }
        }
    }
    
    console.log('\n❌ No accessible sites found');
    
    // Try to check bucket policy
    console.log('\n🔒 Checking bucket configuration...');
    await checkBucketPolicy();
}

async function testCompositionsWithUrl(siteUrl) {
    try {
        console.log('   🧪 Testing compositions...');
        const { getCompositionsOnLambda } = require('@remotion/lambda');
        
        const compositions = await getCompositionsOnLambda({
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            serveUrl: siteUrl,
            inputProps: {}
        });
        
        console.log(`   ✅ Found ${compositions.length} compositions:`);
        compositions.forEach(comp => {
            console.log(`      - ${comp.id} (${comp.width}x${comp.height})`);
        });
        
        // Check for target composition
        const targetComp = compositions.find(c => c.id === 'CleanTextStory');
        if (targetComp) {
            console.log('   🎯 Found target composition "CleanTextStory"!');
            
            // Update .env file with working URL
            console.log('   📝 Updating .env file...');
            const fs = require('fs');
            const path = require('path');
            
            const envPath = path.resolve(__dirname, '.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            const oldUrlPattern = /LAMBDA_SITE_URL=.*/;
            const newUrl = `LAMBDA_SITE_URL=${siteUrl}`;
            
            if (oldUrlPattern.test(envContent)) {
                envContent = envContent.replace(oldUrlPattern, newUrl);
            } else {
                envContent += `\n${newUrl}`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('   ✅ Updated .env file with working site URL');
            
            // Test a quick render
            console.log('   🚀 Testing video generation...');
            await testVideoGeneration(siteUrl);
            
        } else {
            console.log('   ❌ Target composition "CleanTextStory" not found');
            console.log('   Available:', compositions.map(c => c.id).join(', '));
        }
        
    } catch (compError) {
        console.log('   ❌ Compositions test failed:', compError.message);
    }
}

async function testVideoGeneration(siteUrl) {
    try {
        const { renderMediaOnLambda } = require('@remotion/lambda');
        
        // Use your original test object but simplified
        const inputProps = {
            title: "Test Story",
            messages: [
                {
                    id: "1",
                    text: "Hey, did you hear what happened?",
                    sender: "left",
                    delay: 0
                },
                {
                    id: "2",
                    text: "No, what happened?",
                    sender: "right",
                    delay: 1000
                },
                {
                    id: "3",
                    text: "You won't believe this story...",
                    sender: "left",
                    delay: 2000
                }
            ],
            people: {
                left: {
                    id: "left",
                    name: "Alex",
                    username: "alex_codes"
                },
                right: {
                    id: "right",
                    name: "Jordan",
                    username: "jordan_dev"
                }
            },
            uiTheme: "discord-dark",
            duration: 9.17
        };
        
        const result = await renderMediaOnLambda({
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'CleanTextStory',
            serveUrl: siteUrl,
            codec: 'h264',
            inputProps: inputProps,
            privacy: 'public',
            maxRetries: 2,
            framesPerLambda: 8,
            downloadBehavior: { 
                type: 'download',
                fileName: null 
            }
        });
        
        console.log('   ✅ Video generation initiated successfully!');
        console.log('   Render ID:', result.renderId);
        console.log('   CloudWatch:', result.cloudWatchLogs);
        
        console.log('\n🎉 FULL LAMBDA SYSTEM IS WORKING!');
        console.log('Working site URL:', siteUrl);
        console.log('Render ID:', result.renderId);
        console.log('');
        console.log('You can now use this configuration for video generation.');
        
    } catch (renderError) {
        console.log('   ❌ Video generation failed:', renderError.message);
    }
}

async function checkBucketPolicy() {
    try {
        const { S3Client, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');
        
        const s3Client = new S3Client({
            region: process.env.LAMBDA_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        const policy = await s3Client.send(new GetBucketPolicyCommand({
            Bucket: process.env.LAMBDA_BUCKET_NAME
        }));
        
        console.log('   Bucket policy exists');
        const policyDoc = JSON.parse(policy.Policy);
        console.log('   Policy statements:', policyDoc.Statement?.length || 0);
        
    } catch (policyError) {
        if (policyError.name === 'NoSuchBucketPolicy') {
            console.log('   ❌ No bucket policy set (this might be the issue)');
            console.log('   The bucket needs public read access for sites to work');
        } else {
            console.log('   ❌ Failed to check bucket policy:', policyError.message);
        }
    }
}

// Run the test
testSiteDirectAccess().catch(console.error);