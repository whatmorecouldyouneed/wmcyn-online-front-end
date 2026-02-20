import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path;
  
  // Get the Authorization header from the request
  const authHeader = req.headers.authorization;
  const adminToken = req.headers['x-admin-token'];
  
  console.log(`[Proxy] ${req.method} ${pathString} -> ${API_BASE}/${pathString}`);
  
  try {
    const response = await fetch(`${API_BASE}/${pathString}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
        ...(adminToken && { 'x-admin-token': adminToken as string }),
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();
    
    // Forward the response status and headers
    res.status(response.status);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
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


