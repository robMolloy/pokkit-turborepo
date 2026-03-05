import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@repo/pokkit-components";
import "@repo/pokkit-components/styles.css";

const meta: Meta<typeof Button> = {
  component: Button,
  argTypes: {
    type: {
      control: { type: "radio" },
      options: ["button", "submit", "reset"],
    },
    variant: {
      control: { type: "radio" },
      options: [undefined, "default", "destructive", "ghost", "link", "outline", "secondary"],
    },
    size: {
      control: { type: "radio" },
      options: [undefined, "default", "icon", "icon-lg", "icon-sm", "icon-xs", "lg", "sm", "xs"],
    },
    disabled: {
      control: { type: "radio" },
      options: [true, false],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/react/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  render: (props) => (
    <Button
      {...props}
      onClick={(): void => {
        // eslint-disable-next-line no-alert -- alert for demo
        alert("Hello from Turborepo!");
      }}
    >
      {props.children}
    </Button>
  ),
  name: "Button",
  args: {
    children: "Hello",
    type: "button",
    variant: undefined,
    size: undefined,
  },
};
