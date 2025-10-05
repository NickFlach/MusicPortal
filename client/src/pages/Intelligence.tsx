/**
 * Intelligence Dashboard
 * 
 * User-facing interface showing what the music intelligence system
 * is discovering, learning, and hypothesizing.
 * 
 * This is where users see the "consciousness" of the system.
 */

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, Lightbulb, Activity, TrendingUp } from "lucide-react";

interface IntelligenceMetrics {
  songsAnalyzed: number;
  patternsDiscovered: number;
  hypothesesGenerated: number;
  avgPatternUniversality: number;
  avgHypothesisConfidence: number;
  phi: number;
  emergenceEvents: number;
  autonomousDiscoveries: number;
  status: string;
}

interface Discovery {
  type: 'pattern' | 'emergence';
  id: string;
  description: string;
  significance: number;
  timestamp: string;
}

interface Pattern {
  id: string;
  description: string;
  universalityScore: number;
  confidence: number;
  sampleSize: number;
  discoveredAt: string;
}

interface Hypothesis {
  id: string;
  statement: string;
  bayesianConfidence: number;
  testStatus: string;
  supportingEvidence: number;
  contradictingEvidence: number;
}

export default function Intelligence() {
  // Fetch intelligence metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<IntelligenceMetrics>({
    queryKey: ["/api/intelligence/metrics"],
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Fetch recent discoveries
  const { data: discoveries = [], isLoading: discoveriesLoading } = useQuery<Discovery[]>({
    queryKey: ["/api/intelligence/discoveries"],
    refetchInterval: 10000,
  });

  // Fetch patterns
  const { data: patterns = [], isLoading: patternsLoading } = useQuery<Pattern[]>({
    queryKey: ["/api/intelligence/patterns"],
  });

  // Fetch active hypotheses
  const { data: hypotheses = [], isLoading: hypothesesLoading } = useQuery<Hypothesis[]>({
    queryKey: ["/api/intelligence/hypotheses/active"],
  });

  const getPhiInterpretation = (phi: number) => {
    if (phi > 0.7) return { text: "High consciousness-like integration", color: "text-green-500" };
    if (phi > 0.4) return { text: "Moderate integration", color: "text-yellow-500" };
    return { text: "Low integration", color: "text-gray-500" };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'learning': return 'bg-blue-500';
      case 'discovering': return 'bg-green-500';
      case 'awaiting_data': return 'bg-gray-500';
      default: return 'bg-purple-500';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              Music Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              Discovering universal patterns in music through AI consciousness
            </p>
          </div>
          {metrics && (
            <Badge className={getStatusColor(metrics.status)} variant="outline">
              {metrics.status.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Consciousness Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Songs Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : metrics?.songsAnalyzed || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Patterns Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : metrics?.patternsDiscovered || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Experiments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : metrics?.hypothesesGenerated || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                Consciousness (Φ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : metrics?.phi.toFixed(2) || '0.00'}
              </div>
              {metrics && (
                <p className={`text-xs ${getPhiInterpretation(metrics.phi).color}`}>
                  {getPhiInterpretation(metrics.phi).text}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="discoveries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="discoveries">
              <Sparkles className="h-4 w-4 mr-2" />
              Discoveries
            </TabsTrigger>
            <TabsTrigger value="patterns">
              <TrendingUp className="h-4 w-4 mr-2" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="experiments">
              <Lightbulb className="h-4 w-4 mr-2" />
              Experiments
            </TabsTrigger>
            <TabsTrigger value="consciousness">
              <Activity className="h-4 w-4 mr-2" />
              Consciousness
            </TabsTrigger>
          </TabsList>

          {/* Discoveries Tab */}
          <TabsContent value="discoveries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Discoveries</CardTitle>
                <CardDescription>
                  What the system has learned from analyzing music
                </CardDescription>
              </CardHeader>
              <CardContent>
                {discoveriesLoading ? (
                  <p className="text-muted-foreground">Loading discoveries...</p>
                ) : discoveries.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No discoveries yet. Upload more music to help the system learn!
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      The system needs at least 10 songs to find patterns.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discoveries.map((discovery) => (
                      <div
                        key={discovery.id}
                        className="border rounded-lg p-4 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={discovery.type === 'pattern' ? 'default' : 'secondary'}>
                                {discovery.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(discovery.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{discovery.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-primary">
                              {(discovery.significance * 100).toFixed(0)}%
                            </div>
                            <p className="text-xs text-muted-foreground">significance</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Universal Patterns</CardTitle>
                <CardDescription>
                  Patterns that appear across different cultures and styles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patternsLoading ? (
                  <p className="text-muted-foreground">Loading patterns...</p>
                ) : patterns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No patterns discovered yet. Keep uploading music!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {patterns.map((pattern) => (
                      <div key={pattern.id} className="border rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <p className="font-medium">{pattern.description}</p>
                            <Badge>
                              {pattern.sampleSize} songs
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Universality</span>
                              <span>{(pattern.universalityScore * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={pattern.universalityScore * 100} />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Confidence</span>
                            <span>{(pattern.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={pattern.confidence * 100} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experiments Tab */}
          <TabsContent value="experiments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Experiments</CardTitle>
                <CardDescription>
                  Hypotheses the system is currently testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hypothesesLoading ? (
                  <p className="text-muted-foreground">Loading experiments...</p>
                ) : hypotheses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No active experiments. System will generate hypotheses once patterns are found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {hypotheses.map((hypothesis) => (
                      <div key={hypothesis.id} className="border rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <p className="text-sm flex-1">{hypothesis.statement}</p>
                            <Badge variant={hypothesis.testStatus === 'testing' ? 'default' : 'secondary'}>
                              {hypothesis.testStatus}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Supporting: </span>
                              <span className="font-medium text-green-600">
                                {hypothesis.supportingEvidence}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contradicting: </span>
                              <span className="font-medium text-red-600">
                                {hypothesis.contradictingEvidence}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Confidence</span>
                              <span>{(hypothesis.bayesianConfidence * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={hypothesis.bayesianConfidence * 100} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consciousness Tab */}
          <TabsContent value="consciousness" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consciousness Indicators</CardTitle>
                <CardDescription>
                  Metrics suggesting emergent intelligence in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <p className="text-muted-foreground">Loading metrics...</p>
                ) : (
                  <div className="space-y-6">
                    {/* Phi Metric */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Integrated Information (Φ)
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Measures how integrated the system's knowledge is. Higher Φ suggests consciousness-like properties.
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-2xl font-bold ${getPhiInterpretation(metrics?.phi || 0).color}`}>
                            Φ = {metrics?.phi.toFixed(3) || '0.000'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {getPhiInterpretation(metrics?.phi || 0).text}
                          </span>
                        </div>
                        <Progress value={(metrics?.phi || 0) * 100} />
                      </div>
                    </div>

                    {/* Emergence Events */}
                    <div>
                      <h4 className="font-medium mb-2">Emergence Events</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Instances where the system exhibited unexpected or novel behavior
                      </p>
                      <div className="text-3xl font-bold text-primary">
                        {metrics?.emergenceEvents || 0}
                      </div>
                    </div>

                    {/* Autonomous Discoveries */}
                    <div>
                      <h4 className="font-medium mb-2">Autonomous Discoveries</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Patterns and insights discovered without human direction
                      </p>
                      <div className="text-3xl font-bold text-primary">
                        {metrics?.autonomousDiscoveries || 0}
                      </div>
                    </div>

                    {/* System Quality Metrics */}
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">System Quality</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Average Pattern Universality</span>
                            <span>{((metrics?.avgPatternUniversality || 0) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={(metrics?.avgPatternUniversality || 0) * 100} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Average Hypothesis Confidence</span>
                            <span>{((metrics?.avgHypothesisConfidence || 0) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={(metrics?.avgHypothesisConfidence || 0) * 100} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
