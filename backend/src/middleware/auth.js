import jwt from 'jsonwebtoken'
import { CONFIG } from '../config/config.js'
import { User } from '../models/User.js'

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Allow optional authentication for public/demo evaluation
      req.user = {
        id: 'guest',
        name: 'Demo Admin & CPCB Auditor',
        role: 'Administrator',
        organization: 'Central Pollution Control Board',
      }
      return next()
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-passwordHash')
    if (!user) {
      return res.status(401).json({ success: false, message: 'User token is no longer valid' })
    }

    if (user.accountStatus === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Account is suspended' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token', error: err.message })
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    // Administrator has access to all routes
    if (req.user.role === 'Administrator' || allowedRoles.includes(req.user.role)) {
      return next()
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
    })
  }
}
