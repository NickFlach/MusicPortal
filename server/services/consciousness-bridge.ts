/**
 * Consciousness Bridge
 * Bridges MusicPortal dimensional signals to SpaceAgent consciousness verification.
 * Uses Node 18+ fetch to communicate with SpaceAgent at http://localhost:8080 by default.
 */

export interface BridgeVerifyPayload {
  task: { type: string; description: string };
  userId?: string;
  consciousnessLevel?: number;
  context?: Record<string, unknown>;
}

export interface BridgeVerifyResult {
  verified: boolean;
  confidence: number;
  revolutionaryInsight?: string;
  breakthroughProbability?: number;
  timestamp?: string;
}

const SPACEAGENT_BASE = process.env.SPACEAGENT_URL || 'http://localhost:8080';

export async function submitConsciousnessVerification(payload: BridgeVerifyPayload): Promise<BridgeVerifyResult | null> {
  try {
    const res = await fetch(`${SPACEAGENT_BASE}/api/consciousness/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: payload.task,
        userId: payload.userId,
        consciousnessLevel: payload.consciousnessLevel,
        context: payload.context
      })
    });

    if (!res.ok) {
      throw new Error(`SpaceAgent verify failed: ${res.status}`);
    }

    const data = (await res.json()) as BridgeVerifyResult;
    return data;
  } catch (err) {
    console.error('[ConsciousnessBridge] verification error:', err);
    return null;
  }
}

export async function fetchUnifiedMetrics(): Promise<any | null> {
  try {
    const res = await fetch(`${SPACEAGENT_BASE}/api/metrics/revolutionary`);
    if (!res.ok) throw new Error(`SpaceAgent metrics failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[ConsciousnessBridge] metrics error:', err);
    return null;
  }
}
