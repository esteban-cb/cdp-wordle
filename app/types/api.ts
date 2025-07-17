export type AgentRequest = {
  userMessage: string;
  network?: string;
};

export type AgentResponse = { response?: string; error?: string };
