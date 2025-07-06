/**
 * VIRAAJDATA AUTH - Simple Authentication using users.txt
 * All user data stored permanently in users.txt file
 */

import { Express, Request, Response, NextFunction } from 'express';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as path from 'path';

interface ViraajUser {
  id: string;
  name: string;
  email: string;
  password: string;
  deviceId: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export class ViraajAuth {
  private usersFile = path.join(process.cwd(), 'users.txt');
  
  async initialize(app: Express) {
    console.log('🚀 VIRAAJDATA AUTH: Initializing...');
    
    // Ensure users.txt exists
    try {
      await fs.access(this.usersFile);
    } catch {
      await fs.writeFile(this.usersFile, `[${new Date().toISOString()}] VIRAAJDATA AUTH INITIALIZED\n`);
    }
    
    // Register authentication routes
    this.setupRoutes(app);
    
    console.log('✅ VIRAAJDATA AUTH: Ready');
  }
  
  private setupRoutes(app: Express) {
    // Register endpoint
    app.post('/api/viraaj/register', async (req: Request, res: Response) => {
      try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
          return res.status(400).json({ success: false, error: 'All fields required' });
        }
        
        // Check if user exists
        const existingUser = await this.findUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ success: false, error: 'Email already registered' });
        }
        
        // Create new user
        const user: ViraajUser = {
          id: this.generateId(),
          name,
          email,
          password: this.hashPassword(password),
          deviceId: this.getDeviceId(req),
          createdAt: new Date(),
          lastLoginAt: new Date()
        };
        
        // Save to users.txt
        await this.saveUser(user);
        
        // Log registration
        const logEntry = `[${new Date().toISOString()}] REGISTRATION: ${user.id}|${user.name}|${user.email}|DEVICE:${user.deviceId}|SUCCESS\n`;
        await fs.appendFile(this.usersFile, logEntry);
        
        res.json({ 
          success: true, 
          user: { id: user.id, name: user.name, email: user.email }
        });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
      }
    });
    
    // Login endpoint
    app.post('/api/viraaj/login', async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ success: false, error: 'Email and password required' });
        }
        
        // Find user
        const user = await this.findUserByEmail(email);
        if (!user || user.password !== this.hashPassword(password)) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        // Update device and login time
        user.deviceId = this.getDeviceId(req);
        user.lastLoginAt = new Date();
        
        // Log successful login
        const logEntry = `[${new Date().toISOString()}] LOGIN: ${user.id}|${user.email}|DEVICE:${user.deviceId}|SUCCESS\n`;
        await fs.appendFile(this.usersFile, logEntry);
        
        res.json({ 
          success: true, 
          user: { id: user.id, name: user.name, email: user.email }
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
      }
    });
    
    // Check device endpoint
    app.get('/api/viraaj/check-device', async (req: Request, res: Response) => {
      try {
        const deviceId = req.headers['x-device-id'] as string;
        
        if (!deviceId) {
          return res.json({ success: false, remembered: false });
        }
        
        // Check if device is remembered
        const content = await fs.readFile(this.usersFile, 'utf-8');
        const remembered = content.includes(`DEVICE:${deviceId}`);
        
        res.json({ success: true, remembered });
      } catch (error) {
        res.json({ success: false, remembered: false });
      }
    });
    
    // Get user endpoint
    app.get('/api/auth/me', async (req: Request, res: Response) => {
      // For now, return not authenticated
      res.status(401).json({ error: 'Not authenticated' });
    });
  }
  
  private async findUserByEmail(email: string): Promise<ViraajUser | null> {
    try {
      const content = await fs.readFile(this.usersFile, 'utf-8');
      const lines = content.split('\n');
      
      // Search for user data lines
      for (const line of lines) {
        if (line.includes('USER_DATA:') && line.includes(email)) {
          const parts = line.split('|');
          if (parts.length >= 4) {
            const userData = parts[0].split('USER_DATA:')[1];
            return {
              id: userData.trim(),
              name: parts[1] || 'User',
              email: parts[2],
              password: parts[3],
              deviceId: parts[4] || '',
              createdAt: new Date(),
              lastLoginAt: new Date()
            };
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  private async saveUser(user: ViraajUser) {
    const userLine = `[${new Date().toISOString()}] USER_DATA:${user.id}|${user.name}|${user.email}|${user.password}|${user.deviceId}|PERMANENT\n`;
    await fs.appendFile(this.usersFile, userLine);
  }
  
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
  
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  private getDeviceId(req: Request): string {
    const ua = req.headers['user-agent'] || '';
    const ip = req.ip || '';
    return crypto.createHash('md5').update(ua + ip).digest('hex').substring(0, 16);
  }
}

export const viraajAuth = new ViraajAuth();