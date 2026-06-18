import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, CarbonData } from './server_models.js'; // Note the .js extension or just use tsx handling (actually esbuild might need no extension or .js depending on config. Let's use no extension for tsx/esbuild if we are using commonjs bundle or leave it out. Let's just use .ts or omit it.)

export const authRouter = express.Router();
export const userRouter = express.Router();
export const carbonRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// MOCK DATA for local dev without MongoDB
const mockUsers: any[] = [];
const mockCarbon: any[] = [];

// Middleware
export const authenticate = (req: any, res: any, next: any) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    // We decode the token. If it's a valid Firebase token or local JWT, we use it.
    // In a production app, use firebase-admin to verify the signature.
    const decoded: any = jwt.decode(token);
    if (!decoded) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }
    // Firebase uses user_id or sub. Local mock uses _id.
    req.user = { _id: decoded.user_id || decoded.sub || decoded._id };
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    if (process.env.MONGO_URI) {
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        res.json({ message: 'User registered successfully' });
    } else {
        mockUsers.push({ _id: String(mockUsers.length + 1), name, email, password: hashedPassword });
        res.json({ message: 'Mock User registered' });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let user;
    if (process.env.MONGO_URI) {
        user = await User.findOne({ email });
    } else {
        user = mockUsers.find(u => u.email === email);
    }
    
    if (!user) return res.status(400).json({ error: 'Email not found' });
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

userRouter.get('/profile', authenticate, async (req: any, res: any) => {
   if (process.env.MONGO_URI) {
       const user = await User.findById(req.user._id).select('-password');
       res.json(user);
   } else {
       const user = mockUsers.find(u => u._id === req.user._id);
       res.json(user);
   }
});

userRouter.put('/profile', authenticate, async (req: any, res: any) => {
   if (process.env.MONGO_URI) {
       const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true }).select('-password');
       res.json(user);
   } else {
       const idx = mockUsers.findIndex(u => u._id === req.user._id);
       if(idx > -1) mockUsers[idx] = { ...mockUsers[idx], ...req.body };
       res.json(mockUsers[idx]);
   }
});

carbonRouter.post('/add', authenticate, async (req: any, res: any) => {
    try {
        if(process.env.MONGO_URI) {
            const data = new CarbonData({ ...req.body, userId: req.user._id });
            await data.save();
            res.json(data);
        } else {
            const record = { _id: String(mockCarbon.length + 1), userId: req.user._id, date: new Date(), ...req.body };
            mockCarbon.push(record);
            res.json(record);
        }
    } catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

carbonRouter.get('/history', authenticate, async (req: any, res: any) => {
   if (process.env.MONGO_URI) {
       const data = await CarbonData.find({ userId: req.user._id }).sort({ date: -1 });
       res.json(data);
   } else {
       const data = mockCarbon.filter(c => c.userId === req.user._id).sort((a,b) => b.date - a.date);
       res.json(data);
   }
});
