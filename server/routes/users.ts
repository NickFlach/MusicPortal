import { Router } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/api/users/register', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ message: "Wallet address is required" });
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.address, address))
      .limit(1);

    if (existingUser.length > 0) {
      return res.json(existingUser[0]);
    }

    // Create new user
    const [newUser] = await db.insert(users)
      .values({ address })
      .returning();

    res.json(newUser);
  } catch (error) {
    console.error('Error in user registration:', error);
    res.status(500).json({ message: "Failed to register user" });
  }
});

export default router;
