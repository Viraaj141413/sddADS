import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  lastLoginAt: Date;
  loginCount: number;
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
  isOnline: boolean;
}

interface Project {
  id: string;
  name: string;
  prompt: string;
  files: Record<string, any>;
  userId: string;
  createdAt: Date;
  previewUrl?: string;
  language: string;
  framework?: string;
}

class FileDatabase {
  private dbDir: string;
  private usersFile: string;
  private projectsFile: string;

  constructor() {
    this.dbDir = path.join(process.cwd(), 'database');
    this.usersFile = path.join(this.dbDir, 'users.json');
    this.projectsFile = path.join(this.dbDir, 'projects.json');
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.dbDir, { recursive: true });
      
      // Initialize users file if it doesn't exist
      try {
        await fs.access(this.usersFile);
      } catch {
        await fs.writeFile(this.usersFile, JSON.stringify([], null, 2));
      }

      // Initialize projects file if it doesn't exist
      try {
        await fs.access(this.projectsFile);
      } catch {
        await fs.writeFile(this.projectsFile, JSON.stringify([], null, 2));
      }

      console.log('✅ File database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }

  // User methods
  async getUsers(): Promise<User[]> {
    try {
      const data = await fs.readFile(this.usersFile, 'utf-8');
      return JSON.parse(data).map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        lastLoginAt: new Date(user.lastLoginAt)
      }));
    } catch {
      return [];
    }
  }

  async saveUsers(users: User[]): Promise<void> {
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(user => user.email === email) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(user => user.id === id) || null;
  }

  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
  }): Promise<User> {
    const users = await this.getUsers();
    
    const newUser: User = {
      id: crypto.randomUUID(),
      email: userData.email,
      password: this.hashPassword(userData.password),
      name: userData.name,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      loginCount: 1,
      ipAddress: userData.ipAddress,
      deviceId: userData.deviceId,
      userAgent: userData.userAgent,
      isOnline: true
    };

    users.push(newUser);
    await this.saveUsers(users);
    
    console.log(`👤 User created: ${userData.email}`);
    return newUser;
  }

  async updateUserLogin(userId: string, updates: {
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
  }): Promise<void> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        ...updates,
        lastLoginAt: new Date(),
        loginCount: users[userIndex].loginCount + 1,
        isOnline: true
      };
      await this.saveUsers(users);
    }
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const hashedPassword = this.hashPassword(password);
    if (user.password === hashedPassword) {
      return user;
    }
    return null;
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    try {
      const data = await fs.readFile(this.projectsFile, 'utf-8');
      return JSON.parse(data).map((project: any) => ({
        ...project,
        createdAt: new Date(project.createdAt)
      }));
    } catch {
      return [];
    }
  }

  async saveProjects(projects: Project[]): Promise<void> {
    await fs.writeFile(this.projectsFile, JSON.stringify(projects, null, 2));
  }

  async createProject(projectData: {
    name: string;
    prompt: string;
    files: Record<string, any>;
    userId: string;
    previewUrl?: string;
    language: string;
    framework?: string;
  }): Promise<Project> {
    const projects = await this.getProjects();
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      ...projectData,
      createdAt: new Date()
    };

    projects.push(newProject);
    await this.saveProjects(projects);
    
    console.log(`📁 Project created: ${projectData.name}`);
    return newProject;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const projects = await this.getProjects();
    return projects.filter(project => project.userId === userId);
  }

  async getProjectById(id: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === id) || null;
  }

  // Utility methods
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // Statistics
  async getStats() {
    const users = await this.getUsers();
    const projects = await this.getProjects();
    
    return {
      totalUsers: users.length,
      totalProjects: projects.length,
      onlineUsers: users.filter(u => u.isOnline).length,
      recentProjects: projects.filter(p => 
        new Date().getTime() - new Date(p.createdAt).getTime() < 24 * 60 * 60 * 1000
      ).length
    };
  }
}

export const fileDb = new FileDatabase();
export type { User, Project };