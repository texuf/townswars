import type { PlainMessage, SlashCommand } from "@towns-protocol/proto";

const commands = [
  {
    name: "engage",
    description: "Join the Towns Wars game",
  },
  {
    name: "help",
    description: "Get help with bot commands",
  },
  {
    name: "time",
    description: "Get the current time",
  },
  {
    name: "attack",
    description: "Attack another town",
  },
] as const satisfies PlainMessage<SlashCommand>[];

export default commands;
