import { pinyin } from 'pinyin-pro';

/**
 * 将文本转换为拼音首字母
 */
export function getPinyinInitials(text: string): string {
  return text
    .split('')
    .map(char => {
      if (/[a-zA-Z0-9]/.test(char)) {
        return char.toLowerCase();
      }
      const py = pinyin(char, { pattern: 'first', toneType: 'none' });
      return py || char.toLowerCase();
    })
    .join('');
}

/**
 * 将文本转换为完整拼音
 */
export function getPinyinFull(text: string): string {
  return text
    .split('')
    .map(char => {
      if (/[a-zA-Z0-9]/.test(char)) {
        return char.toLowerCase();
      }
      const py = pinyin(char, { pattern: 'pinyin', toneType: 'none' });
      return py || char.toLowerCase();
    })
    .join('');
}

/**
 * 检查文本是否匹配搜索词（支持拼音）
 */
export function matchesPinyinSearch(text: string, query: string): boolean {
  if (!query) {
    return true;
  }

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // 直接匹配
  if (textLower.includes(queryLower)) {
    return true;
  }

  // 拼音首字母匹配
  const initials = getPinyinInitials(text);
  if (initials.includes(queryLower)) {
    return true;
  }

  // 完整拼音匹配
  const fullPinyin = getPinyinFull(text);
  if (fullPinyin.includes(queryLower)) {
    return true;
  }

  return false;
}
