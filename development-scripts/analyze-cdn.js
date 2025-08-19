#!/usr/bin/env node

/**
 * Analyze CDN Infrastructure
 * Determines what technology is behind the CDN URL
 */

async function analyzeCDN() {
    console.log('🔍 Analyzing CDN Infrastructure');
    console.log('================================');
    
    const cdnUrl = 'https://cdn-clippie.com/user-uploads/294a0701-304b-4e68-b81e-6308dc5d8a74.mp4';
    console.log('Target URL:', cdnUrl);
    console.log('');

    try {
        // Test HEAD request to get headers without downloading content
        console.log('📡 Fetching headers...');
        const response = await fetch(cdnUrl, { method: 'HEAD' });
        
        console.log('📊 Response Analysis:');
        console.log('Status:', response.status);
        console.log('');
        
        console.log('🔍 Headers Analysis:');
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
            console.log(`   ${key}: ${value}`);
        });
        
        console.log('\n🕵️ CDN Detection:');
        
        // CloudFlare detection
        if (headers['cf-ray'] || headers['server']?.includes('cloudflare') || headers['cf-cache-status']) {
            console.log('✅ DETECTED: CloudFlare CDN');
            console.log('   Evidence:');
            if (headers['cf-ray']) console.log(`   - CF-Ray: ${headers['cf-ray']}`);
            if (headers['cf-cache-status']) console.log(`   - Cache Status: ${headers['cf-cache-status']}`);
            if (headers['server']) console.log(`   - Server: ${headers['server']}`);
        }
        
        // AWS CloudFront detection
        if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop'] || headers['via']?.includes('CloudFront')) {
            console.log('✅ DETECTED: AWS CloudFront');
            console.log('   Evidence:');
            if (headers['x-amz-cf-id']) console.log(`   - CloudFront ID: ${headers['x-amz-cf-id']}`);
            if (headers['x-amz-cf-pop']) console.log(`   - CloudFront POP: ${headers['x-amz-cf-pop']}`);
            if (headers['via']) console.log(`   - Via: ${headers['via']}`);
        }
        
        // FastLy detection
        if (headers['fastly-debug-digest'] || headers['x-served-by']?.includes('fastly')) {
            console.log('✅ DETECTED: Fastly CDN');
            console.log('   Evidence:');
            if (headers['fastly-debug-digest']) console.log(`   - Fastly Debug: ${headers['fastly-debug-digest']}`);
            if (headers['x-served-by']) console.log(`   - Served By: ${headers['x-served-by']}`);
        }
        
        // KeyCDN detection
        if (headers['server']?.includes('keycdn') || headers['x-edge-location']) {
            console.log('✅ DETECTED: KeyCDN');
        }
        
        // BunnyCDN detection
        if (headers['server']?.includes('bunnycdn') || headers['cdn-pullzone']) {
            console.log('✅ DETECTED: BunnyCDN');
        }
        
        // MaxCDN/StackPath detection
        if (headers['server']?.includes('NetDNA') || headers['x-hw']) {
            console.log('✅ DETECTED: MaxCDN/StackPath');
        }
        
        // Generic CDN patterns
        if (headers['x-cache'] || headers['x-cache-status']) {
            console.log('📋 Generic CDN detected');
            console.log(`   Cache Status: ${headers['x-cache'] || headers['x-cache-status']}`);
        }
        
        console.log('\n🔍 Domain Analysis:');
        try {
            // Analyze the domain structure
            const domain = new URL(cdnUrl).hostname;
            console.log(`Domain: ${domain}`);
            
            // Check if it's a known CDN pattern
            if (domain.includes('cloudfront.net')) {
                console.log('✅ AWS CloudFront domain pattern detected');
            } else if (domain.includes('fastly.com')) {
                console.log('✅ Fastly domain pattern detected');
            } else if (domain.includes('bunnycdn.com')) {
                console.log('✅ BunnyCDN domain pattern detected');
            } else if (domain.includes('keycdn.com')) {
                console.log('✅ KeyCDN domain pattern detected');
            } else {
                console.log('🔍 Custom domain - likely using CNAME');
            }
            
        } catch (domainError) {
            console.log('❌ Domain analysis failed:', domainError.message);
        }
        
        console.log('\n🏗️ Infrastructure Guess:');
        
        // Make educated guess based on headers
        if (headers['cf-ray'] || headers['server']?.includes('cloudflare')) {
            console.log('🎯 MOST LIKELY: CloudFlare CDN with custom domain');
            console.log('   - Popular choice for video CDNs');
            console.log('   - Good performance and caching');
            console.log('   - Supports custom domains with CNAME');
        } else if (headers['x-amz-cf-id']) {
            console.log('🎯 MOST LIKELY: AWS CloudFront');
            console.log('   - Enterprise-grade CDN');
            console.log('   - Integrates well with S3');
        } else if (headers['server']?.includes('nginx')) {
            console.log('🎯 POSSIBLE: Custom Nginx setup or BunnyCDN');
            console.log('   - Could be self-hosted with Nginx');
            console.log('   - Or BunnyCDN (uses Nginx)');
        } else {
            console.log('🤔 Unknown CDN - analyzing other indicators...');
        }
        
        console.log('\n📋 Content Analysis:');
        console.log(`Content-Type: ${headers['content-type'] || 'Not specified'}`);
        console.log(`Content-Length: ${headers['content-length'] ? (parseInt(headers['content-length']) / 1024 / 1024).toFixed(2) + ' MB' : 'Not specified'}`);
        console.log(`Accept-Ranges: ${headers['accept-ranges'] || 'Not specified'}`);
        console.log(`ETag: ${headers['etag'] || 'Not specified'}`);
        
        // Test if it supports range requests (good for video streaming)
        if (headers['accept-ranges'] === 'bytes') {
            console.log('✅ Supports range requests (good for video streaming)');
        }
        
        console.log('\n💡 RECOMMENDATION FOR YOUR USE CASE:');
        console.log('=====================================');
        console.log('Based on this analysis, here are good CDN options for your background videos:');
        console.log('');
        console.log('1. 🏆 CloudFlare (if this is what they\'re using):');
        console.log('   - Free tier available');
        console.log('   - Great video optimization');
        console.log('   - Custom domains with CNAME');
        console.log('   - Good for both public and private content');
        console.log('');
        console.log('2. 🚀 AWS CloudFront:');
        console.log('   - Integrates perfectly with your S3 setup');
        console.log('   - Can handle both public library and private user videos');
        console.log('   - Signed URLs for private content');
        console.log('');
        console.log('3. 🐰 BunnyCDN:');
        console.log('   - Cost-effective');
        console.log('   - Good performance');
        console.log('   - Video optimization features');

    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        
        console.log('\n🔍 Fallback DNS Analysis:');
        try {
            const dns = require('dns').promises;
            const domain = new URL(cdnUrl).hostname;
            
            console.log(`Looking up DNS for: ${domain}`);
            const addresses = await dns.lookup(domain, { all: true });
            console.log('IP addresses:', addresses);
            
            // Check CNAME
            try {
                const cname = await dns.resolveCname(domain);
                console.log('CNAME records:', cname);
                
                if (cname.some(c => c.includes('cloudflare'))) {
                    console.log('✅ CNAME points to CloudFlare');
                } else if (cname.some(c => c.includes('cloudfront'))) {
                    console.log('✅ CNAME points to CloudFront');
                } else if (cname.some(c => c.includes('fastly'))) {
                    console.log('✅ CNAME points to Fastly');
                }
            } catch (cnameError) {
                console.log('No CNAME record found');
            }
            
        } catch (dnsError) {
            console.log('DNS lookup failed:', dnsError.message);
        }
    }
}

// Run the analysis
analyzeCDN().catch(console.error);