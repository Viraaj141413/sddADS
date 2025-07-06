import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";
import { db } from "./db";
import { users, type User, type InsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Complete User Account System
export class UserAccountSystem {
  private usersFilePath: string;

  constructor() {
    this.usersFilePath = path.join(process.cwd(), 'users.txt');
    this.initializeUsersFile();
  }

  // Initialize users.txt file
  private async initializeUsersFile() {
    try {
      const exists = await fs.access(this.usersFilePath).then(() => true).catch(() => false);
      if (!exists) {
        const header = `# AI App Builder - User Activity Log
# This file tracks all user registrations and logins
# Format: [timestamp] ACTION: Name (email) - IP: address - Device: fingerprint

[${new Date().toISOString()}] SYSTEM: User tracking system initialized
`;
        await fs.writeFile(this.usersFilePath, header);
      }
    } catch (error) {
      console.error('Error initializing users.txt:', error);
    }
  }

  // Hash password (simple for demo - use bcrypt in production)
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + 'app-salt').digest('hex');
  }

  // Generate device fingerprint
  private generateDeviceId(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const ip = this.getClientIP(req);
    
    return crypto.createHash('md5')
      .update(`${userAgent}-${acceptLanguage}-${ip}`)
      .digest('hex')
      .slice(0, 16);
  }

  // Get client IP address
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
  }

  // Log user activity to users.txt
  private async logUserActivity(user: any, action: string, ip: string, deviceId: string) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${action.toUpperCase()}: ${user.name} (${user.email}) - IP: ${ip} - Device: ${deviceId}\n`;
      
      await fs.appendFile(this.usersFilePath, logEntry);
      console.log(`📝 User activity logged: ${action} for ${user.email}`);
    } catch (error) {
      console.error('Error logging to users.txt:', error);
    }
  }

  // Database operations
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: this.hashPassword(userData.password!)
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        lastLoginAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyPassword(user: User, password: string): boolean {
    return user.password === this.hashPassword(password);
  }

  // Authentication routes
  setupAuthRoutes(app: Express) {
    // Register endpoint
    app.post('/api/auth/register', async (req: Request, res: Response) => {
      try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
          return res.status(400).json({ 
            success: false, 
            error: 'Name, email, and password are required' 
          });
        }

        if (password.length < 6) {
          return res.status(400).json({ 
            success: false, 
            error: 'Password must be at least 6 characters' 
          });
        }

        // Check if user already exists
        const existingUser = await this.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ 
            success: false, 
            error: 'User already exists with this email' 
          });
        }

        const ipAddress = this.getClientIP(req);
        const deviceId = this.generateDeviceId(req);
        const userId = nanoid();

        // Create user in database
        const user = await this.createUser({
          id: userId,
          name,
          email,
          password,
          ipAddress,
          deviceId,
        });

        // Log to users.txt
        await this.logUserActivity({ name, email }, 'register', ipAddress, deviceId);

        // Create session
        (req.session as any).userId = user.id;
        (req.session as any).user = { 
          id: user.id, 
          name: user.name, 
          email: user.email 
        };

        res.json({ 
          success: true, 
          user: { id: user.id, name: user.name, email: user.email },
          message: 'Account created successfully'
        });

      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to create account' 
        });
      }
    });

    // Login endpoint
    app.post('/api/auth/login', async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ 
            success: false, 
            error: 'Email and password are required' 
          });
        }

        // Find user
        const user = await this.getUserByEmail(email);
        if (!user || !await this.verifyPassword(user, password)) {
          return res.status(401).json({ 
            success: false, 
            error: 'Invalid email or password' 
          });
        }

        const ipAddress = this.getClientIP(req);
        const deviceId = this.generateDeviceId(req);

        // Update user's last login and device info
        await this.updateUser(user.id, {
          ipAddress,
          deviceId,
        });

        // Log to users.txt
        await this.logUserActivity(user, 'login', ipAddress, deviceId);

        // Create session
        (req.session as any).userId = user.id;
        (req.session as any).user = { 
          id: user.id, 
          name: user.name, 
          email: user.email 
        };

        res.json({ 
          success: true, 
          user: { id: user.id, name: user.name, email: user.email },
          message: 'Logged in successfully'
        });

      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to log in' 
        });
      }
    });

    // Logout endpoint
    app.post('/api/auth/logout', (req: Request, res: Response) => {
      const user = (req.session as any)?.user;
      
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to log out' 
          });
        }
        
        if (user) {
          this.logUserActivity(user, 'logout', this.getClientIP(req), 'session-ended');
        }
        
        res.json({ 
          success: true, 
          message: 'Logged out successfully' 
        });
      });
    });

    // Check authentication status
    app.get('/api/auth/me', async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any)?.userId;
        
        if (!userId) {
          return res.status(401).json({ 
            authenticated: false, 
            user: null 
          });
        }

        const user = await this.getUserById(userId);
        if (!user) {
          return res.status(401).json({ 
            authenticated: false, 
            user: null 
          });
        }

        res.json({ 
          authenticated: true,
          user: { id: user.id, name: user.name, email: user.email }
        });

      } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ 
          authenticated: false, 
          error: 'Failed to check authentication' 
        });
      }
    });

    // Get all users (admin endpoint)
    app.get('/api/admin/users', this.requireAuth, async (req: Request, res: Response) => {
      try {
        const allUsers = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          ipAddress: users.ipAddress,
          deviceId: users.deviceId,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt
        }).from(users);

        res.json({ 
          success: true, 
          users: allUsers 
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch users' 
        });
      }
    });

    // Get users.txt content (admin endpoint)
    app.get('/api/admin/user-logs', this.requireAuth, async (req: Request, res: Response) => {
      try {
        const logs = await fs.readFile(this.usersFilePath, 'utf-8');
        res.json({ 
          success: true, 
          logs 
        });
      } catch (error) {
        console.error('Error reading users.txt:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to read user logs' 
        });
      }
    });
  }

  // Session configuration
  setupSession(app: Express) {
    app.set("trust proxy", 1);
    
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });

    app.use(session({
      secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        maxAge: sessionTtl,
      },
    }));
  }

  // Middleware to require authentication
  requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    next();
  };

  // Initialize complete system
  initialize(app: Express) {
    console.log('🔐 Initializing User Account System...');
    
    // Setup session management
    this.setupSession(app);
    
    // Setup authentication routes
    this.setupAuthRoutes(app);
    
    console.log('✅ User Account System initialized');
    console.log('📝 User activity will be logged to users.txt');
    console.log('💾 User data stored in PostgreSQL database');
    console.log('🔑 Session management with device tracking enabled');
  }
}

// Export singleton instance
export const userSystem = new UserAccountSystem();

// Export middleware for use in other files
export const requireAuth = userSystem.requireAuth;