import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Use a default secret in development so the app works without .env
const SECRET = process.env.JWT_SECRET || 'devsecret-change-me';

import ShopifyIntegration from '../models/ShopifyIntegration.js';
import { verifySessionToken } from '../../util/shopifyAuth.js';
import { decrypt } from '../../util/encryption.js';

export async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  // 1. Try standard JWT (internal user)
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.id).select('_id role');
    if (user) {
      req.user = { ...decoded, id: String(user._id), role: user.role };
      return next();
    }
  } catch (e) {
    // JWT verification failed, check if it's a Shopify Session Token
  }

  // 2. Try Shopify Session Token
  try {
    // We need the client secret to verify
    // PERFORMANCE NOTE: In production, cache this config
    const config = await ShopifyIntegration.findOne({ type: 'app_config' });
    
    if (config && config.clientSecret) {
      const clientSecret = decrypt(config.clientSecret);
      const sessionPayload = verifySessionToken(token, clientSecret);
      
      if (sessionPayload) {
        // Valid Shopify Token!
        // Extract shop domain
        const shopDomain = sessionPayload.dest?.replace('https://', '')?.replace('/admin', '') || 
                           sessionPayload.iss?.replace('https://', '')?.replace('/admin', '');
                           
        // Find connected dropshipper for this shop
        // This effectively logs them in as the dropshipper running the store
        const store = await ShopifyIntegration.findOne({ 
          type: 'dropshipper_store', 
          shopDomain: shopDomain,
          isActive: true
        }).populate('dropshipperId', 'role');

        if (store && store.dropshipperId) {
          req.user = { 
            id: String(store.dropshipperId._id), 
            role: store.dropshipperId.role,
            isShopifyEmbedded: true,
            shop: shopDomain
          };
          return next();
        }
      }
    }
  } catch (err) {
    console.error('Shopify auth check failed:', err);
  }

  return res.status(401).json({ message: 'Unauthorized' });
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
