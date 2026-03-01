// TypeScript type definitions for AI SaaS database layer

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AI_Model {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAIModel {
  projectId: string;
  aiModelId: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  aiModelId: string;
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  status: TaskExecutionStatus;
  errorMessage?: string;
  executionTimeMs?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetric {
  id: string;
  userId: string;
  taskExecutionId?: string;
  metricType: string;
  value: number;
  createdAt: Date;
}

export interface Database {
  users: {
    get: (id: string) => Promise<User | null>;
    getByEmail: (email: string) => Promise<User | null>;
    create: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<User>;
    update: (id: string, updates: Partial<User>) => Promise<User>;
    delete: (id: string) => Promise<void>;
    list: (options?: {
      limit?: number;
      offset?: number;
      search?: string;
    }) => Promise<User[]>;
  };
  
  projects: {
    get: (id: string) => Promise<Project | null>;
    create: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
    update: (id: string, updates: Partial<Project>) => Promise<Project>;
    delete: (id: string) => Promise<void>;
    listByUser: (userId: string, options?: {
      limit?: number;
      offset?: number;
      status?: ProjectStatus;
    }) => Promise<Project[]>;
  };
  
  aiModels: {
    get: (id: string) => Promise<AI_Model | null>;
    create: (model: Omit<AI_Model, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AI_Model>;
    list: () => Promise<AI_Model[]>;
  };
  
  projectsAIModels: {
    get: (projectId: string, aiModelId: string) => Promise<ProjectAIModel | null>;
    create: (projectId: string, aiModelId: string) => Promise<ProjectAIModel>;
    delete: (projectId: string, aiModelId: string) => Promise<void>;
    listByProject: (projectId: string) => Promise<AI_Model[]>;
    listByAIModel: (aiModelId: string) => Promise<Project[]>;
  };
  
  tasks: {
    get: (id: string) => Promise<Task | null>;
    create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
    update: (id: string, updates: Partial<Task>) => Promise<Task>;
    delete: (id: string) => Promise<void>;
    listByProject: (projectId: string, options?: {
      limit?: number;
      offset?: number;
      status?: TaskStatus;
      priority?: TaskPriority;
    }) => Promise<Task[]>;
  };
  
  taskExecutions: {
    get: (id: string) => Promise<TaskExecution | null>;
    create: (execution: Omit<TaskExecution, 'id' | 'createdAt'>) => Promise<TaskExecution>;
    update: (id: string, updates: Partial<TaskExecution>) => Promise<TaskExecution>;
    listByTask: (taskId: string, options?: {
      limit?: number;
      offset?: number;
      status?: TaskExecutionStatus;
    }) => Promise<TaskExecution[]>;
    listByAIModel: (aiModelId: string, options?: {
      limit?: number;
      offset?: number;
      status?: TaskExecutionStatus;
    }) => Promise<TaskExecution[]>;
  };
  
  subscriptions: {
    get: (id: string) => Promise<Subscription | null>;
    create: (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Subscription>;
    update: (id: string, updates: Partial<Subscription>) => Promise<Subscription>;
    delete: (id: string) => Promise<void>;
    getByUser: (userId: string) => Promise<Subscription | null>;
  };
  
  usageMetrics: {
    create: (metric: Omit<UsageMetric, 'id' | 'createdAt'>) => Promise<UsageMetric>;
    listByUser: (userId: string, options?: {
      limit?: number;
      offset?: number;
      metricType?: string;
      startDate?: Date;
      endDate?: Date;
    }) => Promise<UsageMetric[]>;
    getTotalUsage: (userId: string, metricType: string, startDate?: Date, endDate?: Date) => Promise<number>;
  };
}

export type ProjectStatus = 'active' | 'inactive' | 'archived';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';