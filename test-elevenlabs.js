#!/usr/bin/env node

require('dotenv').config();

async function testElevenLabsAPI() {
  console.log('🧪 Testing ElevenLabs API Integration...\n');

  // Check if API key is configured
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
    console.log('📝 Please add your ElevenLabs API key to the .env file:');
    console.log('   ELEVENLABS_API_KEY=your_api_key_here');
    return;
  }

  console.log('✅ API Key found:', process.env.ELEVENLABS_API_KEY.substring(0, 20) + '...');

  try {
    // Import ElevenLabs SDK
    console.log('\n📦 Importing ElevenLabs SDK...');
    const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

    // Initialize client
    console.log('🔗 Initializing ElevenLabs client...');
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    // Test 1: Get available voices
    console.log('\n🎤 Test 1: Fetching available voices...');
    const voicesResponse = await elevenlabs.voices.getAll();
    
    if (voicesResponse && voicesResponse.voices) {
      console.log(`✅ Found ${voicesResponse.voices.length} voices`);
      
      // Show first few voices
      console.log('\n📋 Available voices:');
      voicesResponse.voices.slice(0, 5).forEach((voice, index) => {
        console.log(`  ${index + 1}. ${voice.name} (${voice.voiceId || voice.voice_id})`);
        console.log(`     Gender: ${voice.labels?.gender || 'unknown'}`);
        console.log(`     Age: ${voice.labels?.age || 'unknown'}`);
        console.log(`     Accent: ${voice.labels?.accent || 'unknown'}`);
        console.log('');
      });

      // Test 2: Generate a short audio preview
      console.log('🔊 Test 2: Generating audio preview...');
      
      // Use the first available voice
      const testVoice = voicesResponse.voices[0];
      const voiceId = testVoice.voiceId || testVoice.voice_id;
      console.log(`Using voice: ${testVoice.name} (${voiceId})`);

      const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
        text: "Hello! This is a test of the ElevenLabs voice generation system. Your paid plan is working correctly!",
        model_id: "eleven_multilingual_v2"
      });

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);

      console.log(`✅ Audio generated successfully!`);
      console.log(`📊 Audio size: ${audioBuffer.length} bytes`);
      console.log(`🎵 Content type: audio/mpeg`);

      // Test 3: Get user information (quota/limits)
      console.log('\n👤 Test 3: Checking user information...');
      try {
        const user = await elevenlabs.users.get();
        console.log(`✅ User info retrieved:`);
        console.log(`   Subscription: ${user.subscription?.tier || 'unknown'}`);
        console.log(`   Character count: ${user.subscription?.character_count || 'unknown'}`);
        console.log(`   Character limit: ${user.subscription?.character_limit || 'unknown'}`);
        console.log(`   Can extend character limit: ${user.subscription?.can_extend_character_limit || 'unknown'}`);
        console.log(`   Allowed to extend: ${user.subscription?.allowed_to_extend_character_limit || 'unknown'}`);
        console.log(`   Next character count reset: ${user.subscription?.next_character_count_reset_unix || 'unknown'}`);
      } catch (userError) {
        console.log(`⚠️  Could not fetch user info: ${userError.message}`);
      }

      console.log('\n🎉 All tests completed successfully!');
      console.log('✅ Your ElevenLabs integration is working correctly with your paid plan.');

    } else {
      console.error('❌ No voices returned from API');
    }

  } catch (error) {
    console.error('\n❌ Error testing ElevenLabs API:');
    console.error('   Message:', error.message);
    
    if (error.status) {
      console.error('   Status:', error.status);
    }
    
    if (error.status === 401) {
      console.log('\n💡 This looks like an authentication error.');
      console.log('   Please check that your API key is correct and has not expired.');
      console.log('   You can find your API key at: https://elevenlabs.io/app/speech-synthesis');
    } else if (error.status === 429) {
      console.log('\n💡 This looks like a rate limit error.');
      console.log('   Your requests are being limited. Please wait a moment and try again.');
    } else if (error.status === 402) {
      console.log('\n💡 This looks like a payment/quota error.');
      console.log('   Please check your subscription status at: https://elevenlabs.io/app/subscription');
    }
  }
}

// Run the test
testElevenLabsAPI().catch(console.error);