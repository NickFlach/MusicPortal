import OpenAI from "openai";
import type { StandardizedData, ProcessedMetrics } from '../types/lumira';
import { dimensionalBalancer } from './dimension-balance';

let openai: OpenAI | null = null;

// Only initialize OpenAI if the API key is available
try {
  if (process.env.XAI_API_KEY) {
    openai = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY });
    console.log('AI Interpreter: Successfully initialized X.AI client');
  } else if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('AI Interpreter: Successfully initialized OpenAI client');
  } else {
    console.log('AI Interpreter: No API key found, running in fallback mode');
  }
} catch (error) {
  console.error('AI Interpreter: Failed to initialize AI client:', error);
  openai = null;
}

/**
 * AI Interpreter Service for processing system evolution metrics
 */
class AIInterpreter {
  private async analyzeEvolutionMetrics(metrics: StandardizedData): Promise<ProcessedMetrics> {
    try {
      // If we don't have an API client, use deterministic fallback values
      if (!openai) {
        console.log('AI Interpreter: Using fallback mode for metric analysis');
        return this.getFallbackAnalysis(metrics);
      }
      
      try {
        const response = await openai!.chat.completions.create({
          model: "grok-2-1212",
          messages: [
            {
              role: "system",
              content: "You are an expert system analyzing dimensional evolution metrics. Interpret the data and provide insights in JSON format."
            },
            {
              role: "user",
              content: JSON.stringify(metrics)
            }
          ],
          response_format: { type: "json_object" }
        });

        // Handle potential null response content
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('No analysis content received from AI');
        }

        const analysis = JSON.parse(content);

        return {
          success: true,
          aggregatedMetrics: {
            count: metrics.metadata.dimensionalContext?.currentDimensions || 0,
            aggregates: {
              avgEnergy: analysis.averageEnergy || 0,
              avgPressure: analysis.systemPressure || 0,
              avgEquilibrium: analysis.systemEquilibrium || 0,
              dimensionalDiversity: analysis.dimensionalDiversity || 0
            },
            lastUpdated: new Date()
          }
        };
      } catch (aiError) {
        console.error('Error with AI analysis, falling back to deterministic values:', aiError);
        return this.getFallbackAnalysis(metrics);
      }
    } catch (error) {
      console.error('Error analyzing evolution metrics:', error);
      // Use fallback instead of throwing
      return this.getFallbackAnalysis(metrics);
    }
  }
  
  /**
   * Generate fallback analysis without using AI
   */
  private getFallbackAnalysis(metrics: StandardizedData): ProcessedMetrics {
    // Extract dimensional context or use defaults
    const dimCount = metrics.metadata.dimensionalContext?.currentDimensions || 1;
    const totalEnergy = metrics.metadata.dimensionalContext?.totalEnergy || 1.0;
    const equilibrium = metrics.metadata.dimensionalContext?.systemEquilibrium || 0.5;
    
    // Calculate simple deterministic values
    const avgEnergy = totalEnergy / Math.max(dimCount, 1);
    const pressure = (1 - equilibrium) * avgEnergy;
    
    return {
      success: true,
      aggregatedMetrics: {
        count: dimCount,
        aggregates: {
          avgEnergy: avgEnergy,
          avgPressure: pressure,
          avgEquilibrium: equilibrium,
          dimensionalDiversity: Math.min(dimCount / 10, 1) // Normalize to 0-1 range
        },
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Process incoming metrics with AI interpretation
   */
  public async interpretMetrics(data: StandardizedData): Promise<ProcessedMetrics> {
    try {
      // Add current dimensional state to context
      const dimensionalState = dimensionalBalancer.getDimensionalState();
      data.metadata.dimensionalContext = {
        currentDimensions: dimensionalState.length,
        totalEnergy: dimensionalState.reduce((sum, dim) => sum + dim.energy, 0),
        systemEquilibrium: dimensionalState.reduce((sum, dim) => sum + dim.equilibrium, 0) / dimensionalState.length
      };

      // Process metrics based on type
      switch (data.type) {
        case 'evolution':
        case 'reflection':
          return this.analyzeEvolutionMetrics(data);
        default:
          throw new Error(`Unsupported metric type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error interpreting metrics:', error);
      throw error;
    }
  }
}

export const aiInterpreter = new AIInterpreter();