import type { PlainMessage, SlashCommand } from "@towns-protocol/proto";

const commands = [
  {
    name: "engage",
    description: "Join the Towns Wars game",
  },
] as const satisfies PlainMessage<SlashCommand>[];

export default commands;
