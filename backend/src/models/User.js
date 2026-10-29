import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['Administrator', 'Collector', 'Transporter', 'Recycler', 'Auditor'],
      default: 'Collector',
    },
    organization: { type: String, required: true, trim: true },
    accountStatus: {
      type: String,
      enum: ['Active', 'Suspended', 'Pending Verification'],
      default: 'Active',
    },
    walletAddress: { type: String, default: null },
  },
  { timestamps: true }
)

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash)
}

UserSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(plainPassword, salt)
}

export const User = mongoose.model('User', UserSchema)
