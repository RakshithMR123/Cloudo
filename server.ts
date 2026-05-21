import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Initialize Gemini Client
const aiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;

if (aiKey) {
  aiClient = new GoogleGenAI({
    apiKey: aiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(cors());

// --- DATABASE TYPES ---
interface Message {
  id: string;
  channelId: string;
  sender: {
    name: string;
    avatar: string;
    role: "user" | "assistant" | "system";
    email?: string;
  };
  content: string;
  timestamp: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  topic: string;
  type: "public" | "private" | "direct";
  unreadCount: number;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  reads: number;
  likes: number;
  publishedAt: string;
  featured: boolean;
}

// --- SIMULATED IN-MEMORY SUPABASE DATABASE ---
let channels: Channel[] = [
  {
    id: "general",
    name: "general-chat",
    description: "Welcome to Cloudo main chat channel.",
    topic: "Cloud Computing, Platform Updates & General Discussion",
    type: "public",
    unreadCount: 0,
  },
  {
    id: "cloud-engineering",
    name: "cloud-ops",
    description: "Connect with Dave for site reliability and infrastructure architecture advice.",
    topic: "Docker, Kubernetes, GCP, AWS, High Availability",
    type: "public",
    unreadCount: 0,
  },
  {
    id: "database-guru",
    name: "postgres-supabase",
    description: "Chat with Gary about relational models, query planning, indexing, and connection pooling.",
    topic: "PostgreSQL, Supabase, Migrations, Performance Tuning",
    type: "public",
    unreadCount: 2,
  },
  {
    id: "content-strategy",
    name: "editorial-copilot",
    description: "Brainstorm blog topics, compose engaging articles, and get SEO editorial suggestions from Zara.",
    topic: "Blog Strategy, Content Creation, Markdown Formatting",
    type: "public",
    unreadCount: 0,
  },
];

let messages: Message[] = [
  {
    id: "m1",
    channelId: "general",
    sender: {
      name: "Cloud System",
      avatar: "⚡",
      role: "system",
    },
    content: "Database migration successfully completed. Active pools connected on Supabase Postgres. 12 shards active.",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "m2",
    channelId: "general",
    sender: {
      name: "Rakshith (You)",
      avatar: "👨‍💻",
      role: "user",
      email: "rakshithmr357@gmail.com",
    },
    content: "Awesome, let's verify if the connection pooling is handling high load seamlessly.",
    timestamp: new Date(Date.now() - 3600000 * 2.8).toISOString(),
  },
  {
    id: "m3",
    channelId: "general",
    sender: {
      name: "Gary (DB Guru)",
      avatar: "💾",
      role: "assistant",
    },
    content: "Absolutely, connection pool parameters are optimized using pgBouncer in transaction mode. We are scale-testing with 10,000 concurrent virtual clients right now!",
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
  },
  {
    id: "m4",
    channelId: "cloud-engineering",
    sender: {
      name: "System Ops Dave",
      avatar: "🚀",
      role: "assistant",
    },
    content: "Hello! I am Dave, your Cloud Infrastructure Architect. Ask me about deploying serverless stacks, scaling container pods, multi-region failovers, or configuring CI/CD pipelines.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "m5",
    channelId: "database-guru",
    sender: {
      name: "Gary (DB Guru)",
      avatar: "💾",
      role: "assistant",
    },
    content: "Welcome to the database sanctuary. Ask me your complex join queries, index optimizations, Row-Level Security (RLS) configurations, or real-time Postgres subscription questions.",
    timestamp: new Date(Date.now() - 360000 * 5).toISOString(),
  },
  {
    id: "m6",
    channelId: "content-strategy",
    sender: {
      name: "Zara (Content Strategist)",
      avatar: "🖋️",
      role: "assistant",
    },
    content: "Hey content creators! I am Zara. Ask me to outline a dev-focused blog article, expand headings, write clear copy, or clean up technical explanations for your blog.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

let blogPosts: BlogPost[] = [
  {
    id: "post-1",
    title: "Scaling Next.js with Supabase Realtime Channels",
    slug: "scaling-nextjs-supabase-realtime",
    excerpt: "Learn how to optimize broadcast listeners and handle over 50,000 concurrent viewers in a collaborative chat using Postgres dynamic subscriptions.",
    content: `## The Challenge of Mass Real-time Subscriptions

Modern SaaS apps demand immediate data sync. When building a collaborative platform, matching that user experience while keeping resource usage under control is the holy grail. Supabase provides an exceptional solution on top of PostgreSQL using **WAL (Write-Ahead Logging)** extraction.

However, once you pass **10,000 concurrent listeners**, connecting client websockets directly to standard transactional tables can overwhelm database resource constraints.

### 1. Enable Connection Pooling
Never let direct client actions create long-running database transactions. Use pgBouncer on port \`6543\` with **Transaction Pooling** rather than direct connection strings.

\`\`\`sql
-- Example to configure optimized pooling read stats
SELECT pool_port, max_connections, current_connections 
FROM supabase_admin.pool_status;
\`\`\`

### 2. Isolate Realtime Tables
Keep your chat messages or fast-mutating rows in a slim, fully indexed table. Only replicate necessary columns through Postgres CDC.

\`\`\`sql
-- Set replica identity to index (faster WAL processing)
ALTER TABLE messages REPLICA IDENTITY USING INDEX messages_pkey;
\`\`\`

### 3. Leverage Supabase broadcast channels
Instead of polling table changes (database writes), rely on **Broadcast Channels**. Broadcasters distribute transient states (like "Dave is typing..." or mouse positions) directly through WebSockets without ever touching Postgres disks!

### Summary

With pgBouncer managing active database pipes, server-side caching, and Broadcast Channels, your app scales to handle massive populations without breaking your database budget.`,
    category: "Cloud Architecture",
    tags: ["Next.js", "Supabase", "PostgreSQL", "Realtime"],
    author: {
      name: "Gary (DB Guru)",
      avatar: "💾",
      role: "Database Architect",
    },
    reads: 1240,
    likes: 89,
    publishedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString().slice(0, 10),
    featured: true,
  },
  {
    id: "post-2",
    title: "A Practical Guide to Postgres Row-Level Security (RLS)",
    slug: "practical-guide-postgres-rls",
    excerpt: "Demystifying RLS policies for multi-tenant applications. Create secure workspace isolations directly inside the SQL engine.",
    content: `## Row-Level Security: Security at the SQL Layer

In traditional architectures, data safety checks are hardcoded in the application backend. One missing \`where\` clause in a single API route can expose tenant records to unauthorized users. 

**Row-Level Security (RLS)** in PostgreSQL fundamentally shifts this security model by embedding user boundary controls directly within the database engine itself.

### The Anatomy of an RLS Policy

Let's inspect a secure, multi-tenant Workspace model:

\`\`\`sql
-- 1. Enable RLS on the table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 2. Create the tenant policy
CREATE POLICY document_tenant_isolation ON documents
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (select auth.jwt() ->> 'tenant_id')
  )
  WITH CHECK (
    tenant_id = (select auth.jwt() ->> 'tenant_id')
  );
\`\`\`

### Common Pitfalls and performance fixes

1. **Avoid Subqueries in Policies**: Subqueries in your SQL check clauses will run on *every single row* of a table scan. Instead, leverage Postgres variables or custom claims tucked directly inside JWT context.
2. **Always Index Isolation Keys**: Ensure \`tenant_id\` or \`user_id\` has a B-Tree index to avoid full table scans.
3. **Use Bypass Roles Properly**: The table owner role has RLS bypassed by default. Ensure your application connections run as a restricted client role (\`authenticated\` or \`anon\`) to enforce policies consistently.`,
    category: "Database Security",
    tags: ["PostgreSQL", "Supabase", "Security", "Backend"],
    author: {
      name: "System Ops Dave",
      avatar: "🚀",
      role: "Cloud DevOps Lead",
    },
    reads: 955,
    likes: 64,
    publishedAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString().slice(0, 10),
    featured: false,
  },
];

// --- AI AGENT SYSTEM INSTRUCTIONS ---
const PERSONA_PROMPTS: Record<string, string> = {
  "cloud-engineering": `You are DevOps Dave, a senior Cloud Infrastructure Architect. 
Your tone is highly engineering-focused, deeply practical, and expert-level. 
Provide real code blocks, architecture configurations, or command snippets (Docker, K8s, Terraform, terraform scripts, GCP/AWS gcloud actions) to back your instructions.
Always keep solutions focused on scalability, high availability (HA), security, and cost efficiency. Use crisp formatting.`,

  "database-guru": `You are Gary, a world-class PostgreSQL DBA and Supabase specialist.
Your tone is passionate about relational math, SQL performance, indexing, and connection pools.
Your explanations are highly precise. Offer efficient SQL queries (explain plans, raw DDL, indexes, vacuum tuning commands) where relevant. Explanations should show real production wisdom. Use clean markdown code tags.`,

  "content-strategy": `You are Zara, a premium Chief Technical Writer and Blog Content Strategist.
Help users craft stellar technical blog posts, refine technical prose, suggest catchy and high-CTR titles, outline documentation pages, or correct spelling/grammar.
Your tone is encouraging, refined, articulate, and professional. Write beautifully organized text with clear modular highlights.`,

  general: `You are the core Cloud Platform Copilot. 
You are friendly, smart, highly responsive, and capable of assisting with anything regarding cloud development, general programming, and blog publication.`,
};

// --- HTTP API ROUTE HANDLERS ---

// 1. Get health status & DB simulate metrics
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// 2. Mock Cloud Database Stats for Scaling & Live Visibility
app.get("/api/db-stats", (req, res) => {
  // Generate highly realistic, dynamic postgres/pooling/scaling metrics
  const activePoolConnectionCount = Math.floor(12 + Math.random() * 6);
  const cacheHitRate = 99.45 + Math.random() * 0.15;
  const queriesPerSecond = Math.floor(150 + Math.random() * 120);
  const replicaLagMs = Math.floor(5 + Math.random() * 15);
  
  res.json({
    engine: "PostgreSQL 16.2 (hosted via Supabase Dedicated)",
    shards: 12,
    totalTableSizeMB: 1842.8,
    activePoolConnections: activePoolConnectionCount,
    poolLimit: 151,
    cacheHitRatePercent: parseFloat(cacheHitRate.toFixed(2)),
    queriesPerSecond,
    replicaLagMilliseconds: replicaLagMs,
    cpuUtilizationPercent: Math.floor(22 + Math.random() * 12),
    openSessionsCount: 42000,
    isDistributedSchemaEnabled: true,
  });
});

// 3. Channels GET/POST
app.get("/api/chat/channels", (req, res) => {
  res.json(channels);
});

app.post("/api/chat/channels", (req, res) => {
  const { name, description, topic } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const cleanedName = name.replace(/\s+/g, "-").toLowerCase();
  const newChannel: Channel = {
    id: `channel-${Date.now()}`,
    name: cleanedName,
    description: description || "User created topic channel",
    topic: topic || "General talk",
    type: "public",
    unreadCount: 0,
  };

  channels.push(newChannel);
  res.status(201).json(newChannel);
});

// 4. Messages GET/POST
app.get("/api/chat/messages/:channelId", (req, res) => {
  const { channelId } = req.params;
  const channelMessages = messages.filter((m) => m.channelId === channelId);
  res.json(channelMessages);
});

app.post("/api/chat/messages/:channelId", async (req, res) => {
  const { channelId } = req.params;
  const { content, senderName } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  // Save user's message
  const userMessage: Message = {
    id: `msg-${Date.now()}`,
    channelId,
    sender: {
      name: senderName || "Developer Visitor",
      avatar: "👨‍💻",
      role: "user",
      email: "rakshithmr357@gmail.com",
    },
    content,
    timestamp: new Date().toISOString(),
  };

  messages.push(userMessage);

  // Check if it's an AI-monitored channel or direct assistant
  const isAiChannel = ["cloud-engineering", "database-guru", "content-strategy", "general"].includes(channelId);

  if (isAiChannel && aiClient) {
    try {
      const persona = PERSONA_PROMPTS[channelId] || PERSONA_PROMPTS.general;
      const agentDetails = {
        "cloud-engineering": { name: "System Ops Dave", avatar: "🚀" },
        "database-guru": { name: "Gary (DB Guru)", avatar: "💾" },
        "content-strategy": { name: "Zara (Content Strategist)", avatar: "🖋️" },
        general: { name: "Cloud Copilot", avatar: "⚡" },
      }[channelId] || { name: "Cloud Copilot", avatar: "⚡" };

      // Fetch the last 15 messages in the channel to give Gemini conversation memory.
      const history = messages
        .filter((m) => m.channelId === channelId)
        .slice(-15)
        .map((m) => {
          const roleLabel = m.sender.role === "user" ? "user" : "model";
          return `${m.sender.name} (${roleLabel}): ${m.content}`;
        })
        .join("\n");

      const systemPrompt = `
      ${persona}
      
      You are participating in a group chat/interaction inside the Cloudo Cloud Platform.
      Keep your answer technical, direct, and exceptionally insightful.
      Never mention system internals or larp. Offer high performance, production-ready, highly-interactive code.

      Chat Conversation Stats context:
      - Channel ID: ${channelId}
      - Current Channel Topic: ${channels.find(c => c.id === channelId)?.topic || ""}
      - User Email context: rakshithmr357@gmail.com

      Recent message flow context:
      ${history}

      Respond strictly as the agent "${agentDetails.name}". Please generate your reply now.
      `;

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: systemPrompt,
      });

      const replyContent = response.text || "I was unable to process this request. Check database stats.";

      const aiMessage: Message = {
        id: `msg-ai-${Date.now()}`,
        channelId,
        sender: {
          name: agentDetails.name,
          avatar: agentDetails.avatar,
          role: "assistant",
        },
        content: replyContent,
        timestamp: new Date().toISOString(),
      };

      messages.push(aiMessage);
      return res.status(201).json({ userMessage, aiMessage });
    } catch (err: any) {
      console.error("Gemini AI API Error:", err);
      const errMessage: Message = {
        id: `msg-err-${Date.now()}`,
        channelId,
        sender: {
          name: "Cloud System Error Analyzer",
          avatar: "⚠️",
          role: "system",
        },
        content: `Could not invoke Gemini API server-side: ${err.message || err}. Ensure GEMINI_API_KEY is configured in your Settings > Secrets panel.`,
        timestamp: new Date().toISOString(),
      };
      messages.push(errMessage);
      return res.status(201).json({ userMessage, aiMessage: errMessage });
    }
  } else {
    // If no AI client, return dynamic simulation reply after 1s
    if (channelId === "general") {
      setTimeout(() => {
        messages.push({
          id: `msg-mock-${Date.now()}`,
          channelId,
          sender: {
            name: "Cloud Bot Simulator",
            avatar: "🤖",
            role: "assistant",
          },
          content: "API Key not detected or loaded yet. This mock replier represents successful endpoint routing! To activate the AI Dave, Gary and Zara personalities, provide your GEMINI_API_KEY in Settings.",
          timestamp: new Date().toISOString(),
        });
      }, 500);
    }
  }

  res.status(201).json({ userMessage });
});

// 5. Blogs GET/POST/PUT/DELETE
app.get("/api/blog/posts", (req, res) => {
  res.json(blogPosts);
});

app.get("/api/blog/posts/:id", (req, res) => {
  const post = blogPosts.find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }
  res.json(post);
});

app.post("/api/blog/posts", (req, res) => {
  const { title, excerpt, content, category, tags, featured } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");

  const newPost: BlogPost = {
    id: `post-${Date.now()}`,
    title,
    slug,
    excerpt: excerpt || content.slice(0, 150) + "...",
    content,
    category: category || "Enterprise Cloud",
    tags: tags || ["GCP"],
    author: {
      name: "Rakshith (Lead Dev)",
      avatar: "👨‍💻",
      role: "Lead Platform Creator",
    },
    reads: 0,
    likes: 0,
    publishedAt: new Date().toISOString().slice(0, 10),
    featured: featured || false,
  };

  blogPosts.unshift(newPost);
  res.status(201).json(newPost);
});

app.put("/api/blog/posts/:id", (req, res) => {
  const { id } = req.params;
  const idx = blogPosts.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const updated = {
    ...blogPosts[idx],
    ...req.body,
    // Avoid overriding id or author unless wanted
  };

  blogPosts[idx] = updated;
  res.json(updated);
});

app.delete("/api/blog/posts/:id", (req, res) => {
  const { id } = req.params;
  const initialLen = blogPosts.length;
  blogPosts = blogPosts.filter((p) => p.id !== id);

  if (blogPosts.length === initialLen) {
    return res.status(404).json({ error: "Post not found" });
  }
  res.json({ success: true, message: "Blog post deleted successfully" });
});

// 6. Gemini-powered content assistant
app.post("/api/blog/generate", async (req, res) => {
  const { prompt, action, topic, category } = req.body;

  if (!aiClient) {
    return res.status(503).json({
      error: "Gemini client not initialized. Please verify your GEMINI_API_KEY environment variable is present under Settings.",
    });
  }

  try {
    let systemInstruction = "You are Zara, the legendary Chief Technical Writer for Cloudo Technical Blog Platform.";
    let finalPrompt = "";

    if (action === "outline") {
      finalPrompt = `Create a highly structured blog post outline targeting the technical developers, topic: "${topic}" under the category "${category}". Provide beautiful suggestions for titles, sections, and brief summaries of what each item covers. Max output 400 words.`;
    } else if (action === "generate") {
      finalPrompt = `Compose a full, highly premium, ready-to-publish technical blog article in markdown format about the topic: "${topic}". Use the category "${category}". Include elegant headers (H2, H3), lists, realistic code blocks (SQL, TypeScript, Docker, etc.), and a robust technical summary. Make sure the technical depth is professional. Desired prompt guidelines specified by the user: "${prompt}".`;
    } else if (action === "refine") {
      finalPrompt = `Rewrite the following draft to have extreme editorial polish, engaging transitions, and optimized SEO density. Keep all technical terms, correct spelling on generic errors, and outline clear markdown snippets: \n\n"${prompt}"`;
    } else {
      finalPrompt = `Give general cloud advisory content for: "${prompt}"`;
    }

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("Gemini blog generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content via Gemini API" });
  }
});


// --- CLIENT DEV-PROD BUILD ROUTER ---
const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Production assets serving from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on host 0.0.0.0 and port ${PORT}`);
    console.log(`Loaded Gemini status: ${aiClient ? "Connected" : "API key missing (Mock Mode active)"}`);
  });
}

startServer();
