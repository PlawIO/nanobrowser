/**
 * PolicyGenerator — converts natural language to Veto rules via LLM.
 *
 * Uses the Planner model config (falls back to Navigator) to make a
 * single structured-output LLM call. The system prompt teaches the
 * LLM the full Rule schema, available context fields, operators, and
 * tool names so it can generate accurate, enforceable rules.
 */

import { z } from 'zod';
import {
  agentModelStore,
  AgentNameEnum,
  llmProviderStore,
  ProviderTypeEnum,
  type ModelConfig,
} from '@extension/storage';
import { createChatModel } from '@src/background/agent/helper';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Rule, RuleCondition } from 'veto-sdk/browser';
import { vetoStore } from '@extension/storage';
import { createLogger } from '@src/background/log';
import {
  extractJsonFromModelOutput,
  removeThinkTags,
  wrapUntrustedContent,
} from '@src/background/agent/messages/utils';

const logger = createLogger('PolicyGenerator');

const GENERATION_TIMEOUT_MS = 30_000;
const VETO_HOSTED_ENDPOINT = 'https://api.veto.so';

// --- Zod schema for LLM output ---

// OpenAI structured output requires .nullable() alongside .optional().
// Use .nullable().optional() on every non-required field so the schema
// works with OpenAI, Anthropic, Gemini, and manual JSON extraction alike.

const conditionValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())]);

const ruleConditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: conditionValueSchema,
});

export const runtimeRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  action: z.enum(['block', 'warn', 'log', 'allow', 'require_approval']),
  tools: z.array(z.string()).nullable().optional(),
  conditions: z.array(ruleConditionSchema).nullable().optional(),
  condition_groups: z.array(z.array(ruleConditionSchema)).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

const generatedRuleSchema = runtimeRuleSchema.extend({
  enabled: z.literal(true).default(true),
});

const policyOutputSchema = z.object({
  rules: z.array(generatedRuleSchema).min(1),
  explanation: z.string(),
});

type PolicyOutput = z.infer<typeof policyOutputSchema>;

// --- Result type ---

export interface PolicyGenerationResult {
  success: boolean;
  rules: Rule[];
  explanation: string;
  error?: string;
}

// --- Operator whitelist for validation ---

const VALID_OPERATORS = new Set([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'matches',
  'greater_than',
  'less_than',
  'percent_of',
  'length_greater_than',
  'in',
  'not_in',
  'outside_hours',
  'within_hours',
]);

// --- System prompt ---

const SYSTEM_PROMPT = `You are a security policy compiler for a browser automation agent.

Convert the user's natural-language policy into one or more Veto rules (JSON).

## Rule Schema

Each rule is a JSON object:
{
  "id": string,           // kebab-case unique ID (e.g., "block-expensive-purchases")
  "name": string,         // short human-readable name
  "description": string,  // 1-2 sentence description
  "enabled": true,
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "action": "block" | "warn" | "log" | "allow" | "require_approval",
  "tools": string[],      // which browser actions this applies to (omit for ALL)
  "conditions": [         // ALL must match (AND logic)
    { "field": string, "operator": string, "value": any }
  ],
  "condition_groups": [   // groups are OR'd; conditions within each group are AND'd
    [ { "field": ..., "operator": ..., "value": ... } ]
  ],
  "tags": string[]
}

## Available Tools (prefix: browser_)

browser_clickElement, browser_inputText, browser_goToUrl, browser_searchGoogle,
browser_scrollToPercent, browser_switchTab, browser_openTab, browser_closeTab,
browser_goBack, browser_sendKeys, browser_wait, browser_scrollToText,
browser_selectDropdownOption, browser_getDropdownOptions, browser_cacheContent,
browser_done, browser_scrollToTop, browser_scrollToBottom, browser_nextPage,
browser_previousPage

Omit "tools" to apply to ALL actions.

## Available Condition Fields

You can condition on ANY field in the action's arguments using dot notation.
The system provides these built-in fields, but you are not limited to them:

**Page context:**
- arguments.current_url (string) — current page URL
- arguments.page_title (string) — current page title
- arguments.action_index (number) — action sequence number in this task
- arguments.domain_time_seconds (number) — cumulative seconds on this domain

**Element styles** (for actions targeting page elements):
- arguments.computed_styles.* — any CSS property (backgroundColor, color, fontSize, display, visibility, opacity, position, zIndex, pointerEvents, fontWeight, textDecoration, overflow, cursor, borderColor)

**Extracted entities** (auto-detected from visible page content):
- arguments.extracted_entities.prices (number[]) — prices in any currency
- arguments.extracted_entities.max_price (number) — highest price on page
- arguments.extracted_entities.min_price (number) — lowest price on page
- arguments.extracted_entities.emails (string[]) — email addresses
- arguments.extracted_entities.phone_numbers (string[]) — phone numbers (international)
- arguments.extracted_entities.salary_figures (number[]) — salary/compensation amounts
- arguments.extracted_entities.has_salary_figures (boolean)
- arguments.extracted_entities.equity_percentages (number[]) — equity/vesting %
- arguments.extracted_entities.has_equity_info (boolean)
- arguments.extracted_entities.has_sensitive_pii (boolean) — any PII detected
- arguments.extracted_entities.has_credit_cards (boolean) — credit card numbers detected
- arguments.extracted_entities.has_gov_ids (boolean) — government ID patterns detected
- arguments.extracted_entities.has_api_keys (boolean) — API keys/secrets detected
- arguments.extracted_entities.sensitive_terms (string[]) — categories found: salary, equity, gov_id, credit_card, api_key, email, phone

**Action-specific arguments:**
- arguments.url — target URL for navigation
- arguments.text — text being typed
- arguments.query — search query
- arguments.index — target element index

You can also use any custom field path. Unknown fields resolve to undefined and conditions on them won't match.

## Operators

equals, not_equals, contains, not_contains, starts_with, ends_with, matches,
greater_than, less_than, in, not_in, length_greater_than, percent_of,
outside_hours, within_hours

For time-based: use "HH:MM-HH:MM" format (e.g., "09:00-17:00"). Handles overnight ranges.
You can use any operator the Veto SDK supports. Unknown operators are passed through to cloud evaluation.

## Action Types

- "block" — prevent the action (hard limit)
- "require_approval" — pause and ask the human to approve/deny
- "warn" — log warning but allow
- "log" — silently log
- "allow" — explicitly allow (for exceptions)

Use "block" for hard safety limits. Use "require_approval" when the user wants case-by-case review.

## Rules

1. Rules are evaluated per-action, not per-page
2. Use "conditions" for AND logic, "condition_groups" for OR logic
3. For URL matching, prefer "contains" or "matches" over "equals"
4. For price thresholds, use "arguments.extracted_entities.max_price" with "greater_than"
5. Generate the minimum number of rules needed

## Output Format

Return JSON with exactly two fields:
{
  "rules": [ ... ],
  "explanation": "1-3 sentence plain-English explanation"
}`;

