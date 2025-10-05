import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useAccount } from 'wagmi';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Loader2, 
  Play, 
  Brain, 
  Key, 
  User, 
  Music2, 
  Radio,
  Sparkles,
  MessageSquare,
  AlertCircle
} from "lucide-react";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string | null;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
  relevanceScore?: number;
  combinedScore?: number;
}

interface Source {
  source: string;
  count: number;
  confidence: number;
  reasoning: string;
}

interface SearchPlan {
  strategy?: string;
  agentsUsed?: string[];
}

interface Message {
  id: string;
  type: 'user' | 'system' | 'results' | 'clarification' | 'error';
  content: string;
  timestamp: Date;
  results?: Song[];
  reasoning?: string;
  confidence?: number;
  sources?: Source[];
  plan?: SearchPlan;
  clarifyingQuestions?: string[];
  executionTime?: number;
}

const agentIcons: Record<string, { icon: any; label: string; color: string }> = {
  semantic: { icon: Brain, label: "Semantic Search", color: "text-purple-500" },
  keyword: { icon: Key, label: "Keyword Search", color: "text-blue-500" },
  userBehavior: { icon: User, label: "User Behavior", color: "text-green-500" },
  musicIntelligence: { icon: Music2, label: "Music Intelligence", color: "text-orange-500" },
  radioDiscovery: { icon: Radio, label: "Radio Discovery", color: "text-pink-500" }
};

