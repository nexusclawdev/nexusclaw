import { Sequelize, Model, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: process.env.NODE_ENV === 'production' ? false : console.log
});

class User extends Model {}
User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 128]
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['email'],
      unique: true
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['isActive']
    }
  ]
});

class Profile extends Model {}
Profile.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  organization: {
    type: DataTypes.STRING,
    allowNull: true
  },
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: () => ({
      researchTopics: [],
      notificationSettings: {
        email: true,
        inApp: true
      },
      interface: {
        theme: 'light',
        language: 'en'
      }
    })
  }
}, {
  sequelize,
  modelName: 'Profile',
  tableName: 'profiles',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['userId'],
      unique: true
    },
    {
      fields: ['organization']
    }
  ]
});

class ResearchProject extends Model {}
ResearchProject.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed', 'archived'),
    defaultValue: 'draft'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: () => []
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: () => ({
      sourceCount: 0,
      documentCount: 0,
      lastUpdated: null
    })
  }
}, {
  sequelize,
  modelName: 'ResearchProject',
  tableName: 'research_projects',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['dueDate']
    },
    {
      fields: ['createdAt']
    }
  ]
});

class ResearchSource extends Model {}
ResearchSource.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'research_projects',
      key: 'id'
    }
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contentType: {
    type: DataTypes.ENUM('webpage', 'pdf', 'document', 'video', 'podcast'),
    allowNull: false
  },
  contentLength: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fetchStatus: {
    type: DataTypes.ENUM('pending', 'fetching', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  fetchError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contentHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'ResearchSource',
  tableName: 'research_sources',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['projectId']
    },
    {
      fields: ['url'],
      unique: true
    },
    {
      fields: ['fetchStatus']
    },
    {
      fields: ['contentType']
    },
    {
      fields: ['createdAt']
    }
  ]
});

class ResearchDocument extends Model {}
ResearchDocument.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'research_projects',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  documentType: {
    type: DataTypes.ENUM('summary', 'analysis', 'report', 'brief', 'notes'),
    allowNull: false
  },
  format: {
    type: DataTypes.ENUM('text', 'markdown', 'html'),
    defaultValue: 'text'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  wordCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  readingTime: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'ResearchDocument',
  tableName: 'research_documents',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['projectId']
    },
    {
      fields: ['documentType']
    },
    {
      fields: ['isPublished']
    },
    {
      fields: ['version']
    },
    {
      fields: ['createdAt']
    }
  ]
});

class WorkflowTask extends Model {}
WorkflowTask.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'research_projects',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  taskType: {
    type: DataTypes.ENUM('research', 'analysis', 'writing', 'review', 'approval'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'blocked'),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  assigneeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  estimatedHours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  actualHours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  dependencies: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: () => []
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'WorkflowTask',
  tableName: 'workflow_tasks',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['projectId']
    },
    {
      fields: ['assigneeId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['dueDate']
    },
    {
      fields: ['taskType']
    }
  ]
});

class ApiKey extends Model {}
ApiKey.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: () => ({
      research: true,
      documents: true,
      workflows: true,
      admin: false
    })
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'ApiKey',
  tableName: 'api_keys',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['key'],
      unique: true
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['expiresAt']
    },
    {
      fields: ['lastUsedAt']
    }
  ]
});

// Associations
User.hasOne(Profile, {
  foreignKey: 'userId',
  as: 'profile'
});

Profile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(ResearchProject, {
  foreignKey: 'userId',
  as: 'projects'
});

ResearchProject.belongsTo(User, {
  foreignKey: 'userId',
  as: 'owner'
});

User.hasMany(WorkflowTask, {
  foreignKey: 'assigneeId',
  as: 'assignedTasks'
});

WorkflowTask.belongsTo(User, {
  foreignKey: 'assigneeId',
  as: 'assignee'
});

User.hasMany(ApiKey, {
  foreignKey: 'userId',
  as: 'apiKeys'
});

ApiKey.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

ResearchProject.hasMany(ResearchSource, {
  foreignKey: 'projectId',
  as: 'sources'
});

ResearchSource.belongsTo(ResearchProject, {
  foreignKey: 'projectId',
  as: 'project'
});

ResearchProject.hasMany(ResearchDocument, {
  foreignKey: 'projectId',
  as: 'documents'
});

ResearchDocument.belongsTo(ResearchProject, {
  foreignKey: 'projectId',
  as: 'project'
});

ResearchProject.hasMany(WorkflowTask, {
  foreignKey: 'projectId',
  as: 'tasks'
});

WorkflowTask.belongsTo(ResearchProject, {
  foreignKey: 'projectId',
  as: 'project'
});

export { sequelize, User, Profile, ResearchProject, ResearchSource, ResearchDocument, WorkflowTask, ApiKey, setupAssociations };

function setupAssociations() {
  // User associations
  User.hasOne(Profile, { foreignKey: 'userId', as: 'profile' });
  Profile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
  // Research associations
  User.hasMany(ResearchProject, { foreignKey: 'userId', as: 'projects' });
  ResearchProject.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
  
  // Workflow associations
  User.hasMany(WorkflowTask, { foreignKey: 'assigneeId', as: 'assignedTasks' });
  WorkflowTask.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });
  
  // API Key associations
  User.hasMany(ApiKey, { foreignKey: 'userId', as: 'apiKeys' });
  ApiKey.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
  // Project associations
  ResearchProject.hasMany(ResearchSource, { foreignKey: 'projectId', as: 'sources' });
  ResearchSource.belongsTo(ResearchProject, { foreignKey: 'projectId', as: 'project' });
  
  ResearchProject.hasMany(ResearchDocument, { foreignKey: 'projectId', as: 'documents' });
  ResearchDocument.belongsTo(ResearchProject, { foreignKey: 'projectId', as: 'project' });
  
  ResearchProject.hasMany(WorkflowTask, { foreignKey: 'projectId', as: 'tasks' });
  WorkflowTask.belongsTo(ResearchProject, { foreignKey: 'projectId', as: 'project' });
}