import type { NextApiRequest, NextApiResponse } from 'next';

// proxy for .mind files to avoid cors issues with firebase storage
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url parameter required' });
  }

  // validate url is from firebase storage
  const allowedDomains = [
    'storage.googleapis.com',
    'firebasestorage.googleapis.com',
    'storage.cloud.google.com'
  ];
  
  try {
    const parsedUrl = new URL(url);
    if (!allowedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
      return res.status(403).json({ error: 'url domain not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': '*/*' },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `upstream error: ${response.status} ${response.statusText}` 
      });
    }

    const buffer = await response.arrayBuffer();

    // set headers for the .mind file
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // send the buffer
    res.status(200).send(Buffer.from(buffer));
    
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// increase body size limit for large .mind files
export const config = {
  api: {
    responseLimit: false,
  },
};