// --- LLM helpers ---

function shouldUseStructuredOutput(modelConfig: ModelConfig): boolean {
  const name = modelConfig.modelName;
  if (name === 'deepseek-reasoner' || name === 'deepseek-r1') return false;
  if (modelConfig.provider === ProviderTypeEnum.Llama) return false;
  if (name.includes('Llama-4') || name.includes('Llama-3.3') || name.includes('llama-3.3')) return false;
  return true;
}

export function resolvePolicyGenerationEndpoint(endpoint: string, isAuthenticated: boolean): string {
  return isAuthenticated ? VETO_HOSTED_ENDPOINT : endpoint;
}

async function createPolicyLLM(): Promise<{ llm: BaseChatModel; modelConfig: ModelConfig }> {
  const agentModels = await agentModelStore.getAllAgentModels();
  const providers = await llmProviderStore.getAllProviders();

  const modelConfig = agentModels[AgentNameEnum.Planner] ?? agentModels[AgentNameEnum.Navigator];
  if (!modelConfig) {
    throw new Error('No LLM model configured. Configure a Planner or Navigator model in settings.');
  }

  const providerConfig = providers[modelConfig.provider];
  if (!providerConfig) {
    throw new Error(`Provider "${modelConfig.provider}" not found. Check your settings.`);
  }

  return { llm: createChatModel(providerConfig, modelConfig), modelConfig };
}

// --- Post-processing ---
// Philosophy: pass through everything the LLM generates. Warn on unrecognized
// patterns but NEVER silently drop conditions, fields, or tools. The local
// evaluator and cloud SDK decide enforcement, not the generator.

const KNOWN_TOOLS = new Set([
  'browser_clickElement',
  'browser_inputText',
  'browser_goToUrl',
  'browser_searchGoogle',
  'browser_scrollToPercent',
  'browser_switchTab',
  'browser_openTab',
  'browser_closeTab',
  'browser_goBack',
  'browser_sendKeys',
  'browser_wait',
  'browser_scrollToText',
  'browser_selectDropdownOption',
  'browser_getDropdownOptions',
  'browser_cacheContent',
  'browser_done',
  'browser_scrollToTop',
  'browser_scrollToBottom',
  'browser_nextPage',
  'browser_previousPage',
]);

