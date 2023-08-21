import { create } from "zustand";
import { persist } from "zustand/middleware";

import { trimTopic } from "../utils";

import Locale from "../locales";
import { showToast } from "../components/ui-lib";
import { ModelType } from "./config";
import { createEmptyMask, Mask } from "./mask";
import { StoreKey } from "../constant";
import {
  api,
  getHeaders,
  useGetMidjourneySelfProxyUrl,
  RequestMessage,
} from "../client/api";
import { ChatControllerPool } from "../client/controller";
import { prettyObject } from "../utils/format";
// import { ADMIN_URL } from "../api/common";

// export const ADMIN_Default_URL = "https://www.admin.rovy.me";
const ADMIN_Default_URL = "http://127.0.0.1";
const ADMIN_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ADMIN_Default_URL;

// retry次数控制
let retryCount = 0,
  retryMaxCount = 3;

export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id?: number;
  model?: ModelType;
  attr?: any;
};

export function createMessage(override: Partial<ChatMessage>): ChatMessage {
  return {
    id: Date.now(),
    date: new Date().toLocaleString(),
    role: "user",
    content: "",
    attr: {},
    ...override,
  };
}

export interface ChatStat {
  tokenCount: number;
  wordCount: number;
  charCount: number;
}

export interface ChatSession {
  id: number;
  topic: string;

  memoryPrompt: string;
  messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;

  mask: Mask;
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

function createEmptySession(): ChatSession {
  return {
    id: Date.now() + Math.random(),
    topic: DEFAULT_TOPIC,
    memoryPrompt: "",
    messages: [],
    stat: {
      tokenCount: 0,
      wordCount: 0,
      charCount: 0,
    },
    lastUpdate: Date.now(),
    lastSummarizeIndex: 0,

    mask: createEmptyMask(),
  };
}

const ChatFetchTaskPool: Record<string, any> = {};

interface ChatStore {
  fetchMidjourneyStatus(botMessage: ChatMessage, extAttr?: any): void;

  sessions: ChatSession[];
  currentSessionIndex: number;
  globalId: number;
  clearSessions: () => void;
  moveSession: (from: number, to: number) => void;
  selectSession: (index: number) => void;
  newSession: (mask?: Mask) => void;
  deleteSession: (index: number) => void;
  currentSession: () => ChatSession;
  onNewMessage: (message: ChatMessage) => void;
  onUserInput: (content: string, extAttr?: any) => Promise<void>;
  summarizeSession: () => void;
  updateStat: (message: ChatMessage) => void;
  updateCurrentSession: (updater: (session: ChatSession) => void) => void;
  updateMessage: (
    sessionIndex: number,
    messageIndex: number,
    updater: (message?: ChatMessage) => void,
  ) => void;
  resetSession: () => void;
  getMessagesWithMemory: () => ChatMessage[];
  getMemoryPrompt: () => ChatMessage;

