import { createAdminClient } from '@/lib/supabase/admin';
import type { AiMemory, AiCorrection, AiCategoryRule } from '@shared/types/ai-memory';

const MAX_CORRECTIONS = 200;

const DEFAULT_MEMORY: AiMemory = {
  corrections: [],
  category_rules: [],
  version: 1,
};

/**
 * Reads the AI memory for a user from the users table.
 */
export async function getAiMemory(userId: string): Promise<AiMemory> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('ai_memory')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch AI memory:', error.message);
    return { ...DEFAULT_MEMORY };
  }

  const memory = data?.ai_memory as AiMemory | null;
  if (!memory || typeof memory !== 'object') {
    return { ...DEFAULT_MEMORY };
  }

  return {
    corrections: memory.corrections ?? [],
    category_rules: memory.category_rules ?? [],
    version: memory.version ?? 1,
  };
}

/**
 * Adds a correction to the user's AI memory.
 * Enforces a cap of 200 corrections, evicting the oldest when full.
 */
export async function addCorrection(
  userId: string,
  correction: Omit<AiCorrection, 'id' | 'corrected_at'>
): Promise<void> {
  const memory = await getAiMemory(userId);

  const newCorrection: AiCorrection = {
    ...correction,
    id: generateId(),
    corrected_at: new Date().toISOString(),
  };

  memory.corrections.push(newCorrection);

  // Evict oldest corrections if we exceed the cap
  if (memory.corrections.length > MAX_CORRECTIONS) {
    memory.corrections = memory.corrections.slice(
      memory.corrections.length - MAX_CORRECTIONS
    );
  }

  await saveMemory(userId, memory);
}

/**
 * Adds a category rule to the user's AI memory.
 */
export async function addCategoryRule(
  userId: string,
  rule: string
): Promise<void> {
  const memory = await getAiMemory(userId);

  const newRule: AiCategoryRule = {
    rule,
    created_at: new Date().toISOString(),
    source: 'user_explanation',
  };

  memory.category_rules.push(newRule);

  await saveMemory(userId, memory);
}

async function saveMemory(userId: string, memory: AiMemory): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('users')
    .update({ ai_memory: memory as unknown as Record<string, unknown> })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to save AI memory: ${error.message}`);
  }
}

function generateId(): string {
  return `cor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
