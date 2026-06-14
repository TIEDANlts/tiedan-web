export function isThemeOptionActive(mounted: boolean, theme: string | undefined, optionValue: string) {
  return mounted && theme === optionValue;
}
