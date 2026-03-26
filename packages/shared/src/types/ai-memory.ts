export interface AiCorrection {
  id: string;
  tweet_text: string;
  tweet_id: string;
  original_category: string;
  corrected_category: string;
  user_reason?: string;
  corrected_at: string;
}

export interface AiCategoryRule {
  rule: string;
  created_at: string;
  source: 'user_explanation' | 'system_inferred';
}

export interface AiMemory {
  corrections: AiCorrection[];
  category_rules: AiCategoryRule[];
  version: number;
}
