import { Conversation, ConversationMessage, ConversationContext, UserPreferences } from '../core/types';
import { nanoid } from 'nanoid';
import { agentOrchestrator } from '../agents/orchestrator';
import { retrievalEngine } from '../retrieval/engine';
import { RetrievalQuery, RetrievalStrategy } from '../core/types';

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();

  async createConversation(userId: string, title?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: nanoid(),
      userId,
      title: title || 'New Conversation',
      messages: [],
      context: {
        relevantDocuments: [],
        previousQueries: [],
        userPreferences: this.getDefaultUserPreferences(),
        sessionState: {},
      },
      metadata: {
        totalMessages: 0,
        averageResponseTime: 0,
        topicsDiscussed: [],
        documentAccessCount: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(conv => conv.userId === userId);
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<ConversationMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const message: ConversationMessage = {
      id: nanoid(),
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    conversation.messages.push(message);
    conversation.metadata.totalMessages++;
    conversation.updatedAt = new Date();

    // Update context for user messages
    if (role === 'user') {
      conversation.context.previousQueries.push(content);
      // Keep only last 10 queries
      if (conversation.context.previousQueries.length > 10) {
        conversation.context.previousQueries = conversation.context.previousQueries.slice(-10);
      }

      // Extract topics (simplified)
      const topics = this.extractTopics(content);
      topics.forEach(topic => {
        if (!conversation.metadata.topicsDiscussed.includes(topic)) {
          conversation.metadata.topicsDiscussed.push(topic);
        }
      });
    }

    return message;
  }

  async processUserMessage(
    conversationId: string,
    userMessage: string,
    options: {
      strategy?: RetrievalStrategy;
      maxResults?: number;
      includeSources?: boolean;
    } = {}
  ): Promise<{ response: string; sources: any[]; agentTasks: string[] }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const startTime = Date.now();

    // Add user message
    await this.addMessage(conversationId, 'user', userMessage);

    // Submit agent tasks for processing
    const agentTasks: string[] = [];

    // Task 1: Understand the query
    const queryTask = await agentOrchestrator.submitTask({
      id: nanoid(),
      type: 'understand_query',
      input: { query: userMessage, context: conversation.context },
      status: 'pending',
      priority: 'high',
      createdAt: new Date(),
    });
    agentTasks.push(queryTask);

    // Task 2: Retrieve relevant documents
    const retrievalTask = await agentOrchestrator.submitTask({
      id: nanoid(),
      type: 'retrieve_documents',
      input: {
        query: userMessage,
        userId: conversation.userId,
        strategy: options.strategy || conversation.context.userPreferences.preferredRetrievalStrategy,
        limit: options.maxResults || conversation.context.userPreferences.maxResults,
      },
      status: 'pending',
      priority: 'high',
      dependencies: [queryTask],
      createdAt: new Date(),
    });
    agentTasks.push(retrievalTask);

    // Wait for tasks to complete (in real implementation, use event-driven approach)
    const queryResult = await this.waitForTask(queryTask);
    const retrievalResult = await this.waitForTask(retrievalTask);

    // Task 3: Synthesize answer
    const synthesisTask = await agentOrchestrator.submitTask({
      id: nanoid(),
      type: 'synthesize_answer',
      input: {
        query: userMessage,
        queryUnderstanding: queryResult,
        retrievedDocs: retrievalResult,
        context: conversation.context,
        style: conversation.context.userPreferences.responseStyle,
      },
      status: 'pending',
      priority: 'high',
      dependencies: [retrievalTask],
      createdAt: new Date(),
    });
    agentTasks.push(synthesisTask);

    // Wait for synthesis
    const synthesisResult = await this.waitForTask(synthesisTask);

    // Task 4: Validate sources (optional, for production)
    if (options.includeSources) {
      const validationTask = await agentOrchestrator.submitTask({
        id: nanoid(),
        type: 'validate_sources',
        input: {
          answer: synthesisResult.answer,
          sources: retrievalResult.chunks,
          query: userMessage,
        },
        status: 'pending',
        priority: 'medium',
        dependencies: [synthesisTask],
        createdAt: new Date(),
      });
      agentTasks.push(validationTask);

      const validationResult = await this.waitForTask(validationTask);
      
      if (validationResult.needsRevision) {
        // Revise answer based on validation
        const revisionTask = await agentOrchestrator.submitTask({
          id: nanoid(),
          type: 'synthesize_answer',
          input: {
            query: userMessage,
            queryUnderstanding: queryResult,
            retrievedDocs: retrievalResult.chunks,
            context: conversation.context,
            style: conversation.context.userPreferences.responseStyle,
            validationFeedback: validationResult.feedback,
          },
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
        });
        agentTasks.push(revisionTask);

        const revisionResult = await this.waitForTask(revisionTask);
        synthesisResult.answer = revisionResult.answer;
      }
    }

    // Add assistant message
    const assistantMessage = await this.addMessage(
      conversationId,
      'assistant',
      synthesisResult.answer,
      {
        sources: retrievalResult.chunks,
        agentTasks,
        executionTime: Date.now() - startTime,
      }
    );

    // Update document access tracking
    retrievalResult.chunks.forEach((chunk: any) => {
      const docId = chunk.documentId;
      conversation.metadata.documentAccessCount[docId] = 
        (conversation.metadata.documentAccessCount[docId] || 0) + 1;
    });

    // Update average response time
    const responseTime = Date.now() - startTime;
    const totalResponseTime = conversation.metadata.averageResponseTime * (conversation.metadata.totalMessages - 1) + responseTime;
    conversation.metadata.averageResponseTime = totalResponseTime / conversation.metadata.totalMessages;

    return {
      response: synthesisResult.answer,
      sources: options.includeSources ? retrievalResult.chunks : [],
      agentTasks,
    };
  }

  private async waitForTask(taskId: string, timeout: number = 30000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const task = agentOrchestrator.getTaskStatus(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      if (task.status === 'completed') {
        return task.result;
      } else if (task.status === 'failed') {
        throw new Error(`Task ${taskId} failed: ${task.error}`);
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
  }

  private extractTopics(message: string): string[] {
    // Simple topic extraction - can be enhanced with NLP
    const topics: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Common technical topics
    const topicPatterns = [
      { pattern: /\b(machin|learn|ai|intelligenc)\w*\b/g, topic: 'machine learning' },
      { pattern: /\b(databas|sql|nosql)\w*\b/g, topic: 'database' },
      { pattern: /\b(securit|auth|encrypt)\w*\b/g, topic: 'security' },
      { pattern: /\b(performanc|optim|scal)\w*\b/g, topic: 'performance' },
      { pattern: /\b(api|rest|graphql)\w*\b/g, topic: 'api' },
      { pattern: /\b(frontend|backend|full.stack)\w*\b/g, topic: 'development' },
    ];
    
    topicPatterns.forEach(({ pattern, topic }) => {
      if (pattern.test(lowerMessage)) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  private getDefaultUserPreferences(): UserPreferences {
    return {
      preferredRetrievalStrategy: 'hybrid',
      maxResults: 5,
      includeSources: true,
      language: 'en',
      responseStyle: 'detailed',
      expertLevel: 'intermediate',
    };
  }

  async updateUserPreferences(
    conversationId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.context.userPreferences = {
      ...conversation.context.userPreferences,
      ...preferences,
    };
    conversation.updatedAt = new Date();
  }

  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return false;
    }

    this.conversations.delete(conversationId);
    return true;
  }

  async searchConversations(
    userId: string,
    query: string
  ): Promise<Conversation[]> {
    const userConversations = await this.getUserConversations(userId);
    const lowerQuery = query.toLowerCase();

    return userConversations.filter(conv => {
      // Search in title
      if (conv.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in messages
      return conv.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  getConversationStats(userId: string): {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    topTopics: string[];
    averageResponseTime: number;
  } {
    const userConversations = Array.from(this.conversations.values()).filter(conv => conv.userId === userId);
    
    const totalMessages = userConversations.reduce((sum, conv) => sum + conv.metadata.totalMessages, 0);
    const allTopics = userConversations.flatMap(conv => conv.metadata.topicsDiscussed);
    const topicCounts = allTopics.reduce((counts, topic) => {
      counts[topic] = (counts[topic] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    const totalResponseTime = userConversations.reduce((sum, conv) => 
      sum + conv.metadata.averageResponseTime * conv.metadata.totalMessages, 0);
    const averageResponseTime = totalMessages > 0 ? totalResponseTime / totalMessages : 0;

    return {
      totalConversations: userConversations.length,
      totalMessages,
      averageMessagesPerConversation: userConversations.length > 0 ? totalMessages / userConversations.length : 0,
      topTopics,
      averageResponseTime,
    };
  }
}

export const conversationManager = new ConversationManager();