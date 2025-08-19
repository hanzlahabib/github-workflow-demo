#!/usr/bin/env node

/**
 * Find Working Lambda Site
 * Discovers available sites and updates configuration
 */

require('dotenv').config();

async function findWorkingSite() {
    console.log('🔍 Finding Working Lambda Site');
    console.log('=====================================');

    try {
        console.log('📋 Current Configuration:');
        console.log('Bucket:', process.env.LAMBDA_BUCKET_NAME);
        console.log('Current Site URL:', process.env.LAMBDA_SITE_URL);
        console.log('');

        // Get all available sites
        console.log('🌐 Scanning for available sites...');
        const { getSites } = require('@remotion/lambda');
        
        const sites = await getSites({
            region: process.env.LAMBDA_REGION || 'us-east-1',
            bucketName: process.env.LAMBDA_BUCKET_NAME
        });

        console.log(`✅ Found ${sites.length} sites in bucket:`);
        
        if (sites.length === 0) {
            console.log('❌ No sites found in bucket. You need to deploy a site first.');
            return;
        }

        // Test each site for accessibility and compositions
        for (let i = 0; i < sites.length; i++) {
            const site = sites[i];
            console.log(`\n📦 Site ${i + 1}: ${site.id}`);
            console.log('   Serve URL:', site.serveUrl);
            
            // Test HTTP accessibility
            try {
                const response = await fetch(site.serveUrl);
                console.log('   HTTP Status:', response.status);
                
                if (response.ok) {
                    console.log('   ✅ Site is HTTP accessible');
                    
                    // Test compositions
                    try {
                        const { getCompositionsOnLambda } = require('@remotion/lambda');
                        
                        const compositions = await getCompositionsOnLambda({
                            region: process.env.LAMBDA_REGION || 'us-east-1',
                            functionName: process.env.LAMBDA_FUNCTION_NAME,
                            serveUrl: site.serveUrl,
                            inputProps: {}
                        });
                        
                        console.log(`   ✅ Found ${compositions.length} compositions:`);
                        compositions.forEach(comp => {
                            console.log(`      - ${comp.id} (${comp.width}x${comp.height})`);
                        });
                        
                        // Check for our target composition
                        const hasTarget = compositions.find(c => c.id === 'CleanTextStory');
                        if (hasTarget) {
                            console.log('   🎯 Contains target composition "CleanTextStory"');
                            
                            // This is our working site!
                            console.log('\n🎉 Found working site!');
                            console.log('Site ID:', site.id);
                            console.log('Serve URL:', site.serveUrl);
                            
                            // Test a quick render with this site
                            console.log('\n🚀 Testing quick render with working site...');
                            await testQuickRender(site.serveUrl);
                            
                            // Update .env file
                            console.log('\n📝 Updating .env configuration...');
                            await updateEnvFile(site.serveUrl);
                            
                            return;
                        } else {
                            console.log('   ❌ Does not contain target composition "CleanTextStory"');
                        }
                        
                    } catch (compError) {
                        console.log('   ❌ Failed to get compositions:', compError.message);
                    }
                } else {
                    console.log('   ❌ Site not HTTP accessible');
                }
            } catch (httpError) {
                console.log('   ❌ HTTP test failed:', httpError.message);
            }
        }
        
        console.log('\n❌ No working sites found with the required composition');
        console.log('You may need to deploy a new site with the correct video service');
        
    } catch (error) {
        console.error('❌ Failed to find working site:', error.message);
        console.error(error);
    }
}

async function testQuickRender(siteUrl) {
    try {
        const { renderMediaOnLambda } = require('@remotion/lambda');
        
        const result = await renderMediaOnLambda({
            region: process.env.LAMBDA_REGION || 'us-east-1',
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            composition: 'CleanTextStory',
            serveUrl: siteUrl,
            codec: 'h264',
            inputProps: {
                messages: [
                    { id: "1", text: "Test", sender: "left" },
                    { id: "2", text: "Working!", sender: "right" }
                ]
            },
            privacy: 'public',
            maxRetries: 1,
            framesPerLambda: 4,
            downloadBehavior: { type: 'download', fileName: null }
        });
        
        console.log('   ✅ Quick render initiated successfully!');
        console.log('   Render ID:', result.renderId);
        
        // Quick progress check
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const { getRenderProgress } = require('@remotion/lambda');
        const progress = await getRenderProgress({
            renderId: result.renderId,
            bucketName: result.bucketName,
            functionName: process.env.LAMBDA_FUNCTION_NAME,
            region: process.env.LAMBDA_REGION || 'us-east-1',
        });
        
        console.log('   Progress:', Math.round(progress.overallProgress * 100) + '%');
        
        if (progress.fatalErrorEncountered) {
            console.log('   ❌ Quick render failed');
        } else {
            console.log('   ✅ Quick render is processing successfully');
        }
        
    } catch (renderError) {
        console.log('   ❌ Quick render test failed:', renderError.message);
    }
}

async function updateEnvFile(workingSiteUrl) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const envPath = path.resolve(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update the LAMBDA_SITE_URL
        const oldUrlPattern = /LAMBDA_SITE_URL=.*/;
        const newUrl = `LAMBDA_SITE_URL=${workingSiteUrl}`;
        
        if (oldUrlPattern.test(envContent)) {
            envContent = envContent.replace(oldUrlPattern, newUrl);
        } else {
            envContent += `\n${newUrl}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Updated .env file with working site URL');
        
    } catch (fileError) {
        console.log('❌ Failed to update .env file:', fileError.message);
        console.log('Please manually update LAMBDA_SITE_URL to:', workingSiteUrl);
    }
}

// Run the search
findWorkingSite().catch(console.error);