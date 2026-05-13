import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ error: 'No taskId provided' });
  }

  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;

  try {
    const jwt = generateJWT(accessKey, secretKey);

    const statusRes = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });

    const statusData = await statusRes.json();

    if (statusData.code !== 0) {
      return res.status(500).json({ error: statusData.message });
    }

    const task = statusData.data.task_status;
    const videoUrl = statusData.data.task_result?.videos?.[0]?.url || null;

    return res.status(200).json({ status: task, videoUrl });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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
