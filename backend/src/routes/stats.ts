import { Router } from 'express'

const router = Router()

router.get('/dashboard', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      contactsThisMonth: 10,
      totalContacts: 50,
      activeDeals: 5,
      totalDealsAmount: 100000
    }, 
    message: 'Dashboard stats' 
  })
})

export default router
