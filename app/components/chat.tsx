import { useDebouncedCallback } from "use-debounce";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  Fragment,
} from "react";

import SendWhiteIcon from "../icons/send-white.svg";
import RenameIcon from "../icons/rename.svg";
import ExportIcon from "../icons/share.svg";
import ReturnIcon from "../icons/return.svg";
import CopyIcon from "../icons/copy.svg";
import LoadingIcon from "../icons/three-dots.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import ResetIcon from "../icons/reload.svg";
import DeleteIcon from "../icons/clear.svg";
import EditIcon from "../icons/rename.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";

import LightIcon from "../icons/light.svg";
import DarkIcon from "../icons/dark.svg";
import AutoIcon from "../icons/auto.svg";
import BottomIcon from "../icons/bottom.svg";
import StopIcon from "../icons/pause.svg";

import {
  ChatMessage,
  SubmitKey,
  useChatStore,
  BOT_HELLO,
  createMessage,
  Theme,
  useAppConfig,
  DEFAULT_TOPIC,
} from "../store";

import {
  copyToClipboard,
  selectOrCopy,
  autoGrowTextArea,
  useMobileScreen,
} from "../utils";

import dynamic from "next/dynamic";

import { ChatControllerPool } from "../client/controller";
import Locale from "../locales";

import { IconButton } from "./button";
import styles from "./chat.module.scss";

import {
  List,
  ListItem,
  Modal,
  showPrompt,
} from "./ui-lib";
import { useNavigate } from "react-router-dom";
import {
  CHAT_PAGE_SIZE,
  LAST_INPUT_KEY,
  Path,
  REQUEST_TIMEOUT_MS,
  UNFINISHED_INPUT,
} from "../constant";
import { Avatar } from "./emoji";
import { useChatCommand } from "../command";
import { prettyObject } from "../utils/format";
import { ExportMessageModal } from "./exporter";
import { getClientConfig } from "../config/client";

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;
  const isComposing = useRef(false);

  useEffect(() => {
    const onCompositionStart = () => {
      isComposing.current = true;
    };
    const onCompositionEnd = () => {
      isComposing.current = false;
    };

    window.addEventListener("compositionstart", onCompositionStart);
    window.addEventListener("compositionend", onCompositionEnd);

    return () => {
      window.removeEventListener("compositionstart", onCompositionStart);
      window.removeEventListener("compositionend", onCompositionEnd);
    };
  }, []);

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && (e.nativeEvent.isComposing || isComposing.current))
      return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

function ChatAction(props: {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}) {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState({
    full: 16,
    icon: 16,
  });

  function updateWidth() {
    if (!iconRef.current || !textRef.current) return;
    const getWidth = (dom: HTMLDivElement) => dom.getBoundingClientRect().width;
    const textWidth = getWidth(textRef.current);
    const iconWidth = getWidth(iconRef.current);
    setWidth({
      full: textWidth + iconWidth,
      icon: iconWidth,
    });
  }

  return (
    <div
      className={`${styles["chat-input-action"]} clickable`}
      onClick={() => {
        props.onClick();
        setTimeout(updateWidth, 1);
      }}
      onMouseEnter={updateWidth}
      onTouchStart={updateWidth}
      style={
        {
          "--icon-width": `${width.icon}px`,
          "--full-width": `${width.full}px`,
        } as React.CSSProperties
      }
    >
      <div ref={iconRef} className={styles["icon"]}>
        {props.icon}
      </div>
      <div className={styles["text"]} ref={textRef}>
        {props.text}
      </div>
    </div>
  );
}

