export const DEFAULT_API_HOST = "https://octet.chat"

export enum Path {
  Home = "/",
  Chat = "/chat",
  Settings = "/settings",
}

export enum ApiPath {
  Cors = "/api/cors",
  OctetChat = "/api/llamaj",
}

export enum StoreKey {
  Chat = "chat-store",
  Access = "chat-access",
  Config = "chat-config"
}

export const DEFAULT_SIDEBAR_WIDTH = 300;
export const MAX_SIDEBAR_WIDTH = 500;
export const MIN_SIDEBAR_WIDTH = 230;
export const NARROW_SIDEBAR_WIDTH = 100;

export const LAST_INPUT_KEY = "last-input";
export const UNFINISHED_INPUT = (id: string) => "unfinished-input-" + id;
export const REQUEST_TIMEOUT_MS = 180000;
export const EXPORT_MESSAGE_CLASS_NAME = "export-markdown";

export const LlamaJavaPath = {
  ChatPath: "v1/chat/completions",
  ListCharactersPath: "v1/characters",
  ResetSessionPath: "v1/session/reset",
  RelodeCharactersPath: "v1/characters/reload",
};

export const OctetChat = {
  ExampleEndpoint: "http://127.0.0.1:8152",
};

export const DEFAULT_INPUT_TEMPLATE = `{{input}}`; // input / time / model / lang
export const DEFAULT_SYSTEM_TEMPLATE = `
You are a helpful, respectful and honest assistant. Always answer as helpfully as possible, while being safe.
Your answers should not include any harmful, unethical, racist, sexist, toxic, dangerous, or illegal content.
Please ensure that your responses are socially unbiased and positive in nature.
If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.
`;


export const DEFAULT_CHARACTERS = [];
export const CHAT_PAGE_SIZE = 15;
export const MAX_RENDER_MSG_COUNT = 45;
