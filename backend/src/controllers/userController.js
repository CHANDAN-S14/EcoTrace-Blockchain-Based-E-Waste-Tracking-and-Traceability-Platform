import { User } from '../models/User.js'

export async function getUsers(req, res, next) {
  try {
    const { role, status, q } = req.query
    const filter = {}

    if (role && role !== 'ALL') filter.role = role
    if (status && status !== 'ALL') filter.accountStatus = status
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { organization: { $regex: q, $options: 'i' } },
      ]
    }

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean()

    return res.json({
      success: true,
      count: users.length,
      data: users.map(u => ({ ...u, id: u._id })),
    })
  } catch (err) {
    next(err)
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, organization } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email address already exists.' })
    }

    const passwordHash = await User.hashPassword(password)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'Collector',
      organization: organization || 'EcoTrace Consortium Participant',
      accountStatus: 'Active',
    })

    const userObj = user.toObject()
    delete userObj.passwordHash

    return res.status(201).json({
      success: true,
      message: `User ${name} added successfully.`,
      data: { ...userObj, id: userObj._id },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req, res, next) {
  try {
    const { userId } = req.params
    const { name, role, organization, accountStatus } = req.body

    const updateData = {}
    if (name) updateData.name = name
    if (role) updateData.role = role
    if (organization) updateData.organization = organization
    if (accountStatus) updateData.accountStatus = accountStatus

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-passwordHash')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    return res.json({
      success: true,
      message: `User ${user.name} updated successfully.`,
      data: { ...user.toObject(), id: user._id },
    })
  } catch (err) {
    next(err)
  }
}
