#!/usr/bin/env node

/**
 * Check S3 Bucket Contents
 * Directly inspect what's in the Lambda bucket
 */

require('dotenv').config();

async function checkBucketContents() {
    console.log('🔍 Checking S3 Bucket Contents');
    console.log('=====================================');

    try {
        console.log('📋 Configuration:');
        console.log('Bucket:', process.env.LAMBDA_BUCKET_NAME);
        console.log('Region:', process.env.LAMBDA_REGION);
        console.log('');

        // Use AWS SDK directly to check bucket contents
        console.log('📦 Checking bucket contents with AWS SDK...');
        const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
        
        const s3Client = new S3Client({
            region: process.env.LAMBDA_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        const listCommand = new ListObjectsV2Command({
            Bucket: process.env.LAMBDA_BUCKET_NAME,
            Prefix: 'sites/',
            MaxKeys: 100
        });

        const response = await s3Client.send(listCommand);
        
        console.log(`✅ Found ${response.Contents?.length || 0} objects in sites/ folder:`);
        
        if (response.Contents && response.Contents.length > 0) {
            const siteKeys = new Set();
            
            response.Contents.forEach(obj => {
                console.log(`   ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`);
                
                // Extract site names
                const match = obj.Key.match(/^sites\/([^\/]+)\//);
                if (match) {
                    siteKeys.add(match[1]);
                }
            });
            
            console.log(`\n🌐 Detected ${siteKeys.size} unique sites:`);
            const sites = Array.from(siteKeys);
            
            for (const siteName of sites) {
                console.log(`\n📦 Testing site: ${siteName}`);
                const siteUrl = `https://${process.env.LAMBDA_BUCKET_NAME}.s3.${process.env.LAMBDA_REGION || 'us-east-1'}.amazonaws.com/sites/${siteName}/`;
                console.log(`   URL: ${siteUrl}`);
                
                // Test HTTP accessibility
                try {
                    const httpResponse = await fetch(siteUrl);
                    console.log(`   HTTP Status: ${httpResponse.status}`);
                    
                    if (httpResponse.ok) {
                        console.log('   ✅ Site is accessible');
                        
                        // Test compositions
                        try {
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
                            
                            // Check for our target
                            const targetComp = compositions.find(c => c.id === 'CleanTextStory');
                            if (targetComp) {
                                console.log('   🎯 Contains target composition "CleanTextStory"!');
                                
                                // Test a quick render
                                console.log('   🚀 Testing quick render...');
                                await testWorkingSite(siteUrl);
                                return;
                            }
                            
                        } catch (compError) {
                            console.log(`   ❌ Compositions failed: ${compError.message}`);
                        }
                    } else {
                        console.log('   ❌ Site not accessible');
                    }
                } catch (httpError) {
                    console.log(`   ❌ HTTP test failed: ${httpError.message}`);
                }
            }
            
        } else {
            console.log('❌ No sites found in bucket');
            
            // Check if bucket exists at all
            console.log('\n🔍 Checking if bucket exists...');
            try {
                const { HeadBucketCommand } = require('@aws-sdk/client-s3');
                await s3Client.send(new HeadBucketCommand({ Bucket: process.env.LAMBDA_BUCKET_NAME }));
                console.log('✅ Bucket exists but has no sites');
                console.log('You need to deploy a site with the video service compositions');
            } catch (bucketError) {
                console.log('❌ Bucket does not exist or access denied:', bucketError.message);
            }
        }

    } catch (error) {
        console.error('❌ Failed to check bucket contents:', error.message);
        console.error(error);
    }
}

async function testWorkingSite(siteUrl) {
    try {
        console.log('   📡 Initiating test render...');
        const { renderMediaOnLambda } = require('@remotion/lambda');
        
        const result = await renderMediaOnLambda({
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'CleanTextStory',
            serveUrl: siteUrl,
            codec: 'h264',
            inputProps: {
                messages: [
                    { id: "1", text: "Success!", sender: "left" },
                    { id: "2", text: "Site is working!", sender: "right" }
                ]
            },
            privacy: 'public',
            maxRetries: 1,
            framesPerLambda: 4,
            downloadBehavior: { type: 'download', fileName: null }
        });
        
        console.log('   ✅ Test render initiated successfully!');
        console.log('   Render ID:', result.renderId);
        
        // Update .env with working site
        console.log('   📝 Updating .env with working site URL...');
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
        
        console.log('\n🎉 WORKING SITE FOUND AND CONFIGURED!');
        console.log('Site URL:', siteUrl);
        console.log('You can now run the full video generation test');
        
    } catch (renderError) {
        console.log('   ❌ Test render failed:', renderError.message);
    }
}

// Run the check
checkBucketContents().catch(console.error);