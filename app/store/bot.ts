import { getLang, Lang } from "../locales";
import { DEFAULT_TOPIC, ChatMessage } from "./chat";
import { nanoid } from "nanoid";

export type Bot = {
  id: string;
  createdAt: number;
  avatar: string;
  name: string;
  hideContext?: boolean;
  context: ChatMessage[];
  lang: Lang;
  builtin: boolean;
};

export const DEFAULT_BOT_STATE = {
  bots: {} as Record<string, Bot>,
};

export type BotState = typeof DEFAULT_BOT_STATE;

export const DEFAULT_BOT_AVATAR = "octet-bot";
export const createEmptyBot = () =>
  ({
    id: nanoid(),
    avatar: DEFAULT_BOT_AVATAR,
    name: DEFAULT_TOPIC,
    context: [],
    lang: getLang(),
    builtin: false,
    createdAt: Date.now(),
  }) as Bot;
