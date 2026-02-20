import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api-rrm3u3yaba-uc.a.run.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const pathString = (Array.isArray(path) ? path.join('/') : path) || '';
  if (!pathString) {
    res.status(400).json({ error: 'missing proxy path' });
    return;
  }
  
  // Get headers from the request
  const authHeader = req.headers.authorization;
  const adminToken = req.headers['x-admin-token'];
  const cronKey = req.headers['x-cron-key'];
  const xUid = req.headers['x-uid'];
  
  // construct url - handle case where API_BASE already ends with /api
  const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const pathPart = pathString.startsWith('/') ? pathString : `/${pathString}`;
  const targetUrl = `${baseUrl}${pathPart}`;
  
  console.log(`[Proxy] ${req.method} ${pathString} -> ${targetUrl}`);
  console.log(`[Proxy] Headers:`, {
    hasAuth: !!authHeader,
    hasAdminToken: !!adminToken,
    hasCronKey: !!cronKey,
    hasXUid: !!xUid
  });
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader as string }),
        ...(adminToken && { 'x-admin-token': adminToken as string }),
        ...(cronKey && { 'x-cron-key': cronKey as string }),
        ...(xUid && { 'x-uid': xUid as string }),
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();
    
    // Forward the response status and headers
    res.status(response.status);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-cron-key, x-uid');
    
    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
}


