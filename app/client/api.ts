
import { OctetChatApi } from "./platforms/llamaj";

export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export interface RequestMessage {
  role: MessageRole;
  content: string;
}

export interface ChatConfig {
  stream?: boolean;
}

export interface ChatOptions {
  messages: RequestMessage[];
  config: ChatConfig;

  onUpdate?: (message: string, chunk: string) => void;
  onFinish: (message: string) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
}

export interface CharacterModel {
  name: string;
  model_name: string;
  model_type: string;
  available: boolean;
}

export abstract class ServiceApi {
  abstract chat(options: ChatOptions): Promise<void>;
  abstract characters(): Promise<CharacterModel[]>;
  abstract reload(character: string): Promise<void>;
  abstract reset(session: string): Promise<void>;
}

export class ClientApi {
  public llm: ServiceApi;

  constructor() {
    this.llm = new OctetChatApi();
  }

  config() { }

}

export function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-requested-with": "XMLHttpRequest",
    "Accept": "application/json",
  };
  return headers;
}
