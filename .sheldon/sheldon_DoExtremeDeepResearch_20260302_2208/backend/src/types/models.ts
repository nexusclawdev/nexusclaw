// TypeScript interfaces for database models

export interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  profile?: Profile;
  projects?: ResearchProject[];
  assignedTasks?: WorkflowTask[];
  apiKeys?: ApiKey[];
}

export interface Profile {
  id: number;
  userId: number;
  organization?: string;
  jobTitle?: string;
  bio?: string;
  avatarUrl?: string;
  preferences: {
    researchTopics: string[];
    notificationSettings: {
      email: boolean;
      inApp: boolean;
    };
    interface: {
      theme: 'light' | 'dark' | 'auto';
      language: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  user?: User;
}

export interface ResearchProject {
  id: number;
  userId: number;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags: string[];
  metadata: {
    sourceCount: number;
    documentCount: number;
    lastUpdated: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  owner?: User;
  sources?: ResearchSource[];
  documents?: ResearchDocument[];
  tasks?: WorkflowTask[];
}

export interface ResearchSource {
  id: number;
  projectId: number;
  url: string;
  title?: string;
  description?: string;
  contentType: 'webpage' | 'pdf' | 'document' | 'video' | 'podcast';
  contentLength?: number;
  fetchStatus: 'pending' | 'fetching' | 'completed' | 'failed';
  fetchError?: string;
  contentHash?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  project?: ResearchProject;
}

export interface ResearchDocument {
  id: number;
  projectId: number;
  title: string;
  content: string;
  documentType: 'summary' | 'analysis' | 'report' | 'brief' | 'notes';
  format: 'text' | 'markdown' | 'html';
  version: number;
  isPublished: boolean;
  wordCount?: number;
  readingTime?: number;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  project?: ResearchProject;
}

export interface WorkflowTask {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  taskType: 'research' | 'analysis' | 'writing' | 'review' | 'approval';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: number;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: number[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  project?: ResearchProject;
  assignee?: User;
}

export interface ApiKey {
  id: number;
  userId: number;
  key: string;
  name: string;
  description?: string;
  permissions: {
    research: boolean;
    documents: boolean;
    workflows: boolean;
    admin: boolean;
  };
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  user?: User;
}

// Composite types for responses
export interface AuthResponse {
  user: User;
  token: string;
}

export interface ProjectWithDetails extends ResearchProject {
  sourceCount: number;
  documentCount: number;
  taskCount: number;
  ownerName: string;
}

export interface SourceWithContent extends ResearchSource {
  content?: string;
  summary?: string;
}

export interface DocumentWithStats extends ResearchDocument {
  readingTimeMinutes?: number;
  sourcesUsed?: number;
}