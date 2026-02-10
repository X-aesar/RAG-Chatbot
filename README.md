# RAG Chatbot

A modern Retrieval-Augmented Generation (RAG) chatbot built with Next.js, TypeScript, and OpenAI. Upload PDF documents and chat with them using advanced AI capabilities.

## Features

- 📄 **PDF Upload & Processing**: Upload PDF documents and automatically chunk them for optimal retrieval
- 🔍 **Vector Search**: Advanced semantic search using OpenAI embeddings and pgvector
- 💬 **Intelligent Chat**: Context-aware responses with source citations
- 👤 **User Authentication**: Secure user management with Clerk
- 📊 **Document Management**: View and manage your uploaded documents
- 🚀 **Real-time Streaming**: Fast, responsive chat with streaming responses
- 🎨 **Modern UI**: Beautiful interface built with Tailwind CSS and Radix UI

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Neon, pgvector for similarity search
- **AI/ML**: OpenAI GPT-4o-mini for chat, text-embedding-3-small for embeddings
- **Authentication**: Clerk
- **UI Components**: Radix UI, Lucide Icons

## Prerequisites

- Node.js 18+ 
- PostgreSQL database with pgvector extension (recommended: Neon)
- OpenAI API key
- Clerk authentication setup

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd rag
npm install
```

### 2. Environment Variables

Copy the environment template:

```bash
cp .env.example .env.local
```

Fill in your environment variables:

```env
# Database
NEON_DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your-clerk-publishable-key"
CLERK_SECRET_KEY="sk_test_your-clerk-secret-key"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
```

### 3. Database Setup

1. Create a PostgreSQL database with pgvector extension (recommended: [Neon](https://neon.tech/))
2. Run database migrations:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 4. Clerk Configuration

1. Sign up at [Clerk](https://clerk.com/)
2. Create a new application
3. Configure your sign-in/sign-up methods
4. Add your application URLs to Clerk's allowed origins
5. Copy your Clerk keys to the environment variables

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## How to Use

1. **Sign Up/Sign In**: Create an account or sign in to access the application
2. **Upload Documents**: Go to the Upload page to add PDF documents (max 10MB per file)
3. **Chat with Documents**: Visit the Chat page to ask questions about your uploaded documents
4. **Manage Documents**: Use the Documents page to view and delete your uploaded files

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── chat/          # Chat interface
│   ├── documents/     # Document management
│   ├── upload/        # PDF upload functionality
│   └── page.tsx       # Landing page
├── components/        # Reusable UI components
├── lib/              # Utility functions and configurations
│   ├── db-schema.ts   # Database schema
│   ├── embeddings.ts  # OpenAI embeddings
│   ├── search.ts      # Vector search functionality
│   └── chunking.ts    # Text splitting logic
└── migrations/       # Database migrations
```

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx drizzle-kit      # Database CLI commands
```

## Database Schema

The application uses the following main tables:

- **documents**: Stores document chunks with embeddings
- **conversations**: Chat conversation history
- **messages**: Individual chat messages with role and content

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Clerk Authentication](https://clerk.com/docs)
- [pgvector](https://github.com/pgvector/pgvector)

## Deploy

The easiest way to deploy is using [Vercel](https://vercel.com/new):

1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
