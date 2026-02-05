import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage, ToolMessage, AIMessageChunk } from '@langchain/core/messages';
import { Annotation, StateGraph, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from '@langchain/tavily';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { createUrlFetcherTool } from './tools/urlFetcher.tool.js';
import dotenv from 'dotenv';
dotenv.config();

export interface SSEEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'message' | 'done' | 'error';
  data: unknown;
}

// Define the agent state schema using Annotation
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
});

// Type alias for state
type AgentStateType = typeof AgentState.State;

export class ChatAgent {
  private model: ChatOpenAI;
  private tools: StructuredToolInterface[];
  private graph: ReturnType<typeof this.buildGraph>;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY is missing from environment variables");
    }

    this.model = new ChatOpenAI({
      apiKey: apiKey,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
      modelName: 'openai/gpt-4o',
      streaming: true,
      temperature: 0.7,
    });

    this.tools = [
      new TavilySearch({
        tavilyApiKey: process.env.TAVILY_API_KEY || "",
        maxResults: 3,
      }),
      createUrlFetcherTool(),
    ];

    this.graph = this.buildGraph();
  }

  private buildGraph() {
    // Bind tools to the model
    const modelWithTools = this.model.bindTools(this.tools);

    // Agent node - calls the LLM
    const agentNode = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
      const response = await modelWithTools.invoke(state.messages);
      return { messages: [response] };
    };

    // Tool node - executes tools using LangGraph's ToolNode
    const toolNode = new ToolNode(this.tools);

    // Conditional edge - determine if we should continue to tools or end
    function shouldContinue(state: AgentStateType): "tools" | "__end__" {
      const lastMessage = state.messages[state.messages.length - 1];
      
      // If the LLM makes a tool call, route to the tool node
      if (lastMessage && 'tool_calls' in lastMessage && 
          Array.isArray(lastMessage.tool_calls) && 
          lastMessage.tool_calls.length > 0) {
        return "tools";
      }
      
      // Otherwise we're done
      return "__end__";
    }

    // Build the graph with StateGraph
    const workflow = new StateGraph(AgentState)
      .addNode("agent", agentNode)
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent"); // After tools, go back to agent for response

    return workflow.compile();
  }

  async *stream(messages: BaseMessage[]): AsyncGenerator<SSEEvent> {
    try {
      const initialState = { messages };
      
      // Stream events from the compiled StateGraph
      const eventStream = this.graph.streamEvents(
        initialState,
        { version: 'v2' }
      );

      for await (const event of eventStream) {
        // Handle token streaming from the LLM
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data?.chunk as AIMessageChunk | undefined;
          if (chunk?.content && typeof chunk.content === 'string') {
            yield {
              type: 'token',
              data: chunk.content,
            };
          }
        }
        
        // Handle tool execution start
        else if (event.event === 'on_tool_start') {
          yield {
            type: 'tool_start',
            data: {
              toolName: event.name || 'unknown_tool',
              input: event.data?.input,
            },
          };
        }
        
        // Handle tool execution end
        else if (event.event === 'on_tool_end') {
          yield {
            type: 'tool_end',
            data: {
              toolName: event.name || 'tavily_search',
              output: event.data?.output,
            },
          };
        }
      }

      yield {
        type: 'done',
        data: { success: true },
      };
    } catch (error) {
      console.error('Agent stream error:', error);
      yield {
        type: 'error',
        data: { 
          message: error instanceof Error ? error.message : 'Unknown error occurred' 
        },
      };
    }
  }

  async invoke(messages: BaseMessage[]): Promise<BaseMessage[]> {
    const result = await this.graph.invoke({ messages });
    return result.messages;
  }
}

export function convertToLangChainMessages(messages: Array<{
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
}>): BaseMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
        return new AIMessage(msg.content);
      case 'tool':
        return new ToolMessage({
          content: msg.content,
          tool_call_id: (msg.metadata?.toolCallId as string) || 'unknown',
        });
      default:
        return new HumanMessage(msg.content);
    }
  });
}

// Singleton instance
let agentInstance: ChatAgent | null = null;

export function getChatAgent(): ChatAgent {
  if (!agentInstance) {
    agentInstance = new ChatAgent();
  }
  return agentInstance;
}