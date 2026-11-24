export function fitScale(
  clientWidth: number,
  style: Pick<CSSStyleDeclaration, 'paddingLeft' | 'paddingRight'>,
  textWidth: number,
): number {
  const available =
    clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
  if (clientWidth <= 0 || textWidth <= 0) return 1;
  return Math.min(1, Math.max(0, available) / textWidth);
}
