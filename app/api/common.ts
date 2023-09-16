// "use client";
import { NextRequest } from "next/server";
// import { useAuthStore } from "../store";
// import { use } from "react";

// const authStore = useAuthStore();
export const OPENAI_URL = "api.openai.com";
// export const ADMIN_Default_URL = "http://127.0.0.1";
const DEFAULT_PROTOCOL = "http";
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
// export const ADMIN_Default_URL = "https://www.admin.rovy.me";
const ADMIN_Default_URL = "http://admin";
const ADMIN_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ADMIN_Default_URL;
// 打印上面的所有变量
// console.log('OPENAI_URL', OPENAI_URL)
// console.log('DEFAULT_PROTOCOL', DEFAULT_PROTOCOL)
// console.log('PROTOCOL', PROTOCOL)
// console.log('BASE_URL', BASE_URL)
//打印process.env.BASE_URL
// console.log('process.env.BASE_URL', process.env.BASE_URL)

// 登录相关
export async function request(req: NextRequest) {
  let baseUrl = BASE_URL;
  baseUrl = ADMIN_URL;
  // let baseUrl = "http://localhost";

  if (!baseUrl.startsWith("http")) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }
  const authValue = req.headers.get("Authorization") ?? "";
  const uri = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/",
    "api/",
  );
  console.log(`url = ${baseUrl}/${uri}`);
  console.log("这里是common.ts");
  // console.log("[req] ", req);
  return fetch(`${baseUrl}/${uri}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: authValue,
    },
    cache: "no-store",
    method: req.method,
    body: req.body,
  });
}

//登录相关
export interface Response<T> {
  code: number;

  message: string;

  data: T;
}

export async function requestOpenai(req: NextRequest) {
  const controller = new AbortController();
  const authValue = req.headers.get("Authorization") ?? "";
  // const authValue = "Bearer " + (authStore.token ?? "");
  // console.log('authValue', authValue)
  const openaiPath = "api/send_bot";
  // const openaiPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
  //   "/api/openai/",
  //   "",
  // );

  // let baseUrl = BASE_URL;
  // let baseUrl = 'http://43.135.172.52';
  // let baseUrl = "http://127.0.0.1";
  let baseUrl = ADMIN_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }

  console.log("这里是common.ts");
  console.log("[Proxy] ", openaiPath);
  console.log("[Base Url]", baseUrl);

  if (process.env.OPENAI_ORG_ID) {
    console.log("[Org ID]", process.env.OPENAI_ORG_ID);
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10 * 60 * 1000);

  const fetchUrl = `${baseUrl}/${openaiPath}`;
  console.log("[fetchUrl](common.ts)", fetchUrl);
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      // Authorization: authValue,
      Authorization:
        "Bearer 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",
      // ...(process.env.OPENAI_ORG_ID && {
      //   "OpenAI-Organization": process.env.OPENAI_ORG_ID,
      // }),
    },
    cache: "no-store",
    method: req.method,
    body: req.body,
    signal: controller.signal,
  };
  // const fetchOptions: RequestInit = {
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: authValue,
  //     ...(process.env.OPENAI_ORG_ID && {
  //       "OpenAI-Organization": process.env.OPENAI_ORG_ID,
  //     }),
  //   },
  //   cache: "no-store",
  //   method: req.method,
  //   body: req.body,
  //   signal: controller.signal,
  // };
  // console.log("[fetchOptions]", fetchOptions);
  // console.log("[fetchUrl]", fetchUrl);
  try {
    const fetchUrl_test = "https://www.api.rovy.me/v1/chat/completions";
    const res_pre = await fetch(fetchUrl_test, fetchOptions);
    // const res = await fetch(fetchUrl);

    if (res_pre.status !== 200) {
      return new Response(res_pre.body);
      // return res_pre;
      // const newHeaders = new Headers(res_pre.headers);
      // return new Response(res_pre.body, {
      //   status: res_pre.status,
      //   statusText: res_pre.statusText,
      //   headers: newHeaders,
      // });
    }
    return res_pre;
    // 获取res_pre的内容 解析成json
    const res_ = await res_pre.json(); // 这里只能被解析一次
    console.log("[res_]", res_);

    const fetchUrl_gpt = res_.fetch_url;
    const makeBearer = (token: string) => `Bearer ${token.trim()}`;
    const fetchOptions_gpt: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        Authorization: makeBearer(res_.api_key),
        // ...(process.env.OPENAI_ORG_ID && {
        //   "OpenAI-Organization": process.env.OPENAI_ORG_ID,
        // }),
      },
      cache: "no-store",
      method: req.method,
      body: res_.data,
      signal: controller.signal,
    };

    const res = await fetch(fetchUrl_gpt, fetchOptions_gpt);
    console.log("[res](common.ts)", res.status);
    if (res.status === 401) {
      // to prevent browser prompt for credentials
      const newHeaders = new Headers(res.headers);
      newHeaders.delete("www-authenticate");
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders,
      });
    }

    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}
