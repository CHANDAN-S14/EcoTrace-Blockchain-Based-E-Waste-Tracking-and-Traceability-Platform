import { Router } from 'express'
import { getUsers, createUser, updateUser } from '../controllers/userController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', getUsers)
router.post('/', authenticate, createUser)
router.patch('/:userId', authenticate, updateUser)
router.put('/:userId', authenticate, updateUser)

export default router
