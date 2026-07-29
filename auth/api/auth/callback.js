// api/auth/callback.js - 适用于 Vercel Serverless
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { code } = req.query;
  if (!code) {
    res.status(400).json({ error: 'Missing code' });
    return;
  }

  try {
    // 用 code 换取 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      res.status(400).json({ error: tokenData.error });
      return;
    }

    // 用 access_token 获取用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'Surfer2-OAuth',
      },
    });
    const userData = await userRes.json();

    res.status(200).json({
      username: userData.login,
      name: userData.name,
      avatar_url: userData.avatar_url,
      id: userData.id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
