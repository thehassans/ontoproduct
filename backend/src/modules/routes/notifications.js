import express from 'express'
import { auth, allowRoles } from '../middleware/auth.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { getIO } from '../config/socket.js'
// Lazy-load Firebase push so the app doesn't crash if firebase-admin is missing
async function sendPush(tokens, notification, data) {
  try {
    const { sendPushNotification } = await import('../config/firebase.js')
    await sendPushNotification(tokens, notification, data)
  } catch (e) {
    console.warn('[FCM] Push skipped:', e?.message)
  }
}

const router = express.Router()

// Create notification (internal use - called by other routes)
export const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData)
    await notification.save()

    // Emit real-time socket event to the target user
    try {
      const io = getIO()
      const targetRoom = `user:${String(notificationData.userId)}`
      io.to(targetRoom).emit('notification.new', {
        _id: String(notification._id),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.relatedId,
        relatedType: notification.relatedType,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      })
    } catch (socketErr) {
      console.warn('Failed to emit notification socket event:', socketErr?.message)
    }

    // Send Firebase Cloud Messaging push notification
    try {
      const targetUser = await User.findById(notificationData.userId).select('fcmTokens').lean()
      if (targetUser?.fcmTokens?.length) {
        await sendPush(
          targetUser.fcmTokens,
          {
            title: notification.title || 'BuySial',
            body: notification.message || '',
            link: notification.relatedId ? `/orders?id=${notification.relatedId}` : '/',
          },
          {
            notificationId: String(notification._id),
            type: notification.type || '',
            relatedId: String(notification.relatedId || ''),
            relatedType: notification.relatedType || '',
          }
        )
      }
    } catch (fcmErr) {
      console.warn('Failed to send FCM push:', fcmErr?.message)
    }

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

// Get notifications for current user
router.get('/', auth, allowRoles('admin', 'user', 'agent', 'manager'), async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query
    
    const allowedTypes = [
      'order_created',
      'order_delivered_agent',
      'order_cancelled_agent',
      'order_cancelled',
      'order_returned',
      'amount_approval',
      'driver_settlement',
      'manager_remittance',
      'agent_remittance',
      'expense_approval',
      'driver_remittance',
      'return_request'
    ]
    
    let match = { 
      userId: req.user.id,
      type: { $in: allowedTypes }
    }
    if (unreadOnly === 'true') {
      match.read = false
    }

    const notifications = await Notification.find(match)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('triggeredBy', 'firstName lastName role')
      .lean()

    const total = await Notification.countDocuments(match)
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false,
      type: { $in: allowedTypes }
    })

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ message: 'Failed to fetch notifications' })
  }
})

// Mark notification as read
router.patch('/:id/read', auth, allowRoles('admin', 'user', 'agent', 'manager'), async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    })

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    notification.read = true
    notification.readAt = new Date()
    await notification.save()

    res.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ message: 'Failed to mark notification as read' })
  }
})

// Mark all notifications as read
router.patch('/mark-all-read', auth, allowRoles('admin', 'user', 'agent', 'manager'), async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true, readAt: new Date() }
    )

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ message: 'Failed to mark all notifications as read' })
  }
})

// Delete notification
router.delete('/:id', auth, allowRoles('admin', 'user', 'agent', 'manager'), async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    })

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    res.json({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ message: 'Failed to delete notification' })
  }
})

// Get notification statistics
router.get('/stats', auth, allowRoles('admin', 'user', 'agent', 'manager'), async (req, res) => {
  try {
    const allowedTypes = [
      'order_created',
      'order_delivered_agent',
      'order_cancelled_agent',
      'order_cancelled',
      'order_returned',
      'amount_approval',
      'driver_settlement',
      'manager_remittance',
      'agent_remittance',
      'expense_approval',
      'driver_remittance',
      'return_request'
    ]
    
    const stats = await Notification.aggregate([
      { 
        $match: { 
          userId: req.user.id,
          type: { $in: allowedTypes }
        } 
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
          }
        }
      }
    ])

    const totalCount = await Notification.countDocuments({ 
      userId: req.user.id,
      type: { $in: allowedTypes }
    })
    const totalUnreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false,
      type: { $in: allowedTypes }
    })

    res.json({
      byType: stats,
      total: totalCount,
      totalUnread: totalUnreadCount
    })
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    res.status(500).json({ message: 'Failed to fetch notification statistics' })
  }
})

// Register FCM token for push notifications
router.post('/fcm-token', auth, async (req, res) => {
  try {
    const { token } = req.body
    if (!token || typeof token !== 'string' || token.length < 10) {
      return res.status(400).json({ message: 'Invalid FCM token' })
    }

    // Add token if not already present (limit to 10 devices per user)
    const user = await User.findById(req.user.id).select('fcmTokens')
    if (!user) return res.status(404).json({ message: 'User not found' })

    const tokens = user.fcmTokens || []
    if (!tokens.includes(token)) {
      // Keep only last 10 tokens (remove oldest if needed)
      if (tokens.length >= 10) tokens.shift()
      tokens.push(token)
      user.fcmTokens = tokens
      await user.save()
    }

    res.json({ message: 'FCM token registered', count: user.fcmTokens.length })
  } catch (error) {
    console.error('Error registering FCM token:', error)
    res.status(500).json({ message: 'Failed to register FCM token' })
  }
})

// Unregister FCM token (e.g. on logout)
router.delete('/fcm-token', auth, async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ message: 'Token required' })

    await User.updateOne(
      { _id: req.user.id },
      { $pull: { fcmTokens: token } }
    )

    res.json({ message: 'FCM token removed' })
  } catch (error) {
    console.error('Error removing FCM token:', error)
    res.status(500).json({ message: 'Failed to remove FCM token' })
  }
})

export default router