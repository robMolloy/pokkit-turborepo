import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Pokkit Starter",
  tagline: "Pocketbase and a little bit more",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://localhost:3000",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "pokkit", // Usually your GitHub org/user name.
  projectName: "pokkit-starter", // Usually your repo name.

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            "https://github.com/robMolloy/pokkit-turborepo/tree/main/apps/pokkit-starter/pokkit-starter-docs",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Pokkit Starter",
      logo: {
        alt: "Pokkit Starter Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "toolsSidebar",
          position: "left",
          label: "Tools",
        },
        {
          type: "docSidebar",
          sidebarId: "skillsSidebar",
          position: "left",
          label: "Skills",
        },
        {
          type: "docSidebar",
          sidebarId: "plansSidebar",
          position: "left",
          label: "Plans",
        },
        {
          href: "https://github.com/robMolloy/pokkit-turborepo",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Tools",
          items: [{ label: "Tools", to: "/docs/tools" }],
        },
        {
          title: "Skills",
          items: [{ label: "Skills", to: "/docs/skills" }],
        },
        {
          title: "Plans",
          items: [{ label: "Plans", to: "/docs/plans" }],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Pokkit Starter, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