export default function Discovery() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      type: 'system',
      content: 'Welcome to Deep Discovery! Ask me anything about music, and I\'ll use multiple AI agents to find the perfect songs for you.',
      timestamp: new Date()
    }
  ]);
  const [query, setQuery] = useState("");
  const [clarificationContext, setClarificationContext] = useState<{ originalQuery: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { address } = useAccount();
  const { playTrack, currentlyLoadingId, isLoading: isPlayerLoading } = useMusicPlayer();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", "/api/research/deep-search", {
        query: searchQuery,
        userAddress: address,
        maxResults: 20,
        context: {}
      });
      return response.json();
    },
    onSuccess: (data, searchQuery) => {
      if (data.needsClarification) {
        const clarificationMsg: Message = {
          id: Date.now().toString(),
          type: 'clarification',
          content: 'I need a bit more information to give you the best results:',
          timestamp: new Date(),
          clarifyingQuestions: data.clarifyingQuestions,
          plan: data.plan
        };
        setMessages(prev => [...prev, clarificationMsg]);
        setClarificationContext({ originalQuery: searchQuery });
      } else if (data.success) {
        const resultsMsg: Message = {
          id: Date.now().toString(),
          type: 'results',
          content: 'Here\'s what I found for you:',
          timestamp: new Date(),
          results: data.results,
          reasoning: data.reasoning,
          confidence: data.confidence,
          sources: data.sources,
          plan: data.plan,
          executionTime: data.executionTime
        };
        setMessages(prev => [...prev, resultsMsg]);
        setClarificationContext(null);
      } else {
        const errorMsg: Message = {
          id: Date.now().toString(),
          type: 'error',
          content: data.fallbackMessage || data.error || 'Search failed. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    },
    onError: (error: Error) => {
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      toast({
        title: "Search Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const clarifyMutation = useMutation({
    mutationFn: async ({ originalQuery, clarification }: { originalQuery: string; clarification: string }) => {
      const response = await apiRequest("POST", "/api/research/clarify", {
        query: originalQuery,
        clarification,
        userAddress: address,
        maxResults: 20
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const resultsMsg: Message = {
          id: Date.now().toString(),
          type: 'results',
          content: 'Great! Here are your refined results:',
          timestamp: new Date(),
          results: data.results,
          reasoning: data.reasoning,
          confidence: data.confidence,
          sources: data.sources,
          plan: data.plan,
          executionTime: data.executionTime
        };
        setMessages(prev => [...prev, resultsMsg]);
        setClarificationContext(null);
      } else {
        const errorMsg: Message = {
          id: Date.now().toString(),
          type: 'error',
          content: data.fallbackMessage || data.error || 'Clarification failed. Please try a new search.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    },
    onError: (error: Error) => {
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  });

  const handleSearch = () => {
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    if (clarificationContext) {
      clarifyMutation.mutate({
        originalQuery: clarificationContext.originalQuery,
        clarification: query
      });
    } else {
      searchMutation.mutate(query);
    }

    setQuery("");
  };

  const handlePlaySong = async (song: Song) => {
    if (!address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to play songs",
        variant: "destructive",
      });
      return;
    }

    if (currentlyLoadingId === song.id || isPlayerLoading) {
      return;
    }

    try {
      const track = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        ipfsHash: song.ipfsHash || ""
      };
      await playTrack(track);
    } catch (error) {
      console.error('Error playing song:', error);
      toast({
        title: "Playback Error",
        description: error instanceof Error ? error.message : 'Failed to play song',
        variant: "destructive",
      });
    }
  };

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'user':
        return (
          <div key={message.id} className="flex justify-end mb-4">
            <Card className="max-w-[80%] bg-primary text-primary-foreground">
              <CardContent className="p-3">
                <p>{message.content}</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'system':
        return (
          <div key={message.id} className="flex justify-center mb-4">
            <Card className="max-w-[80%] bg-muted">
              <CardContent className="p-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm">{message.content}</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'clarification':
        return (
          <div key={message.id} className="mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" />
                  {message.content}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {message.clarifyingQuestions?.map((question, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground">{idx + 1}.</span>
                    <span>{question}</span>
                  </div>
                ))}
                <p className="text-sm text-muted-foreground mt-3">
                  Please answer these questions in your next message.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'results':
        return (
          <div key={message.id} className="mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {message.content}
                </CardTitle>
                {message.plan && (
                  <CardDescription className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs">Strategy: {message.plan.strategy}</span>
                    {message.plan.agentsUsed && message.plan.agentsUsed.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {message.plan.agentsUsed.map((agent) => {
                          const agentInfo = agentIcons[agent];
                          if (!agentInfo) return null;
                          const Icon = agentInfo.icon;
                          return (
                            <Badge key={agent} variant="outline" className="text-xs">
                              <Icon className={`h-3 w-3 mr-1 ${agentInfo.color}`} />
                              {agentInfo.label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {message.reasoning && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1 font-semibold">AI Reasoning:</p>
                    <p className="text-sm">{message.reasoning}</p>
                  </div>
                )}

                {message.confidence !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Confidence:</span>
                    <Badge variant={message.confidence > 0.7 ? "default" : "secondary"}>
                      {(message.confidence * 100).toFixed(0)}%
                    </Badge>
                    {message.executionTime && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(message.executionTime / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                )}

                {message.sources && message.sources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sources Used:</p>
                    <div className="grid gap-2">
                      {message.sources.map((source, idx) => {
                        const agentInfo = agentIcons[source.source];
                        if (!agentInfo) return null;
                        const Icon = agentInfo.icon;
                        return (
                          <div key={idx} className="flex items-start gap-2 text-xs bg-muted p-2 rounded">
                            <Icon className={`h-4 w-4 mt-0.5 ${agentInfo.color}`} />
                            <div className="flex-1">
                              <p className="font-medium">{agentInfo.label}</p>
                              <p className="text-muted-foreground">{source.reasoning}</p>
                              <p className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {source.count} songs • {(source.confidence * 100).toFixed(0)}% confidence
                                </Badge>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Separator />

                {message.results && message.results.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{message.results.length} Songs Found:</p>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 pr-4">
                        {message.results.map((song, idx) => (
                          <Card key={song.id} className="hover:bg-accent transition-colors">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">#{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{song.title}</p>
                                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                                    </div>
                                  </div>
                                  {song.combinedScore !== undefined && (
                                    <div className="mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        Score: {song.combinedScore.toFixed(2)}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handlePlaySong(song)}
                                  disabled={currentlyLoadingId === song.id || isPlayerLoading}
                                >
                                  {currentlyLoadingId === song.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No results found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'error':
        return (
          <div key={message.id} className="mb-4">
            <Card className="border-destructive">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm">{message.content}</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Deep Discovery</h1>
          <p className="text-muted-foreground">
            Ask natural language questions about music, and our AI agents will search across multiple sources
          </p>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4">
            <ScrollArea className="h-[500px] mb-4">
              <div className="pr-4">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator className="mb-4" />

            <div className="flex gap-2">
              <Input
                placeholder={
                  clarificationContext
                    ? "Type your clarification..."
                    : "Ask Deep Discovery anything about music..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                disabled={searchMutation.isPending || clarifyMutation.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={!query.trim() || searchMutation.isPending || clarifyMutation.isPending}
              >
                {searchMutation.isPending || clarifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!address && (
              <p className="text-xs text-muted-foreground mt-2">
                Connect your wallet for personalized results based on your listening history
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available AI Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {Object.entries(agentIcons).map(([key, { icon: Icon, label, color }]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
