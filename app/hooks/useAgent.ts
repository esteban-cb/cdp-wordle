import { useState, useCallback } from "react";
import { AgentRequest, AgentResponse } from "../types/api";
import { NetworkConfig } from "../types/wordle";

/**
 * Sends a user message to the AgentKit backend API and retrieves the agent's response.
 *
 * @async
 * @function callAgentAPI
 * @param {string} userMessage - The message sent by the user.
 * @param {NetworkConfig} network - The current network configuration.
 * @returns {Promise<string | null>} The agent's response message or `null` if an error occurs.
 *
 * @throws {Error} Logs an error if the request fails.
 */
async function messageAgent(
  userMessage: string,
  network?: NetworkConfig
): Promise<AgentResponse | null> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage,
        network: network?.id,
      } as AgentRequest),
    });

    const data = (await response.json()) as AgentResponse;
    return data;
  } catch (error) {
    console.error("Error communicating with agent:", error);
    return null;
  }
}

/**
 *
 * This hook manages interactions with the AI agent by making REST calls to the backend.
 * It also stores the local conversation state, tracking messages sent by the user and
 * responses from the agent.
 *
 * #### How It Works
 * - `sendMessage(input, network)` sends a message to `/api/agent` and updates state.
 * - `messages` stores the chat history.
 * - `isThinking` tracks whether the agent is processing a response.
 * - `clearMessages()` clears the conversation history.
 *
 * #### See Also
 * - The API logic in `/api/agent.ts`
 *
 * @param network The current network configuration
 * @returns {object} An object containing:
 * - `messages`: The conversation history.
 * - `sendMessage`: A function to send a new message.
 * - `isThinking`: Boolean indicating if the agent is processing a response.
 * - `clearMessages`: A function to clear the conversation history.
 */
export function useAgent(network?: NetworkConfig) {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "agent" }[]
  >([]);
  const [isThinking, setIsThinking] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState<{
    action: string;
    cost: string;
  } | null>(null);

  /**
   * Sends a user message, updates local state, and retrieves the agent's response.
   *
   * @param {string} input - The message from the user.
   */
  const sendMessage = async (input: string) => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, sender: "user" }]);
    setIsThinking(true);

    const agentResponse = await messageAgent(input, network);

    if (agentResponse) {
      const responseText = agentResponse.response ?? agentResponse.error ?? "No response";
      
      setMessages((prev) => [
        ...prev,
        { text: responseText, sender: "agent" },
      ]);

      // Handle payment requirements
      if (agentResponse.requiresPayment && agentResponse.paymentAction && agentResponse.cost) {
        setPaymentRequired({
          action: agentResponse.paymentAction,
          cost: agentResponse.cost,
        });
      }
    }

    setIsThinking(false);
  };

  /**
   * Clears all messages from the conversation history.
   * Useful for resetting the chat session when user logs out.
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsThinking(false);
    setPaymentRequired(null);
  }, []);

  /**
   * Clears the payment requirement state.
   */
  const clearPaymentRequired = useCallback(() => {
    setPaymentRequired(null);
  }, []);

  return { messages, sendMessage, isThinking, clearMessages, paymentRequired, clearPaymentRequired };
}
