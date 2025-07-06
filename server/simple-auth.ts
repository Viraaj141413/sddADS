import { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { fileDb, User } from './file-database';

interface AuthRequest extends Request {
  session: any;
  user?: User;
}

export function setupSimpleAuth(app: Express) {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Extract device info
  function getDeviceInfo(req: Request) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const deviceId = req.get('X-Device-ID') || `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return { ip, userAgent, deviceId };
  }

  // Register endpoint
  app.post('/api/auth/register', async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      // Check if user already exists
      const existingUser = await fileDb.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const deviceInfo = getDeviceInfo(req);
      
      // Create new user
      const user = await fileDb.createUser({
        email,
        password,
        name,
        ipAddress: deviceInfo.ip,
        deviceId: deviceInfo.deviceId,
        userAgent: deviceInfo.userAgent
      });

      // Set session
      req.session.userId = user.id;
      req.session.email = user.email;

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req: AuthRequest, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Verify user credentials
      const user = await fileDb.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const deviceInfo = getDeviceInfo(req);
      
      // Update login info
      await fileDb.updateUserLogin(user.id, {
        ipAddress: deviceInfo.ip,
        deviceId: deviceInfo.deviceId,
        userAgent: deviceInfo.userAgent
      });

      // Set session
      req.session.userId = user.id;
      req.session.email = user.email;

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: AuthRequest, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get('/api/auth/me', async (req: AuthRequest, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await fileDb.getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // Get user projects
  app.get('/api/auth/projects', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const projects = await fileDb.getUserProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ error: 'Failed to get projects' });
    }
  });

  // Create project
  app.post('/api/auth/projects', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { name, prompt, files, previewUrl, language, framework } = req.body;

      const project = await fileDb.createProject({
        name: name || 'Untitled Project',
        prompt: prompt || '',
        files: files || {},
        userId: req.user!.id,
        previewUrl,
        language: language || 'html',
        framework
      });

      res.json(project);

    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  console.log('✅ Simple file-based authentication system initialized');
}

// Auth middleware
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await fileDb.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}