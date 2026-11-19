import { resolveMarkdownImageSrc, type FileSrcConverter } from "./imageSrc";

export type ContentRun =
  | { type: "text"; text: string }
  | { type: "image"; src: string; alt: string };

// 只匹配内联图片语法 ![alt](src)，可选标题部分一并吃掉，避免把它当正文输出
const IMAGE_SYNTAX = /!\[([^\]]*)\]\(\s*<?([^()\s<>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

// 便签是纯文本渲染路径，不能直接信任正文里的任意 src：
// 允许本地相对路径与应用自己生成的 images/ 前缀，以及明确安全的协议
const ALLOWED_SCHEME = /^(?:(?:https?|blob|file):|data:image\/)/i;

/**
 * 判断图片地址是否可以安全地交给 <img src>。
 * 相对路径没有协议，一律放行（由 resolveMarkdownImageSrc 决定是否解析成 asset URL）。
 */
export function isSafeImageSrc(src: string): boolean {
  const normalized = src.trim();
  if (!normalized) return false;

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized);
  if (!scheme) return true;

  return ALLOWED_SCHEME.test(normalized);
}

/**
 * 把一段可能混有 ![alt](src) 的纯文本切成「文字 / 图片」片段。
 * 不安全的图片地址会原样留在文字片段里，不会被渲染。
 */
export function splitImageRuns(content: string): ContentRun[] {
  const runs: ContentRun[] = [];
  let cursor = 0;

  for (const match of content.matchAll(IMAGE_SYNTAX)) {
    const [whole, alt, src] = match;
    if (!isSafeImageSrc(src)) continue;

    const start = match.index ?? 0;
    if (start > cursor) {
      runs.push({ type: "text", text: content.slice(cursor, start) });
    }
    runs.push({ type: "image", src: src.trim(), alt: alt.trim() });
    cursor = start + whole.length;
  }

  if (cursor < content.length) {
    runs.push({ type: "text", text: content.slice(cursor) });
  }

  return runs;
}

/** 正文里是否含有可渲染的图片语法，供需要提前分流渲染路径的调用方使用 */
export function hasImageSyntax(content: string): boolean {
  for (const match of content.matchAll(IMAGE_SYNTAX)) {
    if (isSafeImageSrc(match[2])) return true;
  }
  return false;
}

/** 复用 Markdown 预览的同一套解析规则，保证便签与预览指向同一张图 */
export function resolveRunImageSrc(
  src: string,
  imageBaseDir: string | undefined,
  convertFileSrc: FileSrcConverter,
): string {
  return resolveMarkdownImageSrc(src, imageBaseDir, convertFileSrc);
}
