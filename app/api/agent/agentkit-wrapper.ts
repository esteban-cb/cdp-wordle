// Wrapper for AgentKit to handle initialization safely
import { getVercelAITools } from "@coinbase/agentkit-vercel-ai-sdk";

let agentKitTools: any = null;
let agentKitSystem: string = "";

export async function initializeAgentKit(networkId: string = "base-sepolia") {
  try {
    console.log("Starting AgentKit initialization for network:", networkId);
    
    // Dynamic import to avoid build issues
    console.log("Importing prepare-agentkit module...");
    const { prepareAgentkitAndWalletProvider } = await import("./prepare-agentkit");
    
    console.log("Calling prepareAgentkitAndWalletProvider...");
    const { agentkit, walletProvider } = await prepareAgentkitAndWalletProvider(networkId);
    console.log("AgentKit and wallet provider initialized");
    
    // Initialize AgentKit tools
    agentKitTools = getVercelAITools(agentkit);
    
    // Create system prompt for AgentKit
    const canUseFaucet = walletProvider.getNetwork().networkId === "base-sepolia";
    const faucetMessage = "If you ever need funds, you can request them from the faucet.";
    const cantUseFaucetMessage = "If you need funds, you can provide your wallet details and request funds from the user.";
    
    agentKitSystem = `
      You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
      empowered to interact onchain using your tools. ${canUseFaucet ? faucetMessage : cantUseFaucetMessage}.
      Before executing your first action, get the wallet details to see what network 
      you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone 
      asks you to do something you can't do with your currently available tools, you must say so, and 
      encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to 
      docs.cdp.coinbase.com for more information. Be concise and helpful with your responses. Refrain from 
      restating your tools' descriptions unless it is explicitly requested.
    `;
    
    console.log("AgentKit initialized successfully");
    return { tools: agentKitTools, system: agentKitSystem };
  } catch (error) {
    console.error("Failed to initialize AgentKit:", error);
    return { tools: {}, system: "" };
  }
}

export function getAgentKitTools() {
  return agentKitTools || {};
}

export function getAgentKitSystem() {
  return agentKitSystem;
}