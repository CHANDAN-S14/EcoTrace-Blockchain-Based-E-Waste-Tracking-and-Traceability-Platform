import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { CONFIG } from '../config/config.js'
import { registerSchema, loginSchema } from '../validators/schemas.js'

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      organization: user.organization,
    },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES_IN }
  )
}

export async function register(req, res, next) {
  try {
    const validated = registerSchema.parse(req.body)

    const existingUser = await User.findOne({ email: validated.email })
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' })
    }

    const passwordHash = await User.hashPassword(validated.password)
    const user = await User.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
      role: validated.role,
      organization: validated.organization,
    })

    const token = generateToken(user)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const validated = loginSchema.parse(req.body)

    const user = await User.findOne({ email: validated.email })
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(validated.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (user.accountStatus === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Account has been suspended. Contact CPCB admin.' })
    }

    const token = generateToken(user)
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user,
  })
}
