# CDP Wordle - Blockchain-Powered Word Game with X402 Payments

A decentralized Wordle game built with [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/) that integrates [AgentKit](https://github.com/coinbase/agentkit) for AI-driven interactions and [X402](https://github.com/coinbase/x402) for seamless micropayments.

## 🎮 Features

- **Classic Wordle Gameplay**: 6 attempts to guess a 5-letter word with color-coded feedback
- **Blockchain Integration**: CDP-powered wallets for secure identity and payments
- **X402 Micropayments**: Pay with USDC for hints using the X402 payment protocol
- **AI Chat Assistant**: Powered by AgentKit for game help and wallet operations
- **Passkey Authentication**: Secure, passwordless login via Passage
- **Real-time Balance Tracking**: ETH and USDC balance monitoring
- **Testnet Faucet Integration**: Request Base Sepolia testnet funds
- **Detailed Payment Tracking**: See X402 payment process including EIP-712 signing

## 🛠 Technologies Used

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain**: Coinbase Developer Platform (CDP), Base Sepolia Testnet
- **Payments**: X402 Protocol with EIP-712 signing
- **AI**: OpenAI GPT with AgentKit
- **Authentication**: Passage (Passkey-based)
- **Styling**: Tailwind CSS with dark mode support

## 🚀 Getting Started

### Prerequisites

1. **Node.js 18+** and npm
2. **OpenAI API Key** for the AI chat assistant
3. **Passage Account** for authentication ([Create here](https://console.passage.id/))
4. **CDP API Keys** for blockchain operations ([Get here](https://portal.cdp.coinbase.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/cdp-wordle.git
   cd cdp-wordle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   touch .env.local
   ```

   Configure the following in `.env.local`:

   ```bash
   # OpenAI Configuration
   # Get keys from OpenAI Platform: https://platform.openai.com/api-keys
   OPENAI_API_KEY=sk-proj-your_openai_api_key_here
   
   # CDP Configuration 
   # Get keys from CDP Portal: https://portal.cdp.coinbase.com/
   CDP_API_KEY_ID=your_cdp_api_key_id_here
   CDP_API_KEY_SECRET=your_cdp_api_key_secret_here
   CDP_WALLET_SECRET=your_cdp_wallet_secret_here
   CDP_API_KEY_NAME=organizations/your_org_id/apiKeys/your_key_id
   CDP_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nyour_private_key_here\n-----END EC PRIVATE KEY-----\n"
   
   # Passage Authentication
   # Get from Passage Console: https://console.passage.id/
   PASSAGE_APP_ID=your_passage_app_id
   PASSAGE_API_KEY=your_passage_api_key
   
   # Optional Configuration
   NETWORK_ID=base-sepolia
   ```

   **🚨 CRITICAL SECURITY WARNINGS**: 
   - **NEVER commit these keys to version control**
   - **NEVER share these keys publicly, in screenshots, or in messages**
   - **Regenerate ALL keys immediately if they become exposed**
   - **Keep your `.env.local` file in your `.gitignore**
   - **Use different keys for development and production environments**

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How to Play

### Getting Started
1. **Authenticate**: Click "Login" and use your passkey to authenticate via Passage
2. **Get Funds**: Use the "Get Funds" button to request Base Sepolia testnet tokens (ETH for gas, USDC for gameplay)
3. **Start Playing**: Say "start wordle" in the chat to begin a new game

### Gameplay
1. **Make Guesses**: Type 5-letter words in the chat or use the virtual keyboard
2. **Get Feedback**: Letters are color-coded:
   - 🟩 **Green**: Correct letter in correct position
   - 🟨 **Yellow**: Correct letter in wrong position
   - ⬜ **Gray**: Letter not in the word
3. **Get Hints**: Click "Get Hint" to purchase a hint with USDC via X402 payments
4. **Win or Learn**: You have 6 attempts to guess the word!

### X402 Payment Features
When you purchase a hint, you'll see detailed payment information including:
- CDP account creation status
- Viem adapter initialization
- X402 payment attempt details
- EIP-712 signing events
- Payment success confirmation

## 🔧 Configuration

### Passage Setup
1. Create an account at [Passage Console](https://console.passage.id/)
2. Create a new app and note your App ID
3. Configure your domain settings
4. Add your API key for server-side operations

### CDP Setup
1. Visit [CDP Portal](https://portal.cdp.coinbase.com/)
2. Create API keys for your project
3. Generate a wallet secret for server-side wallet operations
4. Ensure your keys have Base Sepolia testnet access

### AgentKit Configuration
The AI agent is configured in:
- `/app/api/agent/route.ts` - Main agent logic
- Game state management in `/app/services/gameState.ts`
- Custom Wordle-specific responses and game logic

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── agent/          # AgentKit AI chat endpoints
│   │   ├── auth/           # Passage authentication
│   │   ├── payment-hint/   # X402 payment for hints
│   │   ├── wallet/         # CDP wallet operations
│   │   └── request-testnet-funds/ # Faucet integration
│   ├── components/         # React components
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Business logic and API clients
│   ├── types/             # TypeScript type definitions
│   └── styles/            # CSS and styling
├── public/                # Static assets
└── README.md
```

## 🔑 Key Components

### Payment System
- **X402 Integration**: Seamless USDC payments for hints
- **EIP-712 Signing**: Secure transaction authorization
- **CDP Viem Adapter**: Bridges CDP SDK with viem for X402 compatibility

### Game Logic
- **Shared State**: Consistent game state between AI agent and payment endpoints
- **Word Validation**: 5-letter word checking with feedback
- **Hint Generation**: Random letter hints for the target word

### AI Assistant
- **Game Help**: Explains rules and provides guidance
- **Wallet Operations**: Balance checking and fund requests
- **Context Awareness**: Understands game state and user needs

## 🌐 Network Information

- **Blockchain**: Base Sepolia Testnet
- **USDC Contract**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Faucets**: 
  - ETH: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
  - USDC: Integrated via "Get Funds" button

## 🔒 Security Considerations

- **Environment Variables**: Never commit API keys to version control
- **Client-Side Safety**: Sensitive operations handled server-side
- **Passkey Security**: Secure, phishing-resistant authentication
- **Payment Safety**: X402 ensures secure micropayment processing

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Setup
Ensure all environment variables are configured in your production environment:
- OpenAI API key
- Passage app credentials
- CDP API keys
- Any additional configuration

## 🤝 Contributing

Contributions are welcome! This project demonstrates:
- CDP SDK integration
- X402 payment protocol implementation
- AgentKit AI assistant development
- Passkey authentication flows

## 📚 Learn More

- [Coinbase Developer Platform](https://docs.cdp.coinbase.com/)
- [AgentKit Documentation](https://docs.cdp.coinbase.com/agentkit/docs/welcome)
- [X402 Payment Protocol](https://github.com/coinbase/x402)
- [Passage Authentication](https://docs.passage.id/)
- [Next.js Documentation](https://nextjs.org/docs)

## 📄 License

This project is built for educational and demonstration purposes, showcasing the integration of modern blockchain technologies for gaming applications.

---

**Built with ❤️ using Coinbase Developer Platform**
