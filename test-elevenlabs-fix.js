const fetch = require('node-fetch');

async function testVoiceGeneration() {
  try {
    console.log('🧪 Testing ElevenLabs voice generation fix...');

    const response = await fetch('http://localhost:3000/api/voices/generate-voiceover-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: 'Hello, this is a test of the fixed ElevenLabs integration.',
        selectedVoiceId: 'SAz9YHcvj6GT2YYXdXww', // Using the same voice ID from the error
        stability: 0.5,
        similarity: 0.8
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success! Voice generation is working:');
      console.log('- Audio URL:', result.audio_url);
      console.log('- Voice ID:', result.voiceId);
      console.log('- Duration:', result.duration);
      return true;
    } else {
      const error = await response.json();
      console.log('❌ Failed with status:', response.status);
      console.log('Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  }
}

// Test bulk generation
async function testBulkVoiceGeneration() {
  try {
    console.log('🧪 Testing bulk voice generation...');

    const messages = [
      { id: 'msg1', text: 'First test message', voiceId: 'SAz9YHcvj6GT2YYXdXww' },
      { id: 'msg2', text: 'Second test message', voiceId: 'SAz9YHcvj6GT2YYXdXww' },
      { id: 'msg3', text: 'Third test message', voiceId: 'SAz9YHcvj6GT2YYXdXww' }
    ];

    const response = await fetch('http://localhost:3000/api/voices/generate-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        language: 'en',
        speed: 'normal'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Bulk generation success!');
      console.log('- Total messages:', result.totalMessages);
      console.log('- Generated count:', result.generatedCount);
      console.log('- Results:', result.results.length, 'audio files created');
      return true;
    } else {
      const error = await response.json();
      console.log('❌ Bulk generation failed with status:', response.status);
      console.log('Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Bulk test failed with error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting ElevenLabs fix validation...\n');
  
  const singleTest = await testVoiceGeneration();
  console.log('');
  
  const bulkTest = await testBulkVoiceGeneration();
  console.log('');
  
  if (singleTest && bulkTest) {
    console.log('🎉 All tests passed! ElevenLabs integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the server logs.');
  }
}

runTests();