#!/usr/bin/env node

/**
 * Create Public Backgrounds Library Bucket
 * Fixed region configuration
 */

require('dotenv').config();

async function createPublicBackgroundsLibrary() {
    console.log('📚 Creating Public Backgrounds Library');
    console.log('=====================================');

    try {
        const { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
        
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        const backgroundsBucketName = 'reelspeed-backgrounds-library';
        const region = process.env.AWS_REGION || 'us-east-1';
        
        console.log('🪣 Creating bucket:', backgroundsBucketName);
        console.log('📍 Region:', region);

        try {
            // Create bucket with proper region handling
            const createParams = {
                Bucket: backgroundsBucketName
            };
            
            // Only add CreateBucketConfiguration for regions other than us-east-1
            if (region !== 'us-east-1') {
                createParams.CreateBucketConfiguration = {
                    LocationConstraint: region
                };
            }

            await s3Client.send(new CreateBucketCommand(createParams));
            console.log('✅ Public backgrounds library bucket created successfully!');
            
        } catch (createError) {
            if (createError.name === 'BucketAlreadyOwnedByYou' || createError.name === 'BucketAlreadyExists') {
                console.log('✅ Bucket already exists, proceeding with configuration...');
            } else {
                console.log('❌ Bucket creation failed:', createError.message);
                return;
            }
        }

        // Set CORS for Lambda access
        console.log('🔧 Configuring CORS for Lambda access...');
        const corsConfig = {
            CORSRules: [
                {
                    ID: 'LambdaBackgroundAccess',
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['GET', 'HEAD'],
                    AllowedOrigins: ['*'],
                    ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
                    MaxAgeSeconds: 86400
                }
            ]
        };

        await s3Client.send(new PutBucketCorsCommand({
            Bucket: backgroundsBucketName,
            CORSConfiguration: corsConfig
        }));
        console.log('✅ CORS configured for Lambda access');

        // Set public read policy
        console.log('🔓 Setting public read policy...');
        const publicPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Sid: 'PublicReadGetObject',
                    Effect: 'Allow',
                    Principal: '*',
                    Action: 's3:GetObject',
                    Resource: `arn:aws:s3:::${backgroundsBucketName}/*`
                }
            ]
        };

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: backgroundsBucketName,
            Policy: JSON.stringify(publicPolicy)
        }));
        console.log('✅ Public read policy applied');

        // Upload a sample background
        console.log('\n📁 Uploading sample backgrounds...');
        await uploadSampleBackgrounds(s3Client, backgroundsBucketName);

        console.log('\n🎯 PUBLIC BACKGROUNDS LIBRARY SETUP COMPLETE!');
        console.log('===============================================');
        console.log(`Bucket Name: ${backgroundsBucketName}`);
        console.log(`Base URL: https://${backgroundsBucketName}.s3.${region}.amazonaws.com/`);
        console.log('');
        console.log('📂 Directory Structure:');
        console.log('   /gradients/          - Gradient backgrounds');
        console.log('   /nature/             - Nature videos');
        console.log('   /abstract/           - Abstract animations');
        console.log('   /gaming/             - Gaming backgrounds');
        console.log('   /business/           - Professional backgrounds');
        console.log('');
        console.log('🔒 Privacy: This bucket is for SHARED backgrounds only');
        console.log('📱 User uploads: Stay private in original bucket');

    } catch (error) {
        console.error('❌ Failed to create public backgrounds library:', error.message);
    }
}

async function uploadSampleBackgrounds(s3Client, bucketName) {
    try {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        
        // Create sample background categories with metadata
        const sampleBackgrounds = [
            {
                key: 'gradients/purple-blue-gradient.json',
                content: JSON.stringify({
                    type: 'gradient',
                    name: 'Purple Blue Gradient',
                    colors: ['#667eea', '#764ba2'],
                    direction: '45deg',
                    category: 'gradients',
                    tags: ['purple', 'blue', 'gradient', 'smooth']
                })
            },
            {
                key: 'gradients/sunset-gradient.json', 
                content: JSON.stringify({
                    type: 'gradient',
                    name: 'Sunset Gradient',
                    colors: ['#ff9a9e', '#fecfef', '#fecfef'],
                    direction: '0deg',
                    category: 'gradients',
                    tags: ['sunset', 'pink', 'warm', 'romantic']
                })
            },
            {
                key: 'nature/placeholder.json',
                content: JSON.stringify({
                    type: 'video',
                    name: 'Nature Placeholder',
                    description: 'Upload nature background videos here',
                    category: 'nature',
                    tags: ['nature', 'outdoor', 'green', 'peaceful']
                })
            },
            {
                key: 'abstract/placeholder.json',
                content: JSON.stringify({
                    type: 'video', 
                    name: 'Abstract Placeholder',
                    description: 'Upload abstract animation videos here',
                    category: 'abstract',
                    tags: ['abstract', 'motion', 'digital', 'artistic']
                })
            },
            {
                key: 'backgrounds-catalog.json',
                content: JSON.stringify({
                    version: '1.0',
                    lastUpdated: new Date().toISOString(),
                    categories: [
                        {
                            id: 'gradients',
                            name: 'Gradients',
                            description: 'Smooth gradient backgrounds',
                            type: 'generated'
                        },
                        {
                            id: 'nature',
                            name: 'Nature',
                            description: 'Natural outdoor scenes',
                            type: 'video'
                        },
                        {
                            id: 'abstract',
                            name: 'Abstract',
                            description: 'Abstract motion graphics',
                            type: 'video'
                        },
                        {
                            id: 'gaming',
                            name: 'Gaming',
                            description: 'Gaming-themed backgrounds',
                            type: 'video'
                        },
                        {
                            id: 'business',
                            name: 'Business',
                            description: 'Professional backgrounds',
                            type: 'video'
                        }
                    ]
                })
            }
        ];

        for (const bg of sampleBackgrounds) {
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: bg.key,
                Body: bg.content,
                ContentType: 'application/json',
                ACL: 'public-read'
            }));
            console.log(`   ✅ Uploaded: ${bg.key}`);
        }

        console.log('✅ Sample background structure created');

    } catch (uploadError) {
        console.log('❌ Failed to upload samples:', uploadError.message);
    }
}

// Run the creation
createPublicBackgroundsLibrary().catch(console.error);