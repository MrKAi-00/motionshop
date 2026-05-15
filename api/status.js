import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: 'No taskId provided' });

  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;

  try {
    const token = generateToken(accessKey, secretKey);
    const statusRes = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const statusData = await statusRes.json();
    if (statusData.code !== 0) return res.status(500).json({ error: statusData.message });
    const task = statusData.data.task_status;
    const videoUrl = statusData.data.task_result?.videos?.[0]?.url || null;
    return res.status(200).json({ status: task, videoUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function generateToken(ak, sk) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 }));
  const sig = crypto.createHmac('sha256', sk).update(header + '.' + payload).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return header + '.' + payload + '.' + sig;
}

function toBase64Url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
