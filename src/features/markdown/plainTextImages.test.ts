import { describe, expect, test, vi } from "vitest";
import {
  hasImageSyntax,
  isSafeImageSrc,
  resolveRunImageSrc,
  splitImageRuns,
} from "./plainTextImages";

describe("splitImageRuns", () => {
  test("keeps plain text as a single text run so text tiles render unchanged", () => {
    expect(splitImageRuns("今天只写了两行字")).toEqual([
      { type: "text", text: "今天只写了两行字" },
    ]);
  });

  test("turns a pasted image-only note into an image run", () => {
    expect(splitImageRuns("![](images/note-1/photo.png)")).toEqual([
      { type: "image", src: "images/note-1/photo.png", alt: "" },
    ]);
  });

  test("splits text and pasted-image syntax in source order", () => {
    const content = "看图：\n![](images/note-1/a.png)\n就是这样";
    expect(splitImageRuns(content)).toEqual([
      { type: "text", text: "看图：\n" },
      { type: "image", src: "images/note-1/a.png", alt: "" },
      { type: "text", text: "\n就是这样" },
    ]);
  });

  test("keeps alt text and drops an optional title", () => {
    expect(splitImageRuns('![截图](images/n/b.png "标题")')).toEqual([
      { type: "image", src: "images/n/b.png", alt: "截图" },
    ]);
  });

  test("normalizes Windows-style separators through the shared resolver", () => {
    expect(splitImageRuns("![](images\\n\\c.png)")[0]).toEqual({
      type: "image",
      src: "images\\n\\c.png",
      alt: "",
    });
  });

  test("leaves unsafe sources as plain text instead of rendering them", () => {
    const content = "![](javascript:alert(1)) 与 ![](images/n/ok.png)";
    const runs = splitImageRuns(content);
    expect(runs[0]).toEqual({ type: "text", text: "![](javascript:alert(1)) 与 " });
    expect(runs[1]).toEqual({ type: "image", src: "images/n/ok.png", alt: "" });
  });

  test("accepts remote, data and file images", () => {
    const content = [
      "![](https://example.com/a.png)",
      "![](data:image/png;base64,AAAA)",
      "![](file:///C:/temp/b.png)",
    ].join("\n");
    expect(splitImageRuns(content).filter((run) => run.type === "image")).toHaveLength(3);
  });

  test("ignores incomplete syntax and empty content", () => {
    expect(splitImageRuns("![](images/n/a.png")).toEqual([
      { type: "text", text: "![](images/n/a.png" },
    ]);
    expect(splitImageRuns("![]()")).toEqual([{ type: "text", text: "![]()" }]);
    expect(splitImageRuns("")).toEqual([]);
  });
});

describe("hasImageSyntax", () => {
  test("detects renderable image syntax only", () => {
    expect(hasImageSyntax("![](images/n/a.png)")).toBe(true);
    expect(hasImageSyntax("![](javascript:alert(1))")).toBe(false);
    expect(hasImageSyntax("普通文本")).toBe(false);
  });
});

describe("isSafeImageSrc", () => {
  test("allows relative paths and known image protocols", () => {
    for (const src of [
      "images/n/a.png",
      "./a.png",
      "../a.png",
      "https://example.com/a.png",
      "data:image/webp;base64,AAAA",
      "file:///C:/a.png",
    ]) {
      expect(isSafeImageSrc(src)).toBe(true);
    }
  });

  test("rejects script and unknown schemes", () => {
    for (const src of ["javascript:alert(1)", "vbscript:x", "chrome://settings", "  "]) {
      expect(isSafeImageSrc(src)).toBe(false);
    }
  });
});

describe("resolveRunImageSrc", () => {
  const convertFileSrc = vi.fn((path: string) => `asset://${path}`);

  test("resolves note images against the app image base dir", () => {
    expect(resolveRunImageSrc("images/n/a.png", "C:/notes", convertFileSrc)).toBe(
      "asset://C:/notes/images/n/a.png",
    );
  });

  test("passes non-note images through untouched", () => {
    expect(resolveRunImageSrc("https://example.com/a.png", "C:/notes", convertFileSrc)).toBe(
      "https://example.com/a.png",
    );
  });
});
