async function chatWithLocalAI() {
  const url = 'http://192.168.3.125:1234/v1/chat/completions';

  const payload = {
    model: 'qwen/qwen2.5-coder-14b',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello! Who are you?' },
    ],
    temperature: 0.7,
  };

  try {
    console.log('Connecting to LM Studio...');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('\n--- Local Model Response ---');
    console.log(data.choices[0].message.content);
    console.log('----------------------------');
  } catch (error) {
    console.error('Error connecting:', error.message);
  }
}

chatWithLocalAI();
