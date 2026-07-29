// oauth-worker.js - 适用于 Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 CORS（让 Surfer2 能调用）
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // GitHub OAuth 回调接口
    if (path === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing code' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // 用 code 换取 access_token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: code,
        }),
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // 用 access_token 获取用户信息
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'Surfer2-OAuth',
        },
      });
      const userData = await userRes.json();

      // 返回用户信息给前端（不包含 access_token）
      return new Response(JSON.stringify({
        username: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
        id: userData.id,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 健康检查接口（用于 Surfer2 检测服务是否可用）
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', platform: 'cloudflare' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response('Surfer2 OAuth Service', {
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
    });
  },
};
