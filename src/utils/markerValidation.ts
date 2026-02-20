export function validateBorderColor(borderColor: string): { valid: boolean; warning?: string } {
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(borderColor || '');
  if (!isHex) {
    return { valid: false, warning: 'border color should be a valid hex value' };
  }
  return { valid: true };
}

export function validatePatternRatio(patternRatio: number): { valid: boolean; warning?: string } {
  if (Number.isNaN(patternRatio)) {
    return { valid: false, warning: 'pattern ratio must be a number' };
  }
  if (patternRatio < 0.2 || patternRatio > 0.8) {
    return {
      valid: false,
      warning: 'pattern ratio is outside the recommended range (0.2 to 0.8)',
    };
  }
  return { valid: true };
}
