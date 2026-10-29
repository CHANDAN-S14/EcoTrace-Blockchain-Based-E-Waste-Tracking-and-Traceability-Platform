import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ''
    const hash = crypto.randomBytes(8).toString('hex')
    cb(null, `evidence_${Date.now()}_${hash}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
})

const router = Router()

// Multipart file upload (photo or document)
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received in upload payload' })
    }

    const fileUrl = `/uploads/${req.file.filename}`
    const isImage = req.file.mimetype.startsWith('image/')

    return res.status(201).json({
      success: true,
      message: 'Evidence file uploaded successfully',
      data: {
        name: req.file.originalname,
        filename: req.file.filename,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: isImage ? 'photo' : 'document',
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Upload processing error', error: err.message })
  }
})

// Base64 camera snapshot upload
router.post('/base64', (req, res) => {
  try {
    const { base64Data, filename = 'camera_capture.jpg' } = req.body
    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'base64Data string is required' })
    }

    // Strip data:image/...;base64, prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Clean, 'base64')

    const fileKey = `evidence_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.jpg`
    const filePath = path.join(uploadsDir, fileKey)
    fs.writeFileSync(filePath, buffer)

    return res.status(201).json({
      success: true,
      message: 'Camera snapshot saved successfully',
      data: {
        name: filename,
        filename: fileKey,
        url: `/uploads/${fileKey}`,
        size: buffer.length,
        mimetype: 'image/jpeg',
        type: 'photo',
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Snapshot saving error', error: err.message })
  }
})

export default router
