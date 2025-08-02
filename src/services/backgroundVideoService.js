
/**
 * Background Video Management Service
 * Handles both public library and private user backgrounds
 */

const { S3Client, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class BackgroundVideoService {
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        this.publicBucket = 'reelspeed-backgrounds-library';
        this.privateBucket = 'reelspeed-media-storage';
        this.lambdaBucket = process.env.LAMBDA_BUCKET_NAME;
    }

    /**
     * Get background URL for Lambda rendering
     * Automatically handles public library vs private user videos
     */
    async getBackgroundUrlForLambda(backgroundConfig, userId, videoId) {
        const { backgroundType, backgroundUrl, backgroundId } = backgroundConfig;
        
        if (backgroundType !== 'video' || !backgroundUrl) {
            return null; // No video background
        }

        // Check if it's a public library background
        if (backgroundUrl.includes(this.publicBucket)) {
            console.log('📚 Using public library background');
            return backgroundUrl; // Already public, use as-is
        }

        // Check if it's already in Lambda bucket
        if (backgroundUrl.includes(this.lambdaBucket)) {
            console.log('⚡ Using Lambda bucket background');
            return backgroundUrl; // Already accessible
        }

        // Private user video - copy to Lambda bucket temporarily
        console.log('🔒 Processing private user background');
        return await this.copyPrivateBackgroundToLambda(backgroundUrl, userId, videoId);
    }

    /**
     * Copy private user background to Lambda bucket temporarily
     */
    async copyPrivateBackgroundToLambda(userVideoUrl, userId, videoId) {
        try {
            // Extract source details from URL
            const sourceDetails = this.parseS3Url(userVideoUrl);
            if (!sourceDetails) {
                throw new Error('Invalid S3 URL format');
            }

            const tempKey = `temp-backgrounds/${userId}/${videoId}/${Date.now()}.mp4`;
            
            // Copy to Lambda bucket
            await this.s3Client.send(new CopyObjectCommand({
                CopySource: `${sourceDetails.bucket}/${sourceDetails.key}`,
                Bucket: this.lambdaBucket,
                Key: tempKey,
                ACL: 'public-read'
            }));

            const tempUrl = `https://${this.lambdaBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${tempKey}`;
            
            // Schedule cleanup after 1 hour
            setTimeout(async () => {
                await this.cleanupTempBackground(tempKey);
            }, 3600000); // 1 hour

            return tempUrl;

        } catch (error) {
            console.error('Failed to copy private background:', error);
            throw error;
        }
    }

    /**
     * Upload background to public library
     */
    async uploadToPublicLibrary(file, filename) {
        try {
            const key = `shared/${filename}`;
            
            // Upload logic here (multer, etc.)
            // Set ACL to public-read
            
            return `https://${this.publicBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        } catch (error) {
            console.error('Failed to upload to public library:', error);
            throw error;
        }
    }

    /**
     * Parse S3 URL to extract bucket and key
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

    /**
     * Cleanup temporary background
     */
    async cleanupTempBackground(tempKey) {
        try {
            await this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.lambdaBucket,
                Key: tempKey
            }));
            console.log(`Cleaned up temp background: ${tempKey}`);
        } catch (error) {
            console.error(`Failed to cleanup ${tempKey}:`, error.message);
        }
    }

    /**
     * Get presigned URL for private access (alternative approach)
     */
    async getPrivatePresignedUrl(bucket, key, expiresIn = 14400) {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        return await getSignedUrl(this.s3Client, command, { expiresIn });
    }
}

module.exports = { BackgroundVideoService };
