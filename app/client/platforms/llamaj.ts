import {
  LlamaJavaPath,
  REQUEST_TIMEOUT_MS,
} from "@/app/constant";
import { useAppConfig, useChatStore, useAccessStore } from "@/app/store";

import { ChatOptions, getHeaders, ServiceApi, CharacterModel } from "../api";
import Locale from "../../locales";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";
import { prettyObject } from "@/app/utils/format";
import {
  showToast,
} from "../../components/ui-lib";

export interface ListCharactersResponse {
  characters: Array<{
    name: string;
    model_name: string;
    model_type: string;
  }>;
}

const MAX_REQUEST_RETRIES = 20;

class RetriableError extends Error { }

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class OctetChatApi implements ServiceApi {

  path(path: string): string {
    const accessStore = useAccessStore.getState();
    let baseUrl = accessStore.url;

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1);
    }

    return [baseUrl, path].join("/");
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  async chat(options: ChatOptions) {
    let requestRetries = 0;

    const messages = options.messages.map((v) => ({
      role: v.role,
      content: v.content,
    }));

    const requestPayload = {
      messages,
      stream: options.config.stream,
      session: useChatStore.getState().currentSession().id,
      user: useAppConfig.getState().user,
    };

    console.log("[Request] request payload: ", requestPayload);

    const shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const chatPath = this.path(LlamaJavaPath.ChatPath);
      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: getHeaders(),
      };

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      if (shouldStream) {
        let responseText = "";
        let remainText = "";
        let finished = false;

        // animate response to make it looks smooth
        function animateResponseText() {
          if (finished || controller.signal.aborted) {
            responseText += remainText;
            console.log("[Response] finished");
            return;
          }

          if (remainText.length > 0) {
            const fetchCount = Math.max(1, Math.round(remainText.length / 60));
            const fetchText = remainText.slice(0, fetchCount);
            responseText += fetchText;
            remainText = remainText.slice(fetchCount);
            options.onUpdate?.(responseText, fetchText);
          }

          requestAnimationFrame(animateResponseText);
        }

        // start animaion
        animateResponseText();

        const finish = () => {
          if (!finished) {
            finished = true;
            options.onFinish(responseText + remainText);
          }
        };

        controller.signal.onabort = finish;

        fetchEventSource(chatPath, {
          ...chatPayload,
          async onopen(res) {
            clearTimeout(requestTimeoutId);
            const contentType = res.headers.get("content-type");
            console.log(
              "[Request] request response content type: ",
              contentType,
            );

            if (contentType?.startsWith("text/plain")) {
              responseText = await res.clone().text();
              return finish();
            }

            if (res.status == 204 && requestRetries < MAX_REQUEST_RETRIES) {
              await sleep(5000);
              throw new RetriableError("Service is busy, please try again later");
            }

            if (
              !res.ok ||
              !res.headers
                .get("content-type")
                ?.startsWith(EventStreamContentType) ||
              res.status !== 200
            ) {
              const responseTexts = [responseText];
              let extraInfo = await res.clone().text();
              try {
                const resJson = await res.clone().json();
                extraInfo = prettyObject(resJson);
              } catch { }

              if (extraInfo) {
                responseTexts.push(extraInfo);
              }

              responseText = responseTexts.join("\n\n");

              return finish();
            }
          },
          onmessage(msg) {
            if (msg.data === "[DONE]" || finished) {
              return finish();
            }
            const text = msg.data;
            try {
              const json = JSON.parse(text) as {
                choices: Array<{
                  delta: {
                    content: string;
                  };
                }>;
              };
              const delta = json.choices[0]?.delta?.content;
              if (delta) {
                remainText += delta;
              }
            } catch (e) {
              console.error("[Request] parse error", text);
            }
          },
          onclose() {
            finish();
          },
          onerror(e) {
            if (e instanceof RetriableError) {
              requestRetries++;
              if (requestRetries >= MAX_REQUEST_RETRIES) {
                remainText = Locale.Store.Retry;
                return;
              }
            } else {
              options.onError?.(e);
              throw e;
            }
          },
          openWhenHidden: true,
        });
      }
    } catch (e) {
      console.log("[Request] failed to make a chat request", e);
      options.onError?.(e as Error);
    }
  }

  async characters(): Promise<CharacterModel[]> {
    const res = await fetch(this.path(LlamaJavaPath.ListCharactersPath), {
      body: "{}",
      method: "POST",
      headers: {
        ...getHeaders(),
      },
    });

    const resJson = (await res.json()) as ListCharactersResponse;
    const chatCharacters = resJson.characters;
    console.log("[AI Characters]", chatCharacters);

    if (!chatCharacters) {
      return [];
    }

    return chatCharacters.map((m) => ({
      name: m.name,
      model_name: m.model_name,
      model_type: m.model_type,
      available: true
    }));
  }

  async reload(character: string) {
    if (character == "default") {
      showToast(Locale.Settings.Model.Reload.tips);
      return;
    }
    const requestBody = {
      character: character
    };

    const res = await fetch(this.path(LlamaJavaPath.RelodeCharactersPath), {
      body: JSON.stringify(requestBody),
      method: "POST",
      headers: {
        ...getHeaders(),
      }
    });
    if (res.status === 200) {
      console.log("[Reload]", "AI character reload successful: " + character);
      showToast(Locale.Settings.Model.Reload.success);
    } else if (res.status === 204) {
      showToast(Locale.Settings.Model.Reload.retry);
    } else {
      console.log("[Reload]", "AI character reload failed: " + character);
      showToast(Locale.Settings.Model.Reload.error);
    }
  }

  async reset(session: string) {
    const requestBody = {
      user: useAppConfig.getState().user,
      session: session
    };

    const res = await fetch(this.path(LlamaJavaPath.ResetSessionPath), {
      body: JSON.stringify(requestBody),
      method: "POST",
      headers: {
        ...getHeaders(),
      }
    });
    if (res.status === 200) {
      console.log("[Reset session]", "User session reset successful");
    } else {
      console.log("[Reset session]", "User session reset failed");
    }
  }

}
export { LlamaJavaPath };
