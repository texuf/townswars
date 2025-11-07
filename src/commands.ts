import type { PlainMessage, SlashCommand } from "@towns-protocol/proto";

const commands = [
  {
    name: "engage",
    description: "Join the Towns Wars game",
  },
  {
    name: "quit",
    description: "Leave the game and delete your town",
  },
] as const satisfies PlainMessage<SlashCommand>[];

export default commands;
