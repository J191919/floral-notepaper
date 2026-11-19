import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { Tile } from "./Tile";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}));

describe("Tile", () => {
  test("renders a pasted image even when markdown rendering is off", () => {
    const markup = renderToStaticMarkup(
      <Tile
        content="![](images/note-1/photo.png)"
        renderMarkdown={false}
        imageBaseDir="C:/notes"
      />,
    );

    expect(markup).toContain('<img src="asset://C:/notes/images/note-1/photo.png"');
    expect(markup).not.toContain("![](");
  });

  test("keeps surrounding text and renders it without markdown parsing", () => {
    const markup = renderToStaticMarkup(
      <Tile
        content={"看图：\n![](images/note-1/a.png)\n**不该加粗**"}
        renderMarkdown={false}
        imageBaseDir="C:/notes"
      />,
    );

    expect(markup).toContain("看图：");
    expect(markup).toContain('<img src="asset://C:/notes/images/note-1/a.png"');
    expect(markup).toContain("**不该加粗**");
    expect(markup).not.toContain("<strong>");
  });

  test("leaves pure text notes untouched", () => {
    const markup = renderToStaticMarkup(
      <Tile content="今天只写了两行字" renderMarkdown={false} imageBaseDir="C:/notes" />,
    );

    expect(markup).toContain('class="leading-[1.8] whitespace-pre-wrap font-body"');
    expect(markup).not.toContain("<img");
  });

  test("does not render unsafe image sources", () => {
    const markup = renderToStaticMarkup(
      <Tile content="![](javascript:alert(1))" renderMarkdown={false} imageBaseDir="C:/notes" />,
    );

    expect(markup).not.toContain("<img");
    expect(markup).toContain("![](javascript:alert(1))");
  });
});