function sanitizeRules(parsed: { rules: Array<z.infer<typeof runtimeRuleSchema>> }): Rule[] {
  const seenIds = new Set<string>();

  return parsed.rules.map(r => {
    let id = `local-nl-${r.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
    while (seenIds.has(id)) {
      id = `${id}-${crypto.randomUUID().slice(0, 8)}`;
    }
    seenIds.add(id);

    // Warn on unknown tools but KEEP them — cloud SDK or future tools may recognize them
    if (r.tools) {
      for (const t of r.tools) {
        if (!KNOWN_TOOLS.has(t)) {
          logger.warning(`Unknown tool "${t}" in rule "${r.name}" — kept (may match future/cloud tools)`);
        }
      }
    }

    // Warn on unknown operators but KEEP them — cloud SDK may support more
    const toCondition = (c: { field: string; operator: string; value?: unknown }): RuleCondition => {
      if (!VALID_OPERATORS.has(c.operator)) {
        logger.warning(`Unrecognized operator "${c.operator}" in rule "${r.name}" — kept for cloud evaluation`);
      }
      return {
        field: c.field,
        operator: c.operator as RuleCondition['operator'],
        value: c.value,
      };
    };

    const rule: Rule = {
      id,
      name: r.name,
      description: r.description ?? undefined,
      enabled: true,
      severity: r.severity,
      action: r.action,
      tools: r.tools ?? undefined,
      conditions: r.conditions?.map(toCondition),
      condition_groups: r.condition_groups?.map(group => group.map(toCondition)),
      tags: r.tags ?? ['nl-generated'],
    };

    return rule;
  });
}

export function validateRuntimeRules(rules: unknown, options: { allowExplicitAllowAction?: boolean } = {}): Rule[] {
  const parsedRules = z.array(runtimeRuleSchema).min(1).parse(rules);

  if (!options.allowExplicitAllowAction) {
    const hasAllowRule = parsedRules.some(rule => rule.action === 'allow');
    if (hasAllowRule) {
      throw new Error('Allow rules are not accepted from side-panel presets.');
    }
  }

  return sanitizeRules({ rules: parsedRules });
}

// --- Veto-hosted policy generation (CWS mode) ---

async function generateViaVetoAPI(input: string, authToken: string, endpoint: string): Promise<PolicyOutput> {
  const response = await fetch(`${endpoint}/v1/policy/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ policy_description: input }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Veto API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return policyOutputSchema.parse(data);
}

// --- Main export ---

export async function generatePolicy(input: string): Promise<PolicyGenerationResult> {
  logger.info(`Generating policy from: "${input.slice(0, 100)}..."`);

  try {
    // Try Veto-hosted mode first (user logged in via veto.so)
    const config = await vetoStore.getVeto();
    if (config.isAuthenticated && config.authToken) {
      logger.info('Using Veto-hosted policy generation');
      const parsed = await Promise.race([
        generateViaVetoAPI(
          input,
          config.authToken,
          resolvePolicyGenerationEndpoint(config.endpoint, config.isAuthenticated),
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Veto API timed out after 30 seconds')), GENERATION_TIMEOUT_MS),
        ),
      ]);
      const rules = sanitizeRules(parsed);
      logger.info(`Veto API generated ${rules.length} rule(s)`);
      return { success: true, rules, explanation: parsed.explanation };
    }

    // Fall back to local LLM (BYOK mode)
    const { llm, modelConfig } = await createPolicyLLM();
    const useStructured = shouldUseStructuredOutput(modelConfig);

    const sanitizedInput = wrapUntrustedContent(input, true);
    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(`Convert this policy into Veto rules:\n\n${sanitizedInput}`),
    ];

    const llmCall = async (): Promise<PolicyOutput> => {
      if (useStructured) {
        const structuredLlm = llm.withStructuredOutput(policyOutputSchema, {
          includeRaw: true,
          name: 'policy_output',
        });

        const response = await structuredLlm.invoke(messages);
        if (response.parsed) return policyOutputSchema.parse(response.parsed);

        // Try manual extraction from raw
        if (response.raw?.content && typeof response.raw.content === 'string') {
          const cleaned = removeThinkTags(response.raw.content);
          const extracted = extractJsonFromModelOutput(cleaned);
          return policyOutputSchema.parse(extracted as unknown);
        }

        throw new Error('Structured output returned no parsed result');
      }

      // Fallback: manual JSON extraction
      const response = await llm.invoke(messages);
      if (typeof response.content !== 'string') {
        throw new Error('LLM returned non-string content');
      }
      const cleaned = removeThinkTags(response.content);
      const extracted = extractJsonFromModelOutput(cleaned);
      return policyOutputSchema.parse(extracted as unknown);
    };

    // Race with timeout
    const parsed = await Promise.race([
      llmCall(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Policy generation timed out after 30 seconds')), GENERATION_TIMEOUT_MS),
      ),
    ]);

    const rules = sanitizeRules(parsed);

    logger.info(`Generated ${rules.length} rule(s): ${rules.map(r => r.name).join(', ')}`);

    return {
      success: true,
      rules,
      explanation: parsed.explanation,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Policy generation failed: ${msg}`);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        rules: [],
        explanation: '',
        error: `Invalid rule structure from LLM: ${error.issues.map(i => i.message).join(', ')}`,
      };
    }

    return {
      success: false,
      rules: [],
      explanation: '',
      error: msg,
    };
  }
}
