/**
 * Localization Utility for STAN.DOM
 * Handles parsing of name strings that could be plain text or JSON objects
 */

export function getLangName(nameData: any, lang: string = 'KO'): string {
  if (!nameData) return '';

  const targetLang = lang.toUpperCase();
  let parsed: any = null;

  // Handle object
  if (typeof nameData === 'object') {
    parsed = nameData;
  } else if (typeof nameData === 'string' && (nameData.trim().startsWith('{') || nameData.trim().startsWith('['))) {
    try {
      parsed = JSON.parse(nameData.trim());
    } catch (e) {
      return nameData;
    }
  } else {
    return nameData;
  }

  if (parsed && typeof parsed === 'object') {
    // Try target lang, then EN, then any value
    return parsed[targetLang] || parsed[lang] || parsed['EN'] || parsed['en'] || Object.values(parsed)[0] || '';
  }

  return nameData;
}
