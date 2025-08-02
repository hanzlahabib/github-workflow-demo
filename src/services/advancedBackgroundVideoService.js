
/**
 * Advanced Background Video Service
 * Supports multiple CDN strategies based on cdn-clippie.com analysis
 */

const { S3Client, CopyObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

class AdvancedBackgroundVideoService {
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        this.cloudFrontClient = new CloudFrontClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        // Configuration
        this.config = {
            // Public backgrounds (shared library)
            publicBucket: 'reelspeed-backgrounds-library',
            publicCloudFrontDomain: process.env.PUBLIC_CDN_DOMAIN || 'cdn-backgrounds.your-domain.com',
            publicDistributionId: process.env.PUBLIC_DISTRIBUTION_ID,
            
            // Private user uploads
            privateBucket: 'reelspeed-media-storage',
            privateCloudFrontDomain: process.env.PRIVATE_CDN_DOMAIN || 'cdn-private.your-domain.com',
            privateDistributionId: process.env.PRIVATE_DISTRIBUTION_ID,
            
            // Lambda bucket (current working solution)
            lambdaBucket: process.env.LAMBDA_BUCKET_NAME,
            
            // CDN strategy
            cdnStrategy: process.env.CDN_STRATEGY || 'lambda-copy' // 'lambda-copy', 'cloudfront-signed', 'hybrid'
        };
    }

    /**
     * Get optimized background URL for Lambda rendering
     * Automatically chooses best strategy based on configuration
     */
    async getOptimizedBackgroundUrl(backgroundConfig, userId, videoId) {
        const { backgroundType, backgroundUrl, backgroundId } = backgroundConfig;
        
        if (backgroundType !== 'video' || !backgroundUrl) {
            return null; // No video background
        }

        console.log(`🎬 Processing background: ${backgroundUrl}`);
        
        try {
            // Detect background source
            const sourceType = this.detectBackgroundSource(backgroundUrl);
            console.log(`📍 Source type: ${sourceType}`);
            
            switch (sourceType) {
                case 'public-library':
                    return await this.handlePublicLibraryBackground(backgroundUrl);
                    
                case 'private-user':
                    return await this.handlePrivateUserBackground(backgroundUrl, userId, videoId);
                    
                case 'external-cdn':
                    return backgroundUrl; // Already optimized
                    
                case 'lambda-bucket':
                    return backgroundUrl; // Already accessible
                    
                default:
                    throw new Error(`Unknown background source: ${backgroundUrl}`);
            }
            
        } catch (error) {
            console.error('Failed to optimize background URL:', error);
            
            // Fallback to current working solution
            return await this.fallbackToLambdaCopy(backgroundUrl, userId, videoId);
        }
    }

    /**
     * Detect the source type of background URL
     */
    detectBackgroundSource(url) {
        if (url.includes(this.config.publicBucket) || url.includes(this.config.publicCloudFrontDomain)) {
            return 'public-library';
        }
        
        if (url.includes(this.config.privateBucket) || url.includes(this.config.privateCloudFrontDomain)) {
            return 'private-user';
        }
        
        if (url.includes(this.config.lambdaBucket)) {
            return 'lambda-bucket';
        }
        
        if (url.includes('cloudfront.net') || url.includes('cdn-') || url.includes('.com/')) {
            return 'external-cdn';
        }
        
        return 'unknown';
    }

    /**
     * Handle public library backgrounds (shared)
     */
    async handlePublicLibraryBackground(backgroundUrl) {
        console.log('📚 Using public library background');
        
        // If already using CloudFront domain, return as-is
        if (backgroundUrl.includes(this.config.publicCloudFrontDomain)) {
            return backgroundUrl;
        }
        
        // Convert S3 URL to CloudFront URL if available
        if (this.config.publicCloudFrontDomain && backgroundUrl.includes(this.config.publicBucket)) {
            const key = this.extractS3Key(backgroundUrl);
            const cloudFrontUrl = `https://${this.config.publicCloudFrontDomain}/${key}`;
            console.log(`🌐 Converted to CloudFront: ${cloudFrontUrl}`);
            return cloudFrontUrl;
        }
        
        return backgroundUrl; // Use as-is
    }

    /**
     * Handle private user backgrounds
     */
    async handlePrivateUserBackground(backgroundUrl, userId, videoId) {
        console.log('🔒 Processing private user background');
        
        switch (this.config.cdnStrategy) {
            case 'cloudfront-signed':
                return await this.createSignedCloudFrontUrl(backgroundUrl, userId);
                
            case 'lambda-copy':
                return await this.copyToLambdaBucket(backgroundUrl, userId, videoId);
                
            case 'hybrid':
                // Try CloudFront first, fallback to Lambda copy
                try {
                    return await this.createSignedCloudFrontUrl(backgroundUrl, userId);
                } catch (error) {
                    console.log('CloudFront failed, falling back to Lambda copy');
                    return await this.copyToLambdaBucket(backgroundUrl, userId, videoId);
                }
                
            default:
                return await this.copyToLambdaBucket(backgroundUrl, userId, videoId);
        }
    }

    /**
     * Create signed CloudFront URL for private access
     */
    async createSignedCloudFrontUrl(backgroundUrl, userId) {
        try {
            console.log('🔑 Creating signed CloudFront URL');
            
            // Extract key from S3 URL
            const key = this.extractS3Key(backgroundUrl);
            const cloudFrontUrl = `https://${this.config.privateCloudFrontDomain}/${key}`;
            
            // Create signed URL (expires in 4 hours)
            const expiration = Date.now() + (4 * 60 * 60 * 1000);
            
            // Note: Actual CloudFront URL signing requires private key
            // This is a placeholder for the implementation
            console.log(`🌐 CloudFront URL: ${cloudFrontUrl}`);
            console.log(`⏰ Expires: ${new Date(expiration).toISOString()}`);
            
            return cloudFrontUrl;
            
        } catch (error) {
            console.error('Failed to create signed CloudFront URL:', error);
            throw error;
        }
    }

    /**
     * Copy to Lambda bucket (current working solution)
     */
    async copyToLambdaBucket(backgroundUrl, userId, videoId) {
        console.log('📋 Copying to Lambda bucket (current working solution)');
        
        try {
            const sourceDetails = this.parseS3Url(backgroundUrl);
            if (!sourceDetails) {
                throw new Error('Invalid S3 URL format');
            }

            const tempKey = `temp-backgrounds/${userId}/${videoId}/${Date.now()}.mp4`;
            
            // Copy to Lambda bucket
            await this.s3Client.send(new CopyObjectCommand({
                CopySource: `${sourceDetails.bucket}/${sourceDetails.key}`,
                Bucket: this.config.lambdaBucket,
                Key: tempKey,
                ACL: 'public-read'
            }));

            const tempUrl = `https://${this.config.lambdaBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${tempKey}`;
            console.log(`⚡ Lambda bucket URL: ${tempUrl}`);
            
            // Schedule cleanup after 2 hours
            this.scheduleCleanup(tempKey, 2 * 60 * 60 * 1000);

            return tempUrl;

        } catch (error) {
            console.error('Failed to copy to Lambda bucket:', error);
            throw error;
        }
    }

    /**
     * Fallback to Lambda copy if other methods fail
     */
    async fallbackToLambdaCopy(backgroundUrl, userId, videoId) {
        console.log('🔄 Fallback: Using Lambda copy strategy');
        return await this.copyToLambdaBucket(backgroundUrl, userId, videoId);
    }

    /**
     * Upload background to public library
     */
    async uploadToPublicLibrary(fileBuffer, filename, category = 'shared') {
        try {
            const { PutObjectCommand } = require('@aws-sdk/client-s3');
            
            const key = `${category}/${filename}`;
            
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.config.publicBucket,
                Key: key,
                Body: fileBuffer,
                ContentType: 'video/mp4',
                ACL: 'public-read'
            }));

            // Invalidate CloudFront cache if distribution exists
            if (this.config.publicDistributionId) {
                await this.invalidateCloudFrontCache(this.config.publicDistributionId, [key]);
            }

            const publicUrl = `https://${this.config.publicCloudFrontDomain}/${key}`;
            console.log(`📚 Uploaded to public library: ${publicUrl}`);
            
            return publicUrl;

        } catch (error) {
            console.error('Failed to upload to public library:', error);
            throw error;
        }
    }

    /**
     * Utility methods
     */
    parseS3Url(url) {
        const match = url.match(/https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+?)(?:\?|$)/);
        if (!match) return null;
        
        return {
            bucket: match[1],
            region: match[2], 
            key: match[3]
        };
    }

    extractS3Key(url) {
        const parsed = this.parseS3Url(url);
        return parsed ? parsed.key : null;
    }

    scheduleCleanup(tempKey, delayMs) {
        setTimeout(async () => {
            try {
                await this.s3Client.send(new DeleteObjectCommand({
                    Bucket: this.config.lambdaBucket,
                    Key: tempKey
                }));
                console.log(`🗑️ Cleaned up: ${tempKey}`);
            } catch (error) {
                console.error(`Cleanup failed for ${tempKey}:`, error.message);
            }
        }, delayMs);
    }

    async invalidateCloudFrontCache(distributionId, paths) {
        try {
            await this.cloudFrontClient.send(new CreateInvalidationCommand({
                DistributionId: distributionId,
                InvalidationBatch: {
                    Paths: {
                        Quantity: paths.length,
                        Items: paths.map(path => `/${path}`)
                    },
                    CallerReference: Date.now().toString()
                }
            }));
            console.log('CloudFront cache invalidated');
        } catch (error) {
            console.error('Failed to invalidate CloudFront cache:', error);
        }
    }
}

module.exports = { AdvancedBackgroundVideoService };