  clearAllData: () => void;
}

function countMessages(msgs: ChatMessage[]) {
  return msgs.reduce((pre, cur) => pre + cur.content.length, 0);
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [createEmptySession()],
      currentSessionIndex: 0,
      globalId: 0,

      clearSessions() {
        set(() => ({
          sessions: [createEmptySession()],
          currentSessionIndex: 0,
        }));
      },

      selectSession(index: number) {
        set({
          currentSessionIndex: index,
        });
      },

      moveSession(from: number, to: number) {
        set((state) => {
          const { sessions, currentSessionIndex: oldIndex } = state;

          // move the session
          const newSessions = [...sessions];
          const session = newSessions[from];
          newSessions.splice(from, 1);
          newSessions.splice(to, 0, session);

          // modify current session id
          let newIndex = oldIndex === from ? to : oldIndex;
          if (oldIndex > from && oldIndex <= to) {
            newIndex -= 1;
          } else if (oldIndex < from && oldIndex >= to) {
            newIndex += 1;
          }

          return {
            currentSessionIndex: newIndex,
            sessions: newSessions,
          };
        });
      },

      newSession(mask) {
        const session = createEmptySession();

        set(() => ({ globalId: get().globalId + 1 }));
        session.id = get().globalId;

        if (mask) {
          session.mask = { ...mask };
          session.topic = mask.name;
        }

        set((state) => ({
          currentSessionIndex: 0,
          sessions: [session].concat(state.sessions),
        }));
      },

      deleteSession(index) {
        const deletingLastSession = get().sessions.length === 1;
        const deletedSession = get().sessions.at(index);

        if (!deletedSession) return;

        const sessions = get().sessions.slice();
        sessions.splice(index, 1);

        const currentIndex = get().currentSessionIndex;
        let nextIndex = Math.min(
          currentIndex - Number(index < currentIndex),
          sessions.length - 1,
        );

        if (deletingLastSession) {
          nextIndex = 0;
          sessions.push(createEmptySession());
        }

        // for undo delete action
        const restoreState = {
          currentSessionIndex: get().currentSessionIndex,
          sessions: get().sessions.slice(),
        };

        set(() => ({
          currentSessionIndex: nextIndex,
          sessions,
        }));

        showToast(
          Locale.Home.DeleteToast,
          {
            text: Locale.Home.Revert,
            onClick() {
              set(() => restoreState);
            },
          },
          5000,
        );
      },

      currentSession() {
        let index = get().currentSessionIndex;
        const sessions = get().sessions;

        if (index < 0 || index >= sessions.length) {
          index = Math.min(sessions.length - 1, Math.max(0, index));
          set(() => ({ currentSessionIndex: index }));
        }

        const session = sessions[index];

        return session;
      },

      onNewMessage(message) {
        get().updateCurrentSession((session) => {
          session.lastUpdate = Date.now();
        });
        get().updateStat(message);
        get().summarizeSession();
      },

      fetchMidjourneyStatus(botMessage: ChatMessage, extAttr?: any) {
        const taskId = botMessage?.attr?.taskId;
        // if (
        //   !taskId ||
        //   ["SUCCESS", "FAILURE"].includes(botMessage?.attr?.status) ||
        //   ChatFetchTaskPool[taskId]
        // )
        if (
          !taskId ||
          ["finished", "failed"].includes(botMessage?.attr?.status) ||
          ChatFetchTaskPool[taskId]
        )
          return;
        ChatFetchTaskPool[taskId] = setTimeout(async () => {
          ChatFetchTaskPool[taskId] = null;
          const statusRes = await fetch(
            `https://api.midjourneyapi.xyz/mj/v2/fetch`,
            {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                task_id: taskId,
              }),
            },
          );
          // const statusRes = await fetch(
          //   `/api/midjourney/mj/task/${taskId}/fetch`,
          //   {
          //     method: "GET",
          //     headers: getHeaders(),
          //   },
          // );
          const statusResJson = await statusRes.json();
          if (statusRes.status < 200 || statusRes.status >= 300) {
            botMessage.content =
              Locale.Midjourney.TaskStatusFetchFail +
                ": " +
                (statusResJson?.error || statusResJson?.description) ||
              Locale.Midjourney.UnknownReason;
          } else {
            let isFinished = false;
            let content;
            // const prefixContent = Locale.Midjourney.TaskPrefix(
            //   statusResJson.prompt,
            //   taskId,
            // );
            const prefixContent = Locale.Midjourney.TaskPrefix(
              statusResJson?.meta.task_param.prompt,
              taskId,
            );
            console.log("statusResJson", statusResJson);
            switch (statusResJson?.status) {
              // case "SUCCESS":
              case "finished":
                // 绘画成功则记录图片地址
                // console.log('绘画成功则记录图片地址');
                const requestBody = {
                  description: statusResJson?.meta.task_param.prompt,
                  imageUrl: statusResJson?.task_result.image_url,
                  prompt:
                    statusResJson?.meta.task_param.prompt ||
                    "GoAPI接口暂无prompt",
                  action: statusResJson?.meta.task_type || "暂无action",
                };
                // const requestBody = {
                //   description: statusResJson?.description,
                //   imageUrl: statusResJson?.imageUrl,
                //   prompt: statusResJson?.prompt,
                //   action: statusResJson?.action,
                // };
                // 需要修改prompt字段
                const res_ctrl = await fetch(ADMIN_URL + "/api/ai_draw", {
                  method: "POST",
                  headers: getHeaders(),
                  body: JSON.stringify(requestBody),
                });
                // content = statusResJson.imageUrl;
                content = statusResJson.task_result.image_url;
                isFinished = true;
                // if (statusResJson.imageUrl) {
                if (statusResJson.task_result.image_url) {
                  // let imgUrl = useGetMidjourneySelfProxyUrl(
                  //   statusResJson.imageUrl,
                  // );
                  let imgUrl = statusResJson.task_result.image_url;
                  botMessage.attr.imgUrl = imgUrl;
                  botMessage.content =
                    prefixContent + `[![${taskId}](${imgUrl})](${imgUrl})`;
                }
                // if (
                //   statusResJson.action === "DESCRIBE" &&
                //   statusResJson.prompt
                // ) {
                //   botMessage.content += `\n${statusResJson.prompt}`;
                // }
                break;
              case "failed":
                content =
                  // statusResJson.failReason || Locale.Midjourney.UnknownReason;
                  "图像生成失败" || Locale.Midjourney.UnknownReason;
                isFinished = true;
                botMessage.content =
                  prefixContent +
                  `**${
                    Locale.Midjourney.TaskStatus
                  }:** [${new Date().toLocaleString()}] - ${content}`;
                break;
              case "retry":
                content = Locale.Midjourney.Retry;
                break;
              case "processing":
                content = Locale.Midjourney.TaskProgressTip(
                  statusResJson.progress,
                );
                break;
              case "pending":
                content = Locale.Midjourney.TaskRemoteSubmit;
                break;
              // case "FAILURE":
              //   content =
              //     statusResJson.failReason || Locale.Midjourney.UnknownReason;
              //   isFinished = true;
              //   botMessage.content =
              //     prefixContent +
              //     `**${Locale.Midjourney.TaskStatus
              //     }:** [${new Date().toLocaleString()}] - ${content}`;
              //   break;
              // case "NOT_START":
              //   content = Locale.Midjourney.TaskNotStart;
              //   break;
              // case "IN_PROGRESS":
              //   content = Locale.Midjourney.TaskProgressTip(
              //     statusResJson.progress,
              //   );
              //   break;
              // case "SUBMITTED":
              //   content = Locale.Midjourney.TaskRemoteSubmit;
              //   break;
              default:
                content = statusResJson.status;
            }
            // botMessage.attr.status = statusResJson.status;
            botMessage.attr.status = statusResJson.status;
            if (isFinished) {
              botMessage.attr.finished = true;
            } else {
              botMessage.content =
                prefixContent +
                `**${
                  Locale.Midjourney.TaskStatus
                }:** [${new Date().toLocaleString()}] - ${content}`;
              // if (
              //   statusResJson.status === "IN_PROGRESS" &&
              //   statusResJson.imageUrl
              // ) {
              if (statusResJson.status === "processing") {
                // let imgUrl = statusResJson?.task_result.image_url;
                // let imgUrl = useGetMidjourneySelfProxyUrl(
                //   statusResJson.imageUrl,
                // );
                botMessage.content += `\n图像正在生成中，请稍等片刻....`;
                // botMessage.attr.imgUrl = imgUrl;
                // botMessage.content += `\n[![${taskId}](${imgUrl})](${imgUrl})`;
              }
              this.fetchMidjourneyStatus(taskId, botMessage);
            }
            set(() => ({}));
            if (isFinished) {
              extAttr?.setAutoScroll(true);
            }
          }
        }, 3000);
      },

      async onUserInput(content, extAttr?: any) {
        const session = get().currentSession();
        const modelConfig = session.mask.modelConfig;

        if (
          extAttr?.mjImageMode &&
          (extAttr?.useImages?.length ?? 0) > 0 &&
          extAttr.mjImageMode !== "IMAGINE"
        ) {
          if (
            extAttr.mjImageMode === "BLEND" &&
            (extAttr.useImages.length < 2 || extAttr.useImages.length > 5)
          ) {
            alert(Locale.Midjourney.BlendMinImg(2, 5));
            return new Promise((resolve: any, reject) => {
              resolve(false);
            });
          }
          content = `/mj ${extAttr?.mjImageMode}`;
          extAttr.useImages.forEach((img: any, index: number) => {
            content += `::[${index + 1}]${img.filename}`;
          });
        }

        const userMessage: ChatMessage = createMessage({
          role: "user",
          content,
        });

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          id: userMessage.id! + 1,
          model: modelConfig.model,
        });

        const systemInfo = createMessage({
          role: "system",
          content: `IMPORTANT: You are a virtual assistant powered by the ${
            modelConfig.model
          } model, now time is ${new Date().toLocaleString()}}`,
          id: botMessage.id! + 1,
        });

        // get recent messages
        const systemMessages = [];
        // if user define a mask with context prompts, wont send system info
        if (session.mask.context.length === 0) {
          systemMessages.push(systemInfo);
        }

        const recentMessages = get().getMessagesWithMemory();
        const sendMessages = systemMessages.concat(
          recentMessages.concat(userMessage),
        );
        const sessionIndex = get().currentSessionIndex;
        const messageIndex = get().currentSession().messages.length + 1;

        // save user's and bot's message
        get().updateCurrentSession((session) => {
          session.messages.push(userMessage);
          session.messages.push(botMessage);
        });

        // make request
        // console.log("Hello, world!");
        console.log("[User Input] ", sendMessages);
        if (
          content.toLowerCase().startsWith("/mj") ||
          content.toLowerCase().startsWith("/MJ")
        ) {
          botMessage.model = "midjourney";
          const startFn = async () => {
            const prompt = content.substring(3).trim();
            let action: string = "IMAGINE";
            const firstSplitIndex = prompt.indexOf("::");
            if (firstSplitIndex > 0) {
              action = prompt.substring(0, firstSplitIndex);
            }
            if (
              ![
                "UPSCALE",
                "VARIATION",
                "IMAGINE",
                "DESCRIBE",
                "BLEND",
                "REROLL",
              ].includes(action)
            ) {
              botMessage.content = Locale.Midjourney.TaskErrUnknownType;
              botMessage.streaming = false;
              return;
            }
            botMessage.attr.action = action;
            let actionIndex: any = null;
            let actionUseTaskId: any = null;
            if (
              action === "VARIATION" ||
              action == "UPSCALE" ||
              action == "REROLL"
            ) {
              actionIndex = prompt.substring(
                firstSplitIndex + 2,
                firstSplitIndex + 3,
              );
              // actionIndex = parseInt(
              //   prompt.substring(firstSplitIndex + 2, firstSplitIndex + 3),
              // );
              actionUseTaskId = prompt.substring(firstSplitIndex + 5);
            }
            try {
              let res = null;
              const reqFn = (path: string, method: string, body?: any) => {
                // return fetch("/api/midjourney/mj/" + path, {
                return fetch("/api/midjourney/mj/" + path, {
                  method: method,
                  headers: getHeaders(),
                  body: body,
                });
              };
              switch (action) {
                case "IMAGINE": {
                  console.log("[test] action:", action);
                  const requestBody = {
                    action: action,
                    prompt: prompt,
                    imageUrl: "",
                  };
                  console.log("[requesrfBody(chat.ts)]", requestBody);
                  const res_ctrl = await fetch(ADMIN_URL + "/api/ai_draw", {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify(requestBody),
                  })
                    .then((response) => {
                      // console.log('[response]', response);
                      // if (!response.ok) {
                      //     throw new Error("Network response was not ok");
                      // }
                      return response.json();
                    })
                    // .then((data) => {
                    //     console.log(data);
                    // })
                    .catch((error) => {
                      console.error(
                        "There was a problem with the fetch operation:",
                        error,
                      );
                    });
                  console.log("res_ctrl", res_ctrl);
                  console.log("res_ctrl.status", res_ctrl.status);
                  if (res_ctrl.status != 200) {
                    botMessage.content = res_ctrl.message;
                    botMessage.streaming = false;
                    return;
                  }
                  // break;
                  // if(res_ctrl.status != 200){
                  res = await reqFn(
                    "submit/imagine",
                    "POST",
                    JSON.stringify({
                      prompt: prompt,
                      base64: extAttr?.useImages?.[0]?.base64 ?? null,
                    }),
                  );
                  break;
                }
                case "DESCRIBE": {
                  res = await reqFn(
                    "submit/describe",
                    "POST",
                    JSON.stringify({
                      base64: extAttr.useImages[0].base64,
                    }),
                  );
                  break;
                }
                case "BLEND": {
                  res = await reqFn(
                    "submit/blend",
                    "POST",
                    JSON.stringify({
                      base64Array: [
                        extAttr.useImages[0].base64,
                        extAttr.useImages[1].base64,
                      ],
                    }),
                  );
                  break;
                }
                case "UPSCALE":
                  res = await reqFn(
                    "submit/upscale",
                    "POST",
                    JSON.stringify({
                      index: actionIndex,
                      origin_task_id: actionUseTaskId,
                    }),
                  );
                  break;
                case "VARIATION":
                  res = await reqFn(
                    "submit/variation",
                    "POST",
                    JSON.stringify({
                      index: actionIndex,
                      origin_task_id: actionUseTaskId,
                    }),
                  );
                  break;
                case "REROLL": {
                  res = await reqFn(
                    "submit/upscale",
                    "POST",
                    JSON.stringify({
                      index: actionIndex,
                      origin_task_id: actionUseTaskId,
                    }),
                  );
                  // case "REROLL": {
                  //   res = await reqFn(
                  //     "submit/change",
                  //     "POST",
                  //     JSON.stringify({
                  //       action: action,
                  //       index: actionIndex,
                  //       taskId: actionUseTaskId,
                  //     }),
                  //   );
                  break;
                }
                default:
              }
              console.log("res", res);
              if (res == null) {
                botMessage.content =
                  Locale.Midjourney.TaskErrNotSupportType(action);
                botMessage.streaming = false;
                return;
              }
              if (!res.ok) {
                const text = await res.text();
                throw new Error(
                  `\n${Locale.Midjourney.StatusCode(
                    res.status,
                  )}\n${Locale.Midjourney.RespBody(
                    text || Locale.Midjourney.None,
                  )}`,
                );
              }
              const resJson = await res.json();
              console.log("resJson", resJson);
              // if (
              //   res.status < 200 ||
              //   res.status >= 300 ||
              //   (resJson.code != 1 && resJson.code != 22)
              // ) {
              if (res.status != 200) {
                botMessage.content = Locale.Midjourney.TaskSubmitErr(
                  resJson?.message ||
                    resJson?.error ||
                    resJson?.description ||
                    Locale.Midjourney.UnknownError,
                );
              } else {
                // const taskId: string = resJson.result;
                console.log("hihihihi");
                // GoAPI
                const taskId: string = resJson.task_id;
                const prefixContent = Locale.Midjourney.TaskPrefix(
                  prompt,
                  taskId,
                );
                // GoAPI
                let description = "";
                if (resJson.status === "success") {
                  description = "提交成功";
                }
                botMessage.content =
                  prefixContent +
                    `[${new Date().toLocaleString()}] - ${
                      Locale.Midjourney.TaskSubmitOk
                    }: ` +
                    // resJson?.description || Locale.Midjourney.PleaseWait;
                    description || Locale.Midjourney.PleaseWait;
                botMessage.attr.taskId = taskId;
                botMessage.attr.status = resJson.status;
                console.log("[botMessage]", botMessage);
                this.fetchMidjourneyStatus(botMessage, extAttr);
              }
            } catch (e: any) {
              console.error(e);
              botMessage.content = Locale.Midjourney.TaskSubmitErr(
                e?.error || e?.message || Locale.Midjourney.UnknownError,
              );
            } finally {
              ChatControllerPool.remove(
                sessionIndex,
                botMessage.id ?? messageIndex,
              );
              botMessage.streaming = false;
            }
          };
          await startFn();
          get().onNewMessage(botMessage);
          set(() => ({}));
          extAttr?.setAutoScroll(true);
        } else {
          api.llm.chat({
            messages: sendMessages,
            config: { ...modelConfig, stream: true },
            onUpdate(message) {
              botMessage.streaming = true;
              if (message) {
                botMessage.content = message;
              }
              set(() => ({}));
            },
            onFinish(message) {
              botMessage.streaming = false;
              if (message) {
                botMessage.content = message;
                get().onNewMessage(botMessage);
              }
              ChatControllerPool.remove(
                sessionIndex,
                botMessage.id ?? messageIndex,
              );
              set(() => ({}));
            },
            onError(error) {
              const isAborted = error.message.includes("aborted");
              botMessage.content =
                "\n\n" +
                prettyObject({
                  error: true,
                  message: error.message,
                });
              botMessage.streaming = false;
              userMessage.isError = !isAborted;
              botMessage.isError = !isAborted;

              set(() => ({}));
              ChatControllerPool.remove(
                sessionIndex,
                botMessage.id ?? messageIndex,
              );

              console.error("[Chat] failed ", error);
            },
            onController(controller) {
              // collect controller for stop/retry
              ChatControllerPool.addController(
                sessionIndex,
                botMessage.id ?? messageIndex,
                controller,
              );
            },
          });
        }
      },

      getMemoryPrompt() {
        const session = get().currentSession();

        return {
          role: "system",
          content:
            session.memoryPrompt.length > 0
              ? Locale.Store.Prompt.History(session.memoryPrompt)
              : "",
          date: "",
        } as ChatMessage;
      },

      getMessagesWithMemory() {
        const session = get().currentSession();
        const modelConfig = session.mask.modelConfig;

        // wont send cleared context messages
        const clearedContextMessages = session.messages.slice(
          session.clearContextIndex ?? 0,
        );
        const messages = clearedContextMessages.filter((msg) => !msg.isError);
        const n = messages.length;

        const context = session.mask.context.slice();

        // long term memory
        if (
          modelConfig.sendMemory &&
          session.memoryPrompt &&
          session.memoryPrompt.length > 0
        ) {
          const memoryPrompt = get().getMemoryPrompt();
          context.push(memoryPrompt);
        }

        // get short term and unmemoried long term memory
        const shortTermMemoryMessageIndex = Math.max(
          0,
          n - modelConfig.historyMessageCount,
        );
        const longTermMemoryMessageIndex = session.lastSummarizeIndex;
        const mostRecentIndex = Math.max(
          shortTermMemoryMessageIndex,
          longTermMemoryMessageIndex,
        );
        const threshold = modelConfig.compressMessageLengthThreshold * 2;

        // get recent messages as many as possible
        const reversedRecentMessages = [];
        for (
          let i = n - 1, count = 0;
          i >= mostRecentIndex && count < threshold;
          i -= 1
        ) {
          const msg = messages[i];
          if (!msg || msg.isError) continue;
          count += msg.content.length;
          reversedRecentMessages.push(msg);
        }

        // concat
        const recentMessages = context.concat(reversedRecentMessages.reverse());

        return recentMessages;
      },

      updateMessage(
        sessionIndex: number,
        messageIndex: number,
        updater: (message?: ChatMessage) => void,
      ) {
        const sessions = get().sessions;
        const session = sessions.at(sessionIndex);
        const messages = session?.messages;
        updater(messages?.at(messageIndex));
        set(() => ({ sessions }));
      },

      resetSession() {
        get().updateCurrentSession((session) => {
          session.messages = [];
          session.memoryPrompt = "";
        });
      },

      summarizeSession() {
        const session = get().currentSession();

        // remove error messages if any
        const messages = session.messages;

        // should summarize topic after chating more than 50 words
        const SUMMARIZE_MIN_LEN = 50;
        if (
          session.topic === DEFAULT_TOPIC &&
          countMessages(messages) >= SUMMARIZE_MIN_LEN
        ) {
          const topicMessages = messages.concat(
            createMessage({
              role: "user",
              content: Locale.Store.Prompt.Topic,
            }),
          );
          api.llm.chat({
            messages: topicMessages,
            config: {
              model: "gpt-3.5-turbo",
            },
            onFinish(message) {
              get().updateCurrentSession(
                (session) =>
                  (session.topic =
                    message.length > 0 ? trimTopic(message) : DEFAULT_TOPIC),
              );
            },
          });
        }

        const modelConfig = session.mask.modelConfig;
        const summarizeIndex = Math.max(
          session.lastSummarizeIndex,
          session.clearContextIndex ?? 0,
        );
        let toBeSummarizedMsgs = messages
          .filter((msg) => !msg.isError)
          .slice(summarizeIndex);

        const historyMsgLength = countMessages(toBeSummarizedMsgs);

        if (historyMsgLength > modelConfig?.max_tokens ?? 4000) {
          const n = toBeSummarizedMsgs.length;
          toBeSummarizedMsgs = toBeSummarizedMsgs.slice(
            Math.max(0, n - modelConfig.historyMessageCount),
          );
        }

        // add memory prompt
        toBeSummarizedMsgs.unshift(get().getMemoryPrompt());

        const lastSummarizeIndex = session.messages.length;

        console.log(
          "[Chat History] ",
          toBeSummarizedMsgs,
          historyMsgLength,
          modelConfig.compressMessageLengthThreshold,
        );

        if (
          historyMsgLength > modelConfig.compressMessageLengthThreshold &&
          modelConfig.sendMemory
        ) {
          api.llm.chat({
            messages: toBeSummarizedMsgs.concat({
              role: "system",
              content: Locale.Store.Prompt.Summarize,
              date: "",
            }),
            config: { ...modelConfig, stream: true },
            onUpdate(message) {
              session.memoryPrompt = message;
            },
            onFinish(message) {
              console.log("[Memory] ", message);
              session.lastSummarizeIndex = lastSummarizeIndex;
            },
            onError(err) {
              console.error("[Summarize] ", err);
            },
          });
        }
      },

      updateStat(message) {
        get().updateCurrentSession((session) => {
          session.stat.charCount += message.content.length;
          // TODO: should update chat count and word count
        });
      },

      updateCurrentSession(updater) {
        const sessions = get().sessions;
        const index = get().currentSessionIndex;
        updater(sessions[index]);
        set(() => ({ sessions }));
      },

      clearAllData() {
        localStorage.clear();
        location.reload();
      },
    }),
    {
      name: StoreKey.Chat,
      version: 2,
      migrate(persistedState, version) {
        const state = persistedState as any;
        const newState = JSON.parse(JSON.stringify(state)) as ChatStore;

        if (version < 2) {
          newState.globalId = 0;
          newState.sessions = [];

          const oldSessions = state.sessions;
          for (const oldSession of oldSessions) {
            const newSession = createEmptySession();
            newSession.topic = oldSession.topic;
            newSession.messages = [...oldSession.messages];
            newSession.mask.modelConfig.sendMemory = true;
            newSession.mask.modelConfig.historyMessageCount = 4;
            newSession.mask.modelConfig.compressMessageLengthThreshold = 1000;
            newState.sessions.push(newSession);
          }
        }

        return newState;
      },
    },
  ),
);