function useScrollToBottom() {
  // for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  function scrollDomToBottom() {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }

  // auto scroll
  useEffect(() => {
    if (autoScroll) {
      scrollDomToBottom();
    }
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

export function ChatActions(props: {
  scrollToBottom: () => void;
  hitBottom: boolean;
}) {
  const config = useAppConfig();

  // switch themes
  const theme = config.theme;
  function nextTheme() {
    const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // stop all responses
  const couldStop = ChatControllerPool.hasPending();
  const stopAll = () => ChatControllerPool.stopAll();

  return (
    <div className={styles["chat-input-actions"]}>
      {couldStop && (
        <ChatAction
          onClick={stopAll}
          text={Locale.Chat.InputActions.Stop}
          icon={<StopIcon />}
        />
      )}
      {!props.hitBottom && (
        <ChatAction
          onClick={props.scrollToBottom}
          text={Locale.Chat.InputActions.ToBottom}
          icon={<BottomIcon />}
        />
      )}

      <ChatAction
        onClick={nextTheme}
        text={Locale.Chat.InputActions.Theme[theme]}
        icon={
          <>
            {theme === Theme.Auto ? (
              <AutoIcon />
            ) : theme === Theme.Light ? (
              <LightIcon />
            ) : theme === Theme.Dark ? (
              <DarkIcon />
            ) : null}
          </>
        }
      />

    </div>
  );
}

export function EditMessageModal(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const [messages, setMessages] = useState(session.messages.slice());

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.EditMessage.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            text={Locale.UI.Cancel}
            icon={<CancelIcon />}
            key="cancel"
            onClick={() => {
              props.onClose();
            }}
          />,
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              chatStore.updateCurrentSession(
                (session) => (session.messages = messages),
              );
              props.onClose();
            }}
          />,
        ]}
      >
        <List>
          <ListItem
            title={Locale.Chat.EditMessage.Topic.Title}
            subTitle={Locale.Chat.EditMessage.Topic.SubTitle}
          >
            <input
              type="text"
              value={session.topic}
              onInput={(e) =>
                chatStore.updateCurrentSession(
                  (session) => (session.topic = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </List>

      </Modal>
    </div>
  );
}

function _Chat() {
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const fontSize = config.fontSize;

  const [showExport, setShowExport] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const { scrollRef, setAutoScroll, scrollDomToBottom } = useScrollToBottom();
  const [hitBottom, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();

  // auto grow input
  const [inputRows, setInputRows] = useState(2);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows),
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput]);

  // chat commands shortcuts
  const chatCommands = useChatCommand({
    new: () => chatStore.newSession(),
    prev: () => chatStore.nextSession(-1),
    next: () => chatStore.nextSession(1),
    clear: () =>
      chatStore.updateCurrentSession(
        (session) => (session.clearContextIndex = session.messages.length),
      ),
    del: () => chatStore.deleteSession(chatStore.currentSessionIndex),
  });

  const onInput = (text: string) => {
    setUserInput(text);
  };

  const doSubmit = (userInput: string) => {
    if (userInput.trim() === "") return;
    const matchCommand = chatCommands.match(userInput);
    if (matchCommand.matched) {
      setUserInput("");
      matchCommand.invoke();
      return;
    }
    setIsLoading(true);
    chatStore.onUserInput(userInput).then(() => setIsLoading(false));
    localStorage.setItem(LAST_INPUT_KEY, userInput);
    setUserInput("");
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  // stop response
  const onUserStop = (messageId: string) => {
    ChatControllerPool.stop(session.id, messageId);
  };

  useEffect(() => {
    chatStore.updateCurrentSession((session) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      session.messages.forEach((m) => {
        // check if should stop all stale messages
        if (m.isError || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }

          if (m.content.length === 0) {
            m.isError = true;
            m.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(localStorage.getItem(LAST_INPUT_KEY) ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e)) {
      doSubmit(userInput);
      e.preventDefault();
    }
  };
  const onRightClick = (e: any, message: ChatMessage) => {
    // copy to clipboard
    if (selectOrCopy(e.currentTarget, message.content)) {
      if (userInput.length === 0) {
        setUserInput(message.content);
      }

      e.preventDefault();
    }
  };

  const deleteMessage = (msgId?: string) => {
    chatStore.updateCurrentSession(
      (session) =>
        (session.messages = session.messages.filter((m) => m.id !== msgId)),
    );
  };

  const onDelete = (msgId: string) => {
    deleteMessage(msgId);
  };

  const onResend = (message: ChatMessage) => {
    // when it is resending a message
    // 1. for a user's message, find the next bot response
    // 2. for a bot's message, find the last user's input
    // 3. delete original user input and bot's message
    // 4. resend the user's input

    const resendingIndex = session.messages.findIndex(
      (m) => m.id === message.id,
    );

    if (resendingIndex < 0 || resendingIndex >= session.messages.length) {
      console.error("[Chat] failed to find resending message", message);
      return;
    }

    let userMessage: ChatMessage | undefined;
    let botMessage: ChatMessage | undefined;

    if (message.role === "assistant") {
      // if it is resending a bot's message, find the user input for it
      botMessage = message;
      for (let i = resendingIndex; i >= 0; i -= 1) {
        if (session.messages[i].role === "user") {
          userMessage = session.messages[i];
          break;
        }
      }
    } else if (message.role === "user") {
      // if it is resending a user's input, find the bot's response
      userMessage = message;
      for (let i = resendingIndex; i < session.messages.length; i += 1) {
        if (session.messages[i].role === "assistant") {
          botMessage = session.messages[i];
          break;
        }
      }
    }

    if (userMessage === undefined) {
      console.error("[Chat] failed to resend", message);
      return;
    }

    // delete the original messages
    deleteMessage(userMessage.id);
    deleteMessage(botMessage?.id);

    // resend the message
    setIsLoading(true);
    chatStore.onUserInput(userMessage.content).then(() => setIsLoading(false));
    inputRef.current?.focus();
  };

  const context: RenderMessage[] = useMemo(() => {
    return session.bot.hideContext ? [] : session.bot.context.slice();
  }, [session.bot.context, session.bot.hideContext]);

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    context.push(copiedHello);
  }

  // preview messages
  const renderMessages = useMemo(() => {
    return context
      .concat(session.messages as RenderMessage[])
      .concat(
        isLoading
          ? [
              {
                ...createMessage({
                  role: "assistant",
                  content: "……",
                }),
                preview: true,
              },
            ]
          : [],
      )
      .concat(
        userInput.length > 0 && config.sendPreviewBubble
          ? [
              {
                ...createMessage({
                  role: "user",
                  content: userInput,
                }),
                preview: true,
              },
            ]
          : [],
      );
  }, [
    config.sendPreviewBubble,
    context,
    isLoading,
    session.messages,
    userInput,
  ]);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );
  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const onChatBodyScroll = (e: HTMLElement) => {
    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;

    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom =
      bottomHeight >= e.scrollHeight - (isMobileScreen ? 4 : 10);

    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setHitBottom(isHitBottom);
    setAutoScroll(isHitBottom);
  };

  function scrollToBottom() {
    setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  const clientConfig = useMemo(() => getClientConfig(), []);

  const autoFocus = !isMobileScreen; // wont auto focus on mobile screen
  const showMaxIcon = !isMobileScreen && !clientConfig?.isApp;

  // edit / insert message modal
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  // remember unfinished input
  useEffect(() => {
    // try to load from local storage
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput && userInput.length === 0) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }

    const dom = inputRef.current;
    return () => {
      localStorage.setItem(key, dom?.value ?? "");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.chat} key={session.id}>
      <div className="window-header" data-tauri-drag-region>
        {isMobileScreen && (
          <div className="window-actions">
            <div className={"window-action-button"}>
              <IconButton
                icon={<ReturnIcon />}
                bordered
                title={Locale.Chat.Actions.ChatList}
                onClick={() => navigate(Path.Home)}
              />
            </div>
          </div>
        )}

        <div className={`window-header-title ${styles["chat-body-title"]}`}>
          <div
            className={`window-header-main-title ${styles["chat-body-main-title"]}`}
            onClickCapture={() => setIsEditingMessage(true)}
          >
            {!session.topic ? DEFAULT_TOPIC : session.topic}
          </div>
          <div className="window-header-sub-title">
            {Locale.Chat.SubTitle(session.messages.length)}
          </div>
        </div>
        <div className="window-actions">
          {!isMobileScreen && (
            <div className="window-action-button">
              <IconButton
                icon={<RenameIcon />}
                bordered
                onClick={() => setIsEditingMessage(true)}
              />
            </div>
          )}
          <div className="window-action-button">
            <IconButton
              icon={<ExportIcon />}
              bordered
              title={Locale.Chat.Actions.Export}
              onClick={() => {
                setShowExport(true);
              }}
            />
          </div>
          {showMaxIcon && (
            <div className="window-action-button">
              <IconButton
                icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                bordered
                onClick={() => {
                  config.update(
                    (config) => (config.tightBorder = !config.tightBorder),
                  );
                }}
              />
            </div>
          )}
        </div>

      </div>

      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={(e) => onChatBodyScroll(e.currentTarget)}
        onMouseDown={() => inputRef.current?.blur()}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        {messages.map((message, i) => {
          const isUser = message.role === "user";
          const isContext = i < context.length;
          const showActions =
            i > 0 &&
            !(message.preview || message.content.length === 0) &&
            !isContext;
          const showTyping = message.preview || message.streaming;

          return (
            <Fragment key={message.id}>
              <div
                className={
                  isUser ? styles["chat-message-user"] : styles["chat-message"]
                }
              >
                <div className={styles["chat-message-container"]}>
                  <div className={styles["chat-message-header"]}>
                    <div className={styles["chat-message-avatar"]}>
                      <div className={styles["chat-message-edit"]}>
                        <IconButton
                          icon={<EditIcon />}
                          onClick={async () => {
                            const newMessage = await showPrompt(
                              Locale.Chat.Actions.Edit,
                              message.content,
                              10,
                            );
                            chatStore.updateCurrentSession((session) => {
                              const m = session.bot.context
                                .concat(session.messages)
                                .find((m) => m.id === message.id);
                              if (m) {
                                m.content = newMessage;
                              }
                            });
                          }}
                        ></IconButton>
                      </div>
                      {isUser ? (
                        <Avatar avatar={config.avatar} />
                      ) : (
                        <Avatar avatar={session.bot.avatar} character={config.characterConfig} />
                      )}
                    </div>
                    {showTyping && (
                      <div className={styles["chat-message-status"]}>
                        {Locale.Chat.Typing}
                      </div>
                    )}
                    {showActions && (
                      <div className={styles["chat-message-actions"]}>

                        <div className={styles["chat-input-actions"]}>
                          {message.streaming ? (
                            <ChatAction
                              text={Locale.Chat.Actions.Stop}
                              icon={<StopIcon />}
                              onClick={() => onUserStop(message.id ?? i)}
                            />
                          ) : (
                            <>
                              <ChatAction
                                text={Locale.Chat.Actions.Retry}
                                icon={<ResetIcon />}
                                onClick={() => onResend(message)}
                              />

                              <ChatAction
                                text={Locale.Chat.Actions.Delete}
                                icon={<DeleteIcon />}
                                onClick={() => onDelete(message.id ?? i)}
                              />

                              <ChatAction
                                text={Locale.Chat.Actions.Copy}
                                icon={<CopyIcon />}
                                onClick={() => copyToClipboard(message.content)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles["chat-message-item"]}>
                    <Markdown
                      content={message.content}
                      loading={
                        (message.preview || message.streaming) &&
                        message.content.length === 0 &&
                        !isUser
                      }
                      onContextMenu={(e) => onRightClick(e, message)}
                      onDoubleClickCapture={() => {
                        if (!isMobileScreen) return;
                        setUserInput(message.content);
                      }}
                      fontSize={fontSize}
                      parentRef={scrollRef}
                      defaultShow={i >= messages.length - 6}
                    />
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className={styles["chat-input-panel"]}>
      <ChatActions
          scrollToBottom={scrollToBottom}
          hitBottom={hitBottom}
        />

        <div className={styles["chat-input-panel-inner"]}>
          <textarea
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={Locale.Chat.Input(submitKey)}
            onInput={(e) => onInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            onFocus={scrollToBottom}
            onClick={scrollToBottom}
            rows={inputRows}
            autoFocus={autoFocus}
            style={{
              fontSize: config.fontSize,
            }}
          />
          <IconButton
            icon={<SendWhiteIcon />}
            text={Locale.Chat.Send}
            className={styles["chat-input-send"]}
            type="primary"
            onClick={() => doSubmit(userInput)}
          />
        </div>
      </div>

      {showExport && (
        <ExportMessageModal onClose={() => setShowExport(false)} />
      )}

      {isEditingMessage && (
        <EditMessageModal
          onClose={() => {
            setIsEditingMessage(false);
          }}
        />
      )}
    </div>
  );
}

export function Chat() {
  const chatStore = useChatStore();
  const sessionIndex = chatStore.currentSessionIndex;
  return <_Chat key={sessionIndex}></_Chat>;
}
