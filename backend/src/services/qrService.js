import QRCode from 'qrcode'
import { CONFIG } from '../config/config.js'

export async function generateBatchQrCode(batch) {
  const verificationUrl = `${CONFIG.FRONTEND_URL}/verify/${batch.batchId}`

  // Generate Data URL (PNG)
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#003B23',
      light: '#FFFFFF',
    },
  })

  // Generate SVG string
  const qrSvg = await QRCode.toString(verificationUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    color: {
      dark: '#003B23',
      light: '#FFFFFF',
    },
  })

  return {
    verificationUrl,
    qrDataUrl,
    qrSvg,
    publicPayload: {
      batchId: batch.batchId,
      category: batch.category,
      grossWeightKg: batch.grossWeight,
      status: batch.status,
      blockchainStatus: batch.blockchainStatus,
      blockchainTx: batch.blockchainTx || 'Pending verification',
      evidenceDigestSha256: batch.evidenceHash,
      registeredAt: batch.collectionDate,
    },
  }
}
