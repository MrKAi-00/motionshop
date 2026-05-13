import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, duration = 5, style = 'spin' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;

  try {
    const jwt = generateJWT(accessKey, secretKey);

    const taskRes = await fetch('https://api.klingai.com/v1/videos/image2video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_name: 'kling-v1',
        image: imageBase64,
        prompt: getPrompt(style),
        duration: String(duration),
        cfg_scale: 0.5,
        mode: 'std'
      })
    });

    const taskData = await taskRes.json();

    if (taskData.code !== 0) {
      return res.status(500).json({ error: taskData.message || JSON.stringify(taskData) });
    }

    return res.status(200).json({ taskId: taskData.data.task_id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function getPrompt(style) {
  const prompts = {
    spin: 'Slowly rotate the product 360 degrees, smooth professional e-commerce animation',
    float: 'Gentle floating movement, product hovering with soft shadow, professional e-commerce style',
    light: 'Light sweep across the product surface, glossy reflection effect, luxury e-commerce style'
  };
  return prompts[style] || prompts.spin;
}

function generateJWT(accessKey, secretKey) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: accessKey,
    exp: Math.floor(Date.now() / 1000) + 1800,
    nbf: Math.floor(Date.now() / 1000) - 5
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}
