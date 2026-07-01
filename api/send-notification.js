import crypto from 'crypto';
import https from 'https';

function getAccessToken(serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = Buffer.from(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })).toString('base64url');
    
    const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    
    const privateKey = serviceAccount.private_key;
    let signature;
    try {
      signature = sign.sign(privateKey, 'base64url');
    } catch (e) {
      return reject(e);
    }
    
    const jwt = `${signatureInput}.${signature}`;
    const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
    
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error(`Failed to get access token: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, body } = req.body;
  const secret = req.headers['x-notification-secret'];

  // Verification of shared secret key
  const expectedSecret = process.env.VITE_NOTIFICATION_SECRET || "dnyanda_notification_secure_secret_token_key";
  if (!secret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!title || !body) {
    return res.status(400).json({ error: 'Missing title or body' });
  }

  // Load service account from environment variables
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountStr) {
    return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT environment variable is not configured' });
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountStr);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ' + e.message });
  }

  try {
    const accessToken = await getAccessToken(serviceAccount);
    
    // Prepare the FCM V1 API payload
    const fcmPayload = {
      message: {
        topic: 'students',
        notification: {
          title: title,
          body: body
        },
        android: {
          notification: {
            sound: 'default'
          }
        }
      }
    };

    const postData = JSON.stringify(fcmPayload);
    const projectId = serviceAccount.project_id || 'dnyanda-attendance-app';

    // Call FCM v1 API
    const responseBody = await new Promise((resolve, reject) => {
      const fcmReq = https.request({
        hostname: 'fcm.googleapis.com',
        path: `/v1/projects/${projectId}/messages:send`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (fcmRes) => {
        let resBody = '';
        fcmRes.on('data', (chunk) => resBody += chunk);
        fcmRes.on('end', () => resolve({ statusCode: fcmRes.statusCode, body: resBody }));
      });

      fcmReq.on('error', (e) => reject(e));
      fcmReq.write(postData);
      fcmReq.end();
    });

    if (responseBody.statusCode >= 200 && responseBody.statusCode < 300) {
      return res.status(200).json({ success: true, response: JSON.parse(responseBody.body) });
    } else {
      return res.status(responseBody.statusCode).json({ error: 'FCM API returned error', details: responseBody.body });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
