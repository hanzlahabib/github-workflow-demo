// Quick test to verify ElevenLabs API
const https = require('https');
const fs = require('fs');

const API_KEY = 'sk_2b6c60fc128b3b0a5b7bb4e05f2ae2837bfac8235940f2a9';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah

const data = JSON.stringify({
  text: "Hello! This is a test of ElevenLabs voice generation.",
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.8
  }
});

const options = {
  hostname: 'api.elevenlabs.io',
  port: 443,
  path: `/v1/text-to-speech/${VOICE_ID}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'audio/mpeg',
    'xi-api-key': API_KEY,
    'Content-Length': data.length
  }
};

console.log('Testing ElevenLabs API directly...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  if (res.statusCode === 200) {
    const file = fs.createWriteStream('/tmp/test_output.mp3');
    res.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log('✅ Audio saved to /tmp/test_output.mp3');
      
      // Check file size
      const stats = fs.statSync('/tmp/test_output.mp3');
      console.log(`📊 File size: ${stats.size} bytes`);
      
      if (stats.size > 1000) {
        console.log('🎉 SUCCESS! Audio generated successfully');
      } else {
        console.log('⚠️ File too small, might be an error');
      }
    });
  } else {
    let errorData = '';
    res.on('data', chunk => errorData += chunk);
    res.on('end', () => {
      console.log('❌ Error:', errorData);
    });
  }
});

req.on('error', (e) => {
  console.error('❌ Request error:', e);
});

req.write(data);
req.end();