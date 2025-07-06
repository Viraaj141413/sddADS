import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  }));

  // Helper function to get client IP
  function getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string) || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
  }

  // Helper function to update users.txt file
  async function updateUsersFile(user: any, action: string = 'login') {
    try {
      const usersFilePath = path.join(process.cwd(), 'users.txt');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${action.toUpperCase()}: ${user.name} (${user.email}) - IP: ${user.ipAddress} - Device: ${user.deviceId}\n`;
      
      await fs.appendFile(usersFilePath, logEntry);
    } catch (error) {
      console.error('Error updating users.txt:', error);
    }
  }

  // Generate device ID from browser fingerprint
  function generateDeviceId(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const ip = getClientIP(req);
    
    // Simple fingerprint - in production use more sophisticated methods
    return Buffer.from(`${userAgent}-${acceptLanguage}-${ip}`).toString('base64').slice(0, 16);
  }

  // Auth routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists with this email' });
      }

      const ipAddress = getClientIP(req);
      const deviceId = generateDeviceId(req);
      const userId = nanoid();

      // Create user
      const user = await storage.createUser({
        id: userId,
        name,
        email,
        password, // In production, hash this with bcrypt
        ipAddress,
        deviceId,
      });

      // Update users.txt file
      await updateUsersFile({ ...user, ipAddress, deviceId }, 'register');

      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).user = { id: user.id, name: user.name, email: user.email };

      res.json({ 
        success: true, 
        user: { id: user.id, name: user.name, email: user.email },
        message: 'Account created successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password, rememberDevice } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) { // In production, use bcrypt.compare
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const ipAddress = getClientIP(req);
      const deviceId = generateDeviceId(req);

      // Update user's last login and device info
      await storage.updateUser(user.id, {
        ipAddress,
        deviceId,
        lastLoginAt: new Date(),
      });

      // Update users.txt file
      await updateUsersFile({ ...user, ipAddress, deviceId }, 'login');

      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).user = { id: user.id, name: user.name, email: user.email };

      res.json({ 
        success: true, 
        user: { id: user.id, name: user.name, email: user.email },
        message: 'Logged in successfully'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to log out' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({ 
        user: { id: user.id, name: user.name, email: user.email },
        authenticated: true 
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ error: 'Failed to check authentication' });
    }
  });
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  next();
}