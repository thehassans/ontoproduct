import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { auth, allowRoles } from '../middleware/auth.js';

const router = express.Router();

// Commissioner stats (for dashboard)
router.get('/stats', auth, allowRoles('commissioner'), async (req, res) => {
  try {
    const commissionerId = req.user.id;
    const commissioner = await User.findById(commissionerId).select('commissionerProfile');
    
    if (!commissioner || !commissioner.commissionerProfile) {
      return res.status(404).json({ message: 'Commissioner profile not found' });
    }

    // Get order statistics
    const totalOrders = await Order.countDocuments({ commissionerId });
    const deliveredOrders = await Order.countDocuments({ 
      commissionerId, 
      shipmentStatus: 'delivered' 
    });
    const pendingOrders = await Order.countDocuments({ 
      commissionerId, 
      shipmentStatus: { $in: ['pending', 'assigned', 'picked', 'in_transit'] }
    });

    const profile = commissioner.commissionerProfile;
    const totalEarned = profile.totalEarned || 0;
    const paidAmount = profile.paidAmount || 0;
    const availableBalance = totalEarned - paidAmount;

    res.json({
      totalOrders,
      deliveredOrders,
      pendingOrders,
      totalEarned,
      paidAmount,
      availableBalance,
    });
  } catch (err) {
    console.error('Commissioner stats error:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// Get commissioner orders (with filters)
router.get('/orders', auth, allowRoles('commissioner'), async (req, res) => {
  try {
    const commissionerId = req.user.id;
    const { status, limit = 20, page = 1 } = req.query;

    const filter = { commissionerId };
    if (status) {
      filter.shipmentStatus = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip)
      .select('_id customerName customerPhone orderCountry city shipmentStatus total createdAt deliveredAt')
      .lean();

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('Commissioner orders error:', err);
    res.status(500).json({ message: 'Failed to load orders' });
  }
});

// Get withdrawal requests for commissioner
router.get('/withdrawal-requests', auth, allowRoles('commissioner'), async (req, res) => {
  try {
    const commissionerId = req.user.id;
    
    // This would need a WithdrawalRequest model - for now return empty array
    // In production, you'd create a CommissionerWithdrawal model
    res.json({ requests: [] });
  } catch (err) {
    console.error('Withdrawal requests error:', err);
    res.status(500).json({ message: 'Failed to load requests' });
  }
});

// Submit withdrawal request
router.post('/withdrawal-request', auth, allowRoles('commissioner'), async (req, res) => {
  try {
    const commissionerId = req.user.id;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const commissioner = await User.findById(commissionerId).select('commissionerProfile');
    if (!commissioner || !commissioner.commissionerProfile) {
      return res.status(404).json({ message: 'Commissioner profile not found' });
    }

    const profile = commissioner.commissionerProfile;
    const availableBalance = (profile.totalEarned || 0) - (profile.paidAmount || 0);

    if (Number(amount) > availableBalance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // In production, create a withdrawal request record
    // For now, just return success
    // You would create: await CommissionerWithdrawal.create({ commissionerId, amount, status: 'pending' })

    res.json({ message: 'Withdrawal request submitted successfully' });
  } catch (err) {
    console.error('Withdrawal request error:', err);
    res.status(500).json({ message: 'Failed to submit request' });
  }
});

// Admin/User: Get all commissioners
router.get('/list', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const filter = { role: 'commissioner' };
    
    // User can only see their own commissioners
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user.id;
    }

    const commissioners = await User.find(filter)
      .select('firstName lastName email phone commissionerProfile createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ commissioners });
  } catch (err) {
    console.error('List commissioners error:', err);
    res.status(500).json({ message: 'Failed to load commissioners' });
  }
});

// Admin/User: Toggle commissioner commission (pause/resume)
router.post('/:id/toggle-commission', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { id } = req.params;
    const commissioner = await User.findOne({ _id: id, role: 'commissioner' });

    if (!commissioner) {
      return res.status(404).json({ message: 'Commissioner not found' });
    }

    // Access control: user can only toggle their own commissioners
    if (req.user.role !== 'admin' && String(commissioner.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const currentStatus = commissioner.commissionerProfile?.isPaused || false;
    const newStatus = !currentStatus;

    commissioner.commissionerProfile.isPaused = newStatus;
    if (newStatus) {
      commissioner.commissionerProfile.pausedAt = new Date();
    } else {
      commissioner.commissionerProfile.activatedAt = new Date();
    }

    await commissioner.save();

    res.json({
      message: `Commission ${newStatus ? 'paused' : 'resumed'} successfully`,
      isPaused: newStatus,
    });
  } catch (err) {
    console.error('Toggle commission error:', err);
    res.status(500).json({ message: 'Failed to toggle commission' });
  }
});

// Admin/User: Update commissioner commission settings
router.patch('/:id/commission', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionPerOrder, commissionCurrency } = req.body;

    const commissioner = await User.findOne({ _id: id, role: 'commissioner' });
    if (!commissioner) {
      return res.status(404).json({ message: 'Commissioner not found' });
    }

    // Access control
    if (req.user.role !== 'admin' && String(commissioner.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (commissionPerOrder !== undefined) {
      commissioner.commissionerProfile.commissionPerOrder = Number(commissionPerOrder);
    }
    if (commissionCurrency) {
      commissioner.commissionerProfile.commissionCurrency = commissionCurrency;
    }

    await commissioner.save();

    res.json({ message: 'Commission settings updated successfully' });
  } catch (err) {
    console.error('Update commission error:', err);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// Admin/User: Apply commissioner commission to all previous delivered orders
router.post('/:id/apply-to-previous-orders', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { id } = req.params;

    const commissioner = await User.findOne({ _id: id, role: 'commissioner' });
    if (!commissioner) {
      return res.status(404).json({ message: 'Commissioner not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && String(commissioner.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const commissionPerOrder = commissioner.commissionerProfile?.commissionPerOrder || 0;
    if (commissionPerOrder <= 0) {
      return res.status(400).json({ message: 'Commissioner has no commission rate set' });
    }

    // Get owner ID for filtering orders
    const ownerId = commissioner.createdBy;

    // Get all agents, managers, dropshippers under this owner
    const agents = await User.find({ role: 'agent', createdBy: ownerId }, { _id: 1 }).lean();
    const managers = await User.find({ role: 'manager', createdBy: ownerId }, { _id: 1 }).lean();
    const dropshippers = await User.find({ role: 'dropshipper', createdBy: ownerId }, { _id: 1 }).lean();
    
    const allCreatorIds = [
      ownerId,
      ...agents.map(a => a._id),
      ...managers.map(m => m._id),
      ...dropshippers.map(d => d._id)
    ];

    // Use bulk update for better performance (avoids timeout)
    const filter = {
      createdBy: { $in: allCreatorIds },
      shipmentStatus: 'delivered',
      $or: [
        { commissionerId: { $exists: false } },
        { commissionerId: null },
        { commissionerCommission: { $exists: false } },
        { commissionerCommission: 0 }
      ]
    };

    // Count orders to update first
    const updatedCount = await Order.countDocuments(filter);
    const totalCommissionAdded = updatedCount * commissionPerOrder;

    // Bulk update all orders at once
    if (updatedCount > 0) {
      await Order.updateMany(filter, {
        $set: {
          commissionerId: commissioner._id,
          commissionerCommission: commissionPerOrder
        }
      });

      // Update commissioner's total earned
      commissioner.commissionerProfile.totalEarned = 
        (commissioner.commissionerProfile.totalEarned || 0) + totalCommissionAdded;
      await commissioner.save();
    }

    res.json({ 
      message: `Commission applied to ${updatedCount} previous orders`,
      ordersUpdated: updatedCount,
      totalCommissionAdded,
      newTotalEarned: commissioner.commissionerProfile.totalEarned || 0
    });
  } catch (err) {
    console.error('Apply commission to previous orders error:', err);
    res.status(500).json({ message: 'Failed to apply commission to previous orders' });
  }
});

export default router;
