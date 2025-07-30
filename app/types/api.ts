export type AgentRequest = {
  userMessage: string;
  network?: string;
};

export type AgentResponse = { 
  response?: string; 
  error?: string;
  requiresPayment?: boolean;
  paymentAction?: string;
  cost?: string;
};
