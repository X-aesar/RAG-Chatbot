import {streamText, UIMessage, convertToModelMessages, tool,InferUITools,UIDataTypes, stepCountIs} from "ai";
import{ openai} from "@ai-sdk/openai";
import {z} from "zod";
import { searchDocuments } from "@/lib/search";

const tools ={
    searchKnowledgeBase : tool({
        description: "Search the knowledge base for relevant information",
        inputSchema: z.object({
            query: z.string().describe("The search query to find relevant documents"),
        }),
        execute: async ({query})=>{
            console.log("Tool called with query:", query);
            try{
                const results = await searchDocuments(query,5,0.3)
                console.log("Search returned:", results.length, "results");

                if (results.length ===0){
                    console.log("No results found for query:", query);
                    return "No relevant information found in the knowledge base for this query.";
                }

                const formattedResults = results.map((result,index)=> `[${index+1}] ${result.content}`).join("\n\n");
                console.log("Formatted results length:", formattedResults.length);
                return formattedResults;



            }catch (error){
                console.error("Search error:", error);
                return "Error searching the knowledge base";
            }
        }
    })
}

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never,UIDataTypes,ChatTools>;

export async function POST(req:Request){
    try{
        const {messages}: {messages: ChatMessage[]} = await req.json();
        console.log("Chat API called with messages:", messages.length);

        const result = streamText({
            model: openai("gpt-4o-mini"),
            messages: await convertToModelMessages(messages),
            tools,
            system: `You are a helpful assistant with access to a knowledge base of uploaded documents.
            
IMPORTANT: For ANY question that asks about information that might be in the documents (names, people, data, etc.), you MUST use the searchKnowledgeBase tool first. Do not answer from general knowledge.
            
Steps:
1. If the user asks about specific information, search the knowledge base first
2. Use the search results to provide your answer
3. If no relevant information is found, clearly state that
4. Be concise and direct in your responses`,
            stopWhen: stepCountIs(2),

        });

        return result.toUIMessageStreamResponse();



    } catch(error){
        console.error("Error streaming response", error);
        return new Response ("Failed to stream response", {status:500});
    }
}


