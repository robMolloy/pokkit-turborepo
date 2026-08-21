import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisplayMarkdown, getSafeUrl, isHttpUrl } from "./DisplayMarkdown";

describe("getSafeUrl", () => {
  it("returns undefined for empty values", () => {
    expect(getSafeUrl(undefined)).toBeUndefined();
    expect(getSafeUrl("")).toBeUndefined();
    expect(getSafeUrl("   ")).toBeUndefined();
  });

  it("allows http, https, and relative urls", () => {
    expect(getSafeUrl("https://example.com")).toBe("https://example.com");
    expect(getSafeUrl("http://example.com/path")).toBe("http://example.com/path");
    expect(getSafeUrl("/blog-post/123")).toBe("/blog-post/123");
    expect(getSafeUrl("#heading")).toBe("#heading");
  });

  it("rejects unsafe protocols", () => {
    expect(getSafeUrl("javascript:alert(1)")).toBeUndefined();
    expect(getSafeUrl("data:text/html,hello")).toBeUndefined();
    expect(getSafeUrl("vbscript:msgbox(1)")).toBeUndefined();
    expect(getSafeUrl("file:///etc/passwd")).toBeUndefined();
  });
});

describe("isHttpUrl", () => {
  it("detects http and https urls", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("/relative")).toBe(false);
    expect(isHttpUrl("#anchor")).toBe(false);
  });
});

describe("DisplayMarkdown", () => {
  it("renders headings, paragraphs, and emphasis", () => {
    render(
      <DisplayMarkdown markdown={"# Title\n\nA paragraph with **bold** and *italic* text."} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeDefined();
    expect(screen.getByText("bold")).toBeDefined();
    expect(screen.getByText("italic")).toBeDefined();
  });

  it("renders lists, code, and blockquotes", () => {
    render(
      <DisplayMarkdown
        markdown={[
          "- First item",
          "- Second item",
          "",
          "> A quoted thought",
          "",
          "`inline code`",
        ].join("\n")}
      />,
    );

    expect(screen.getByText("First item")).toBeDefined();
    expect(screen.getByText("Second item")).toBeDefined();
    expect(screen.getByText("A quoted thought")).toBeDefined();
    expect(screen.getByText("inline code")).toBeDefined();
  });

  it("opens http links in a new tab", () => {
    render(<DisplayMarkdown markdown={"[Docs](https://example.com)"} />);

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps relative links in the same tab", () => {
    render(<DisplayMarkdown markdown={"[Post](/blog-post/123)"} />);

    const link = screen.getByRole("link", { name: "Post" });
    expect(link.getAttribute("href")).toBe("/blog-post/123");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("does not render javascript links as anchors", () => {
    render(<DisplayMarkdown markdown={"[Click me](javascript:alert(1))"} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Click me")).toBeDefined();
  });

  it("renders images and uses alt text as a caption", () => {
    render(<DisplayMarkdown markdown={"![A cat](https://example.com/cat.png)"} />);

    const image = screen.getByRole("img", { name: "A cat" });
    expect(image.getAttribute("src")).toBe("https://example.com/cat.png");
    expect(screen.getByText("A cat")).toBeDefined();
  });

  it("does not render images with unsafe sources", () => {
    render(<DisplayMarkdown markdown={"![xss](javascript:alert(1))"} />);

    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders an empty markdown string without crashing", () => {
    const { container } = render(<DisplayMarkdown markdown="" />);
    expect(container.querySelector(".react-markdown")).toBeDefined();
  });
});
