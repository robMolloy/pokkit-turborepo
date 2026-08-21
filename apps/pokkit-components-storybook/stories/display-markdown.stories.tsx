import type { Meta, StoryObj } from "@storybook/react";
import { DisplayMarkdown } from "@repo/pokkit-components";
import "@repo/pokkit-components/styles.css";
import "@repo/pokkit-shadcn/styles.css";

const sampleMarkdown = `# Welcome to Pokkit Blog

A formatted markdown preview for titles, body copy, lists, code, quotes, links, and images.

## Why markdown

Markdown keeps writing **simple** while still supporting *emphasis*, [external docs](https://example.com), and [internal posts](/blog-post/123).

### Checklist for a post

- Short title and subtitle
- One hero image
- A published date when it is ready

> Drafts stay unpublished until you flip the switch.

Inline code looks like \`publishedAt\`, and fenced blocks stay readable:

\`\`\`
# title
![caption](image-url)
\`\`\`

![A wide landscape](https://placehold.co/600x200)
`;

const meta: Meta<typeof DisplayMarkdown> = {
  component: DisplayMarkdown,
  argTypes: {
    markdown: {
      control: { type: "text" },
    },
  },
};

export default meta;

type Story = StoryObj<typeof DisplayMarkdown>;

export const BlogPost: Story = {
  name: "Blog post",
  args: {
    markdown: sampleMarkdown,
  },
};

export const Empty: Story = {
  name: "Empty",
  args: {
    markdown: "",
  },
};
