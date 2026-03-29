/**
 * Veto guard service — validates every browser action against a Veto policy server
 * before execution. Integrates with the Veto authorization layer.
 *
 * Sits between the Action system and actual browser commands.
 * If Veto denies an action, it returns an ActionResult with an error
 * so the agent can adapt.
 */

import { vetoStore, type VetoConfig } from '@extension/storage';
import { createLogger } from '@src/background/log';

const logger = createLogger('Veto');

export interface VetoDecision {
  allowed: boolean;
  decision: 'allow' | 'deny' | 'require_approval';
  reason?: string;
  latencyMs: number;
  session?: Record<string, unknown>;
}

class VetoGuardService {
  private _config: VetoConfig | null = null;
  private _actionCount = 0;

  /**
   * Load config from storage. Called before each validation to pick up
   * live setting changes without restarting the extension.
   */
  private async getConfig(): Promise<VetoConfig> {
    if (!this._config) {
      this._config = await vetoStore.getVeto();
    }
    return this._config;
  }

  /**
   * Force-refresh config from storage (called when settings change).
   */
  async refreshConfig(): Promise<void> {
    this._config = await vetoStore.getVeto();
  }

  /**
   * Reset action counter (called at the start of each task).
   */
  resetSession(): void {
    this._actionCount = 0;
  }

  /**
   * Check if Veto is enabled and configured.
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled && config.apiKey.length > 0;
  }

  /**
   * Validate an action against the Veto policy server.
   *
   * @param actionName - The nanobrowser action name (e.g., "click_element", "go_to_url")
   * @param actionArgs - The parsed action arguments
   * @param currentUrl - Current page URL for context
   * @param pageTitle - Current page title for context
   * @returns VetoDecision — allowed: true if the action should proceed
   */
  async validateAction(
    actionName: string,
    actionArgs: unknown,
    currentUrl?: string,
    pageTitle?: string,
  ): Promise<VetoDecision> {
    const config = await this.getConfig();

    if (!config.enabled || !config.apiKey) {
      return { allowed: true, decision: 'allow', latencyMs: 0 };
    }

    this._actionCount++;

    // Map nanobrowser action names to Veto tool names
    const toolName = `browser_${actionName}`;

    // Build arguments object for Veto
    const args: Record<string, unknown> =
      typeof actionArgs === 'object' && actionArgs !== null ? { ...actionArgs } : {};

    if (currentUrl) args.current_url = currentUrl;
    if (pageTitle) args.page_title = pageTitle;
    args.action_index = this._actionCount;

    const context: Record<string, unknown> = {
      agentId: config.agentId || 'nanobrowser',
    };
    if (config.sessionId) {
      context.sessionId = config.sessionId;
    }

    const endpoint = config.endpoint.replace(/\/$/, '');
    const startTime = Date.now();

    try {
      const response = await fetch(`${endpoint}/v1/validate`, {
        method: 'POST',
        headers: {
          'X-Veto-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolName,
          arguments: args,
          context,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No policy for this tool — allow by default
          logger.debug(`Veto: no policy for ${toolName}, allowing`);
          return {
            allowed: true,
            decision: 'allow',
            latencyMs: Date.now() - startTime,
            reason: 'No policy configured',
          };
        }
        throw new Error(`Veto API error: ${response.status}`);
      }

      const data = await response.json();
      const decision: VetoDecision = {
        allowed: data.decision === 'allow',
        decision: data.decision ?? 'deny',
        reason: data.reason,
        latencyMs: data.latencyMs ?? Date.now() - startTime,
        session: data.session,
      };

      if (decision.allowed) {
        logger.info(`Veto ALLOW: ${toolName} [${decision.latencyMs}ms]`);
      } else {
        logger.warning(
          `Veto ${decision.decision.toUpperCase()}: ${toolName} — ${decision.reason} [${decision.latencyMs}ms]`,
        );
      }

      return decision;
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Veto error: ${message}`);

      if (config.failOpen) {
        logger.warning(`Veto: failing open — ${message}`);
        return { allowed: true, decision: 'allow', latencyMs: latency, reason: `fail_open: ${message}` };
      }

      return { allowed: false, decision: 'deny', latencyMs: latency, reason: `Veto unreachable: ${message}` };
    }
  }
}

// Singleton instance
export const vetoGuard = new VetoGuardService();
