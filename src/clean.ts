// Coin names, labels, reasons and usernames come from the chain or from public registries, and anyone can write some
// of them. Every string conyr prints from an answer goes through cleanString first: hidden characters and terminal
// escape sequences are removed, instruction-like framing is replaced with [removed], and long text is cut. Field names,
// numbers, true, false and null are not touched. There is no switch to turn this off.

const REMOVED = '[removed]';
const CUT = '…[cut]';
const MAX = 500;

// Terminal escape sequences, removed whole: CSI (colours, cursor moves), OSC (window titles, hyperlinks) up to its
// terminator, DCS/SOS/PM/APC strings, and the short ESC sequences. The 8-bit forms too.
const ESCAPES =
  /(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]|(?:\u001b\]|\u009d)[^\u0007\u001b\u009c]*(?:\u0007|\u001b\\|\u009c)?|(?:\u001b[PX^_]|[\u0090\u0098\u009e\u009f])[^\u001b\u009c]*(?:\u001b\\|\u009c)?|\u001b[ -/]*[0-~]/g;

// Control characters other than tab, newline and carriage return; format characters (zero-width characters,
// direction marks and overrides, soft hyphen, byte-order mark, Unicode tag characters); variation selectors; and the
// invisible fillers.
const HIDDEN =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\p{Cf}͏ᅟᅠ឴឵᠋-᠍᠏ㅤ︀-️ﾠ\u{e0100}-\u{e01ef}]/gu;

const ROLE = 'system|assistant|user|developer|inst|instructions?|prompt';

// Instruction-like framing. A short, fixed list, in this order.
const FRAMING: Array<[RegExp, (match: string, ...groups: string[]) => string]> = [
  [/<\|[^|>\n]{1,40}\|>/g, () => REMOVED], // <|im_start|>, <|system|>, <|endoftext|>
  [/<<\s*\/?\s*SYS\s*>>/gi, () => REMOVED], // <<SYS>>, <</SYS>>
  [new RegExp(`<\\s*\\/?\\s*(?:${ROLE}|im_start|im_end)\\b[^>\\n]{0,40}>`, 'gi'), () => REMOVED], // <system>, </system>
  [new RegExp(`\\[\\s*\\/?\\s*(?:${ROLE})\\b[^\\]\\n]{0,40}\\]`, 'gi'), () => REMOVED], // [system], [/INST], [SYSTEM: ...]
  [
    /\b(?:ignore|disregard|forget|override)\b([\s\w]{0,40}?)\b(?:instructions?|rules?|prompts?)\b/gi,
    (match, between = '') => (/\b(?:previous|prior|above|all|your)\b/i.test(between) ? REMOVED : match),
  ],
  [/\byou\s+are\s+now\s+an?\b/gi, () => REMOVED],
  [/\bnew\s+instructions?\s*:/gi, () => REMOVED],
  [/\bsystem\s+(?:prompts?|overrides?)\b/gi, () => REMOVED],
  [/\bdeveloper\s+messages?\b/gi, () => REMOVED],
];

export function cleanString(value: string): string {
  let out = value.replace(ESCAPES, '').replace(HIDDEN, '');
  for (const [re, replace] of FRAMING) out = out.replace(re, replace);
  const chars = [...out];
  return chars.length > MAX ? chars.slice(0, MAX).join('') + CUT : out;
}

// A copy of an answer with every string cleaned, and how many strings changed.
export function cleanDeep<T>(value: T): { data: T; cleaned: number } {
  let cleaned = 0;
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const out = cleanString(node);
      if (out !== node) cleaned++;
      return out;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
    }
    return node;
  };
  const data = walk(value) as T;
  return { data, cleaned };
}
