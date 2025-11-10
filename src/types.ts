export interface Pattern {
  name: string;
  description?: string;
  keywords?: string[];
}

export interface FabricResult {
  success: boolean;
  output: string;
  error?: string;
}
