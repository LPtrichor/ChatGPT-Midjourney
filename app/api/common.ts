// "use client";
import { NextRequest } from "next/server";
// import { useAuthStore } from "../store";
// import { use } from "react";

// const authStore = useAuthStore();
export const OPENAI_URL = "api.openai.com";
// export const ADMIN_Default_URL = "http://127.0.0.1";
export const ADMIN_Default_URL = "https://www.admin.rovy.ltd";
const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;
export const ADMIN_URL = process.env.ADMIN_URL ?? ADMIN_Default_URL;
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
  console.log("[req] ", req);
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
  console.log("[fetchUrl]", fetchUrl);
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Authorization: authValue,
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
  console.log("[fetchOptions]", fetchOptions);
  console.log("[fetchUrl]", fetchUrl);
  try {
    const res = await fetch(fetchUrl, fetchOptions);
    // const res = await fetch(fetchUrl);

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
