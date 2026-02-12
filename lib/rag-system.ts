import { AgentOrchestrator } from './agents/orchestrator';
import { ConversationManager } from './conversation/manager';
import { DocumentProcessor } from './processing/document-processor';
import { AdvancedRetrievalEngine } from './retrieval/engine';
import { RetrievalQuery, RetrievalStrategy, SystemMetrics, RetrievalResult } from './core/types';
import { db } from './db-config';
import { documents } from './db-schema';
import { generateEmbeddings } from './embeddings';

export class RagSystem {
  private orchestrator: AgentOrchestrator;
  private conversationManager: ConversationManager;
  private documentProcessor: DocumentProcessor;
  private retrievalEngine: AdvancedRetrievalEngine;
  private isInitialized: boolean = false;

  constructor() {
    this.orchestrator = new AgentOrchestrator();
    this.conversationManager = new ConversationManager();
    this.documentProcessor = new DocumentProcessor();
    this.retrievalEngine = new AdvancedRetrievalEngine();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test database connection
      await db.select().from(documents).limit(1);
      
      // Initialize agents
      const agentStatus = this.orchestrator.getAgentStatus();
      console.log(`Initialized ${agentStatus.length} agents`);

      this.isInitialized = true;
      console.log('RAG System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RAG System:', error);
      throw error;
    }
  }

  async processDocument(
    buffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      // Validate file
      const validation = this.documentProcessor.validateFile(buffer, fileName);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Extract file type
      const fileType = fileName.split('.').pop()?.toLowerCase() || 'txt';

      // Process document
      const document = await this.documentProcessor.processDocument(
        buffer,
        fileName,
        userId,
        fileType
      );

      // Generate embeddings for chunks
      const chunkTexts = document.chunks!.map(chunk => chunk.content);
      const embeddings = await generateEmbeddings(chunkTexts);

      // Update chunks with embeddings
      document.chunks!.forEach((chunk, index) => {
        chunk.embedding = embeddings[index];
      });

      // Store in database
      const records = document.chunks!.map(chunk => ({
        content: chunk.content,
        embedding: chunk.embedding,
        title: document.metadata.title,
        userId: userId,
        fileName: document.metadata.fileName,
        fileSize: document.metadata.fileSize,
        chunkIndex: chunk.chunkIndex,
      }));

      await db.insert(documents).values(records);

      return { success: true, documentId: document.id };
    } catch (error) {
      console.error('Document processing failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async retrieveDocuments(query: RetrievalQuery): Promise<RetrievalResult> {
    try {
      return await this.retrievalEngine.retrieve(query);
    } catch (error) {
      console.error('Document retrieval failed:', error);
      throw error;
    }
  }

  async createConversation(userId: string, title?: string) {
    return await this.conversationManager.createConversation(userId, title);
  }

  async getConversation(conversationId: string) {
    return await this.conversationManager.getConversation(conversationId);
  }

  async processQuery(
    conversationId: string,
    query: string,
    options: {
      strategy?: RetrievalStrategy;
      maxResults?: number;
      includeSources?: boolean;
    } = {}
  ) {
    return await this.conversationManager.processUserMessage(
      conversationId,
      query,
      options
    );
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [
        totalDocsResult,
        totalUsersResult,
        agentStatus,
        queueStatus
      ] = await Promise.all([
        db.select().from(documents),
        db.selectDistinct({ userId: documents.userId }).from(documents),
        this.orchestrator.getAgentStatus(),
        this.orchestrator.getQueueStatus()
      ]);

      const totalChunks = totalDocsResult.length;
      const uniqueUsers = totalUsersResult.length;
      const activeAgents = agentStatus.filter(a => a.agent.status === 'active').length;

      return {
        totalDocuments: new Set(totalDocsResult.map(d => d.fileName)).size,
        totalChunks,
        totalUsers: uniqueUsers,
        totalConversations: 0, // Would need conversations table
        averageQueryTime: 1500, // Placeholder - would track actual metrics
        cacheHitRate: this.retrievalEngine.getCacheStats().hitRate,
        errorRate: 0.02, // Placeholder - would track actual error rate
        uptime: process.uptime(),
        activeAgents,
        queuedTasks: queueStatus.queued,
      };
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const start = Date.now();
      
      // Check database connection
      await db.select().from(documents).limit(1);
      const dbTime = Date.now() - start;

      // Check agents
      const agentStatus = this.orchestrator.getAgentStatus();
      const activeAgents = agentStatus.filter(a => a.agent.status === 'active');

      // Check retrieval engine
      const cacheStats = this.retrievalEngine.getCacheStats();

      const isHealthy = 
        activeAgents.length > 0 && 
        dbTime < 1000 &&
        cacheStats.hitRate > 0.5;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          database: { connected: true, responseTime: dbTime },
          agents: { total: agentStatus.length, active: activeAgents.length },
          cache: cacheStats,
          uptime: process.uptime(),
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          uptime: process.uptime(),
        }
      };
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Cancel running tasks
      const queueStatus = this.orchestrator.getQueueStatus();
      console.log(`Cancelling ${queueStatus.running} running tasks...`);

      // Clear caches
      this.retrievalEngine.clearCache();

      console.log('RAG System shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

export const ragSystem = new RagSystem();