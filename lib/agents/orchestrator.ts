import { Agent, AgentTask, TaskStatus, AgentType, AgentCapability } from '../core/types';

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: AgentTask[] = [];
  private runningTasks: Map<string, AgentTask> = new Map();
  private taskHistory: AgentTask[] = [];

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    // Retrieval Agents
    this.registerAgent({
      id: 'semantic-retriever',
      name: 'Semantic Search Agent',
      type: 'retrieval',
      capabilities: ['semantic_search', 'query_understanding'],
      status: 'active',
      config: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        tools: ['semantic_search'],
        constraints: {
          maxRetrievalResults: 20,
          confidenceThreshold: 0.7
        }
      }
    });

    this.registerAgent({
      id: 'keyword-retriever',
      name: 'Keyword Search Agent',
      type: 'retrieval',
      capabilities: ['keyword_search'],
      status: 'active',
      config: {
        model: 'gpt-4o-mini',
        tools: ['keyword_search'],
        constraints: {
          maxRetrievalResults: 30
        }
      }
    });

    this.registerAgent({
      id: 'hybrid-retriever',
      name: 'Hybrid Search Agent',
      type: 'retrieval',
      capabilities: ['semantic_search', 'keyword_search'],
      status: 'active',
      config: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        tools: ['hybrid_search'],
        constraints: {
          maxRetrievalResults: 25
        }
      }
    });

    // Reasoning Agents
    this.registerAgent({
      id: 'query-analyzer',
      name: 'Query Understanding Agent',
      type: 'reasoning',
      capabilities: ['query_understanding'],
      status: 'active',
      config: {
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 500,
        constraints: {
          maxProcessingTime: 5000
        }
      }
    });

    // Synthesis Agents
    this.registerAgent({
      id: 'answer-synthesizer',
      name: 'Answer Synthesis Agent',
      type: 'synthesis',
      capabilities: ['answer_synthesis'],
      status: 'active',
      config: {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2000,
        constraints: {
          maxProcessingTime: 10000
        }
      }
    });

    // Validation Agents
    this.registerAgent({
      id: 'fact-checker',
      name: 'Fact Validation Agent',
      type: 'validation',
      capabilities: ['fact_checking', 'source_validation'],
      status: 'active',
      config: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        constraints: {
          confidenceThreshold: 0.8
        }
      }
    });

    // Orchestration Agent
    this.registerAgent({
      id: 'orchestrator',
      name: 'Master Orchestrator',
      type: 'orchestration',
      capabilities: ['conversation_management'],
      status: 'active',
      config: {
        model: 'gpt-4o',
        temperature: 0.2,
        constraints: {
          maxProcessingTime: 15000
        }
      }
    });
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAgentsByType(type: AgentType): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }

  getAgentsByCapability(capability: AgentCapability): Agent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.capabilities.includes(capability)
    );
  }

  async submitTask(task: AgentTask): Promise<string> {
    task.status = 'pending';
    task.createdAt = new Date();
    this.taskQueue.push(task);
    
    // Process queue asynchronously
    setImmediate(() => this.processQueue());
    
    return task.id;
  }

  private async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      
      // Check if dependencies are completed
      if (task.dependencies && task.dependencies.length > 0) {
        const pendingDeps = task.dependencies.filter(depId => {
          const dep = this.taskHistory.find(t => t.id === depId);
          return !dep || dep.status !== 'completed';
        });
        
        if (pendingDeps.length > 0) {
          // Re-queue task with lower priority
          this.taskQueue.push(task);
          continue;
        }
      }

      // Find suitable agent
      const agent = this.findBestAgent(task);
      if (!agent) {
        task.status = 'failed';
        task.error = 'No suitable agent found';
        task.completedAt = new Date();
        this.taskHistory.push(task);
        continue;
      }

      task.assignedAgent = agent.id;
      task.status = 'running';
      task.startedAt = new Date();
      this.runningTasks.set(task.id, task);

      // Execute task
      try {
        const result = await this.executeTask(task, agent);
        task.result = result;
        task.status = 'completed';
        task.completedAt = new Date();
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
        task.completedAt = new Date();
      }

      this.runningTasks.delete(task.id);
      this.taskHistory.push(task);
    }
  }

  private findBestAgent(task: AgentTask): Agent | undefined {
    const availableAgents = Array.from(this.agents.values()).filter(agent => 
      agent.status === 'active' && !Array.from(this.runningTasks.values()).some(t => t.assignedAgent === agent.id)
    );

    // Simple selection logic - can be enhanced with more sophisticated matching
    switch (task.type) {
      case 'retrieve_documents':
        return availableAgents.find(agent => agent.capabilities.includes('semantic_search'));
      case 'understand_query':
        return availableAgents.find(agent => agent.capabilities.includes('query_understanding'));
      case 'synthesize_answer':
        return availableAgents.find(agent => agent.capabilities.includes('answer_synthesis'));
      case 'validate_sources':
        return availableAgents.find(agent => agent.capabilities.includes('source_validation'));
      default:
        return availableAgents.find(agent => agent.type === 'orchestration');
    }
  }

  private async executeTask(task: AgentTask, agent: Agent): Promise<any> {
    // This would contain the actual task execution logic
    // For now, simulate task execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      taskId: task.id,
      agentId: agent.id,
      executedAt: new Date(),
      result: `Task ${task.type} completed by ${agent.name}`
    };
  }

  getTaskStatus(taskId: string): AgentTask | undefined {
    return this.runningTasks.get(taskId) || 
           this.taskQueue.find(t => t.id === taskId) || 
           this.taskHistory.find(t => t.id === taskId);
  }

  getQueueStatus(): { queued: number; running: number; completed: number } {
    return {
      queued: this.taskQueue.length,
      running: this.runningTasks.size,
      completed: this.taskHistory.filter(t => t.status === 'completed').length
    };
  }

  async cancelTask(taskId: string): Promise<boolean> {
    // Remove from queue if pending
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.status = 'cancelled';
      task.completedAt = new Date();
      this.taskHistory.push(task);
      return true;
    }

    // Cancel if running (implementation depends on task execution)
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      // In a real implementation, this would interrupt the running task
      runningTask.status = 'cancelled';
      runningTask.completedAt = new Date();
      this.runningTasks.delete(taskId);
      this.taskHistory.push(runningTask);
      return true;
    }

    return false;
  }

  getAgentStatus(): Array<{ agent: Agent; tasksRunning: number }> {
    return Array.from(this.agents.values()).map(agent => ({
      agent,
      tasksRunning: Array.from(this.runningTasks.values()).filter(t => t.assignedAgent === agent.id).length
    }));
  }
}

export const agentOrchestrator = new AgentOrchestrator();