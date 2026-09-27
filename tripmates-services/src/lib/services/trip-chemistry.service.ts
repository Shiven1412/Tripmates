import { compatibilityInputSchema, type CompatibilityInput } from '../schemas/recommendation.schemas';

export type CompatibilityBreakdown = {
  budgetMatch: number;
  travelStyleMatch: number;
  lifestyleMatch: number;
  adventureMatch: number;
  foodMatch: number;
  socialMatch: number;
};

export type CompatibilityResult = {
  compatibilityScore: number;
  badge: string;
  mismatchAreas: string[];
  breakdown: CompatibilityBreakdown;
};

export class TripChemistryService {
  private readonly cache = new Map<string, CompatibilityResult>();

  calculateCompatibility(userA: CompatibilityInput, userB: CompatibilityInput): CompatibilityResult {
    const validatedA = compatibilityInputSchema.parse(userA);
    const validatedB = compatibilityInputSchema.parse(userB);
    const cacheKey = this.buildCacheKey(validatedA.id, validatedB.id);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const budgetMatch = this.scoreBudgetMatch(validatedA.budget, validatedB.budget);
    const travelStyleMatch = this.scoreTravelStyle(validatedA.travelStyle, validatedB.travelStyle);
    const lifestyleMatch = this.scoreLifestyle(validatedA, validatedB);
    const adventureMatch = this.scoreAdventure(validatedA.adventureLevel, validatedB.adventureLevel);
    const foodMatch = this.scoreFood(validatedA.foodPreferences, validatedB.foodPreferences);
    const socialMatch = this.scoreSocial(validatedA.socialEnergy, validatedB.socialEnergy);

    const weightedScore =
      budgetMatch * 0.2 +
      travelStyleMatch * 0.25 +
      lifestyleMatch * 0.2 +
      adventureMatch * 0.15 +
      foodMatch * 0.1 +
      socialMatch * 0.1;

    const compatibilityScore = Math.round(weightedScore);
    const breakdown: CompatibilityBreakdown = {
      budgetMatch,
      travelStyleMatch,
      lifestyleMatch,
      adventureMatch,
      foodMatch,
      socialMatch,
    };

    const result: CompatibilityResult = {
      compatibilityScore,
      badge: this.getCompatibilityBadge(compatibilityScore),
      mismatchAreas: this.getMismatchAreas(breakdown),
      breakdown,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  getMatchBreakdown(userA: CompatibilityInput, userB: CompatibilityInput): CompatibilityBreakdown {
    return this.calculateCompatibility(userA, userB).breakdown;
  }

  private buildCacheKey(userAId: string, userBId: string): string {
    return [userAId, userBId].sort().join(':');
  }

  private getCompatibilityBadge(score: number): string {
    if (score >= 95) return 'Perfect Travel Match';
    if (score >= 85) return 'Excellent Match';
    if (score >= 70) return 'Good Match';
    if (score >= 50) return 'Moderate Match';
    return 'Weak Match';
  }

  private getMismatchAreas(breakdown: CompatibilityBreakdown): string[] {
    const entries = Object.entries(breakdown).filter(([, value]) => value < 80);
    return entries.map(([key]) => this.fieldToLabel(key));
  }

  private fieldToLabel(field: string): string {
    const labels: Record<string, string> = {
      budgetMatch: 'Budget alignment',
      travelStyleMatch: 'Travel style alignment',
      lifestyleMatch: 'Lifestyle harmony',
      adventureMatch: 'Adventure level mismatch',
      foodMatch: 'Food preferences',
      socialMatch: 'Social energy fit',
    };

    return labels[field] ?? field;
  }

  private scoreBudgetMatch(a: string, b: string): number {
    const values = { LOW: 1, MID: 2, HIGH: 3, LUXURY: 4 } as const;
    const diff = Math.abs(values[a as keyof typeof values] - values[b as keyof typeof values]);
    if (diff === 0) return 100;
    if (diff === 1) return 80;
    if (diff === 2) return 60;
    return 40;
  }

  private scoreTravelStyle(a: string, b: string): number {
    const map = { BACKPACKER: 0, BALANCED: 1, ADVENTURE: 2, FAMILY: 3, LUXURY: 4 } as const;
    const diff = Math.abs(map[a as keyof typeof map] - map[b as keyof typeof map]);
    if (diff === 0) return 100;
    if (diff === 1) return 82;
    if (diff === 2) return 68;
    return 50;
  }

  private scoreLifestyle(a: CompatibilityInput, b: CompatibilityInput): number {
    const lifestyleScore = [a.drinking, b.drinking, a.smoking, b.smoking, a.partying, b.partying].reduce((total, value) => {
      if (value === 'NONE' || value === 'NO' || value === 'LOW') return total + 1;
      if (value === 'MODERATE') return total + 0.5;
      return total;
    }, 0);

    const normalized = Math.min(100, Math.round((lifestyleScore / 6) * 100));
    return normalized;
  }

  private scoreAdventure(a: number, b: number): number {
    const diff = Math.abs(a - b);
    if (diff <= 1) return 95;
    if (diff <= 2) return 85;
    if (diff <= 3) return 70;
    return 55;
  }

  private scoreFood(a: string[], b: string[]): number {
    const setA = new Set(a.map((item) => item.toLowerCase()));
    const setB = new Set(b.map((item) => item.toLowerCase()));
    const common = [...setA].filter((item) => setB.has(item));
    const overlap = common.length > 0 ? (common.length / Math.max(setA.size, setB.size)) * 100 : 30;
    return Math.min(100, Math.round(overlap));
  }

  private scoreSocial(a: number, b: number): number {
    const diff = Math.abs(a - b);
    if (diff <= 1) return 95;
    if (diff <= 2) return 82;
    if (diff <= 3) return 70;
    return 50;
  }
}
