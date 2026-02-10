// Core types for the agentic RAG system
export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
  chunks?: DocumentChunk[];
}

export interface DocumentMetadata {
  title?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  sourceType: 'pdf' | 'docx' | 'txt' | 'md' | 'html' | 'json';
  language?: string;
  pageCount?: number;
  wordCount?: number;
  tags?: string[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  startIndex: number;
  endIndex: number;
  page?: number;
  section?: string;
  headings?: string[];
  semanticCoherence?: number;
  importance?: number;
}

export interface RetrievalQuery {
  query: string;
  userId: string;
  filters?: SearchFilters;
  strategy: RetrievalStrategy;
  limit: number;
  threshold?: number;
}

export interface SearchFilters {
  fileType?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  metadata?: Record<string, any>;
}

export type RetrievalStrategy = 
  | 'semantic'
  | 'hybrid'
  | 'keyword'
  | 'graph'
  | 'adaptive';

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  queryEmbedding: number[];
  strategy: RetrievalStrategy;
  totalResults: number;
  executionTime: number;
  metadata: RetrievalMetadata;
}

export interface RetrievedChunk extends DocumentChunk {
  score: number;
  matchType: 'semantic' | 'keyword' | 'hybrid' | 'graph';
  context?: string;
}

export interface RetrievalMetadata {
  searchTime: number;
  reRankingTime?: number;
  filtersApplied: boolean;
  queryRewrite?: string;
  expansionTerms?: string[];
  graphTraversalDepth?: number;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: AgentCapability[];
  status: AgentStatus;
  config: AgentConfig;
}

export type AgentType = 
  | 'retrieval'
  | 'reasoning'
  | 'synthesis'
  | 'validation'
  | 'orchestration';

export type AgentCapability = 
  | 'semantic_search'
  | 'keyword_search'
  | 'graph_search'
  | 'query_understanding'
  | 'answer_synthesis'
  | 'fact_checking'
  | 'source_validation'
  | 'conversation_management';

export type AgentStatus = 'active' | 'inactive' | 'error' | 'training';

export interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  parameters?: Record<string, any>;
  constraints?: AgentConstraints;
}

export interface AgentConstraints {
  maxRetrievalResults?: number;
  maxProcessingTime?: number;
  allowedSources?: string[];
  forbiddenSources?: string[];
  confidenceThreshold?: number;
}

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  input: any;
  assignedAgent?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies?: string[];
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type AgentTaskType = 
  | 'retrieve_documents'
  | 'understand_query'
  | 'synthesize_answer'
  | 'validate_sources'
  | 'rank_results'
  | 'extract_metadata'
  | 'classify_content';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  metadata: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: RetrievedChunk[];
  agentTasks?: string[];
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  relevantDocuments: string[];
  previousQueries: string[];
  userPreferences: UserPreferences;
  sessionState: Record<string, any>;
}

export interface UserPreferences {
  preferredRetrievalStrategy: RetrievalStrategy;
  maxResults: number;
  includeSources: boolean;
  language: string;
  responseStyle: 'concise' | 'detailed' | 'academic' | 'casual';
  expertLevel: 'beginner' | 'intermediate' | 'expert';
}

export interface ConversationMetadata {
  totalMessages: number;
  averageResponseTime: number;
  userSatisfaction?: number;
  topicsDiscussed: string[];
  documentAccessCount: Record<string, number>;
}

export interface SystemMetrics {
  totalDocuments: number;
  totalChunks: number;
  totalUsers: number;
  totalConversations: number;
  averageQueryTime: number;
  cacheHitRate: number;
  errorRate: number;
  uptime: number;
  activeAgents: number;
  queuedTasks: number;
}

export interface PerformanceMetrics {
  queryLatency: number[];
  retrievalQuality: number;
  answerAccuracy: number;
  userSatisfaction: number;
  systemThroughput: number;
  resourceUtilization: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}