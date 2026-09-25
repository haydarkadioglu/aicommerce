"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { relativeTime } from "@/lib/relative-time";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  Send,
  User as UserIcon,
  Plus,
  Loader2,
  Cpu,
  Zap,
  Clock,
  Trash2,
} from "lucide-react";

type Agent = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  category?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  isError?: boolean;
};

type Conversation = {
  id: string;
  agentKey: string;
  title: string | null;
  updatedAt: string;
};

export function AiAssistant() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("general");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agents
  useEffect(() => {
    (async () => {
      setAgentsLoading(true);
      try {
        const data = await apiFetch<{ agents: Agent[] }>("/api/ai/agents");
        setAgents(data.agents || []);
        if (data.agents?.length && !data.agents.find((a) => a.key === "general")) {
          setSelectedAgent(data.agents[0].key);
        }
      } catch (err: any) {
        toast({
          title: "Failed to load agents",
          description: err?.message,
          variant: "destructive",
        });
      } finally {
        setAgentsLoading(false);
      }
    })();
  }, [apiFetch, toast]);

  // Load conversation list
  const refreshConversations = async () => {
    try {
      const data = await apiFetch<{ conversations: Conversation[] }>(
        "/api/ai/conversations"
      );
      setConversations(data.conversations || []);
    } catch {
      // ignore
    }
  };

  // Load a single conversation's messages into the chat panel
  const loadConversation = async (conversationId: string) => {
    setMessages([]);
    setSending(false);
    try {
      const data = await apiFetch<{
        conversation: {
          id: string;
          agentKey: string;
          title: string | null;
          messages: Array<{
            id: string;
            role: string;
            content: string;
            model?: string | null;
            providerKey?: string | null;
            tokensIn: number;
            tokensOut: number;
            latencyMs: number;
            isError: boolean;
          }>;
        };
      }>(`/api/ai/conversations?conversationId=${conversationId}`);
      const conv = data.conversation;
      setActiveConversationId(conv.id);
      if (conv.agentKey) {
        setSelectedAgent(conv.agentKey);
      }
      setMessages(
        (conv.messages || [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            model: m.model || undefined,
            provider: m.providerKey || undefined,
            tokensIn: m.tokensIn,
            tokensOut: m.tokensOut,
            latencyMs: m.latencyMs,
            isError: m.isError,
          }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to load conversation",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await apiFetch(`/api/ai/conversations?conversationId=${conversationId}`, {
        method: "DELETE",
      });
      if (conversationId === activeConversationId) {
        newConversation();
      }
      refreshConversations();
      toast({ title: "Conversation deleted" });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    refreshConversations();
     
  }, [apiFetch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const placeholder: ChatMessage = {
      id: `p-${Date.now()}`,
      role: "assistant",
      content: "",
    };
    setMessages((m) => [...m, userMsg, placeholder]);
    setInput("");
    setSending(true);

    try {
      const data = await apiFetch<{
        content: string;
        model: string;
        provider: string;
        tokensIn: number;
        tokensOut: number;
        latencyMs: number;
        conversationId: string;
      }>(
        "/api/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({
            agentKey: selectedAgent,
            message: text,
            conversationId: activeConversationId,
          }),
        }
      );

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.content,
        model: data.model,
        provider: data.provider,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        latencyMs: data.latencyMs,
      };
      setMessages((m) => [...m.filter((x) => x.id !== placeholder.id), assistantMsg]);

      if (data.conversationId && data.conversationId !== activeConversationId) {
        setActiveConversationId(data.conversationId);
        refreshConversations();
      }
    } catch (err: any) {
      setMessages((m) => [
        ...m.filter((x) => x.id !== placeholder.id),
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `**Error:** ${err?.message || "Failed to get AI response."}`,
          isError: true,
        },
      ]);
      toast({
        title: "AI request failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const newConversation = () => {
    setActiveConversationId(undefined);
    setMessages([]);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const currentAgent = agents.find((a) => a.key === selectedAgent);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.isError);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg brand-gradient text-white">
            <Bot className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AI Assistant</span>
            <span className="text-xs text-muted-foreground">
              {currentAgent?.name || "Select an agent"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {agentsLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger size="sm" className="w-40 sm:w-52">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.key}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={newConversation}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </div>
      </div>

      {/* Body: messages + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar of conversations */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r flex-col">
          <div className="p-3 border-b">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent conversations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No conversations yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => loadConversation(c.id)}
                      className={
                        "group w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors " +
                        (c.id === activeConversationId ? "bg-accent" : "")
                      }
                    >
                      <div className="flex items-center gap-1">
                        <p className="truncate flex-1 font-medium">
                          {c.title || `${c.agentKey} chat`}
                        </p>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(c.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              deleteConversation(c.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 rounded"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="size-3.5" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(c.updatedAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto scroll-thin p-4">
            {messages.length === 0 ? (
              <EmptyState
                agentName={currentAgent?.name}
                agentDesc={currentAgent?.description}
              />
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Meta footer */}
          {lastAssistant && (
            <div className="border-t bg-muted/30 px-4 py-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {lastAssistant.model && (
                <span className="flex items-center gap-1">
                  <Cpu className="size-3" />
                  {lastAssistant.model}
                </span>
              )}
              {lastAssistant.provider && (
                <Badge variant="outline" className="text-[10px] h-4">
                  {lastAssistant.provider}
                </Badge>
              )}
              {(lastAssistant.tokensIn || lastAssistant.tokensOut) && (
                <span className="flex items-center gap-1">
                  <Zap className="size-3" />
                  {(lastAssistant.tokensIn ?? 0) + (lastAssistant.tokensOut ?? 0)} tokens
                </span>
              )}
              {lastAssistant.latencyMs !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {lastAssistant.latencyMs} ms
                </span>
              )}
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3 bg-background">
            <div className="max-w-3xl mx-auto flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message ${currentAgent?.name || "AI"}…`}
                rows={2}
                className="min-h-[44px] flex-1 resize-none"
                disabled={sending}
              />
              <Button
                onClick={send}
                disabled={sending || !input.trim()}
                className="brand-gradient text-white"
                size="icon"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Press <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> to send,{" "}
              <kbd className="rounded border bg-muted px-1 font-mono">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  agentName,
  agentDesc,
}: {
  agentName?: string;
  agentDesc?: string | null;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl brand-gradient text-white mb-4">
        <Bot className="size-7" />
      </div>
      <h3 className="text-lg font-semibold">
        {agentName ? `Chat with ${agentName}` : "AI Assistant"}
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {agentDesc ||
          "Select an agent and start a conversation. Your messages are saved and used as memory."}
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
        {[
          "What trending products should I sell on Etsy this fall?",
          "Generate an SEO-optimized title for a wooden clock",
          "Calculate margin for a $24 product with 6.5% fees",
          "Build a 3-month strategy for a new Etsy store",
        ].map((p) => (
          <div
            key={p}
            className="rounded-lg border bg-card p-3 text-sm text-muted-foreground hover:bg-accent cursor-pointer"
            onClick={() => {
              const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
              if (ta) {
                ta.value = p;
                ta.dispatchEvent(new Event("input", { bubbles: true }));
                ta.focus();
              }
            }}
          >
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const empty = !message.content && !isUser;

  return (
    <div className={"flex gap-3 " + (isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md brand-gradient text-white mt-0.5">
          <Bot className="size-3.5" />
        </div>
      )}
      <div
        className={
          (isUser
            ? "bg-primary text-primary-foreground"
            : message.isError
            ? "bg-destructive/10 border border-destructive/30"
            : "bg-card border") +
          " max-w-[85%] rounded-2xl px-4 py-2.5 text-sm"
        }
      >
        {empty ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            <span className="text-xs">Thinking…</span>
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-headings:mt-3 prose-headings:mb-2">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground mt-0.5">
          <UserIcon className="size-3.5" />
        </div>
      )}
    </div>
  );
}
