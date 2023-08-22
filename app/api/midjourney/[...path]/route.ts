import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth";
import path from "path";

// const DEFAULT_MIDJOUREY_PROXY_URL = "http://43.135.172.52:2788";
// const DEFAULT_MIDJOUREY_PROXY_URL = "https://api.midjourneyapi.xyz";
const DEFAULT_MIDJOUREY_PROXY_URL = "http://127.0.0.1/api/ai_draw_mj";
// const BASE_URL = process.env.MIDJOURNEY_PROXY_URL ?? null;
const BASE_URL =
  process.env.MIDJOURNEY_PROXY_URL ?? DEFAULT_MIDJOUREY_PROXY_URL;
// const API_SECRET = process.env.MIDJOURNEY_PROXY_API_SECRET ?? null;

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Midjourney Route] params ", params);
  // 模拟返回
  // if (params.path[2] === "imagine") {
  //   return NextResponse.json({
  //     message: "",
  //     status: "success",
  //     task_id: "56540308-2102-4efa-8a2d-ecee93d860b3",
  //     data: params.path[2],
  //     params: params,
  //     req: req.body
  //   });
  // }
  // return NextResponse.json(
  //   {
  //     error: false,
  //     msg: "success",
  //     data: {
  //       "id": "5f9f5e3b-5b0a-4b0a-9b0a-5b0a4b0a9b0a",
  //       "name": "测试",
  //       "phone": "13800138000",
  //       "email": ""
  //     }
  //   }
  // );
  const customMjProxyUrl = req.headers.get("midjourney-proxy-url");
  let mjProxyUrl = BASE_URL;
  if (
    customMjProxyUrl &&
    (customMjProxyUrl.startsWith("http://") ||
      customMjProxyUrl.startsWith("https://"))
  ) {
    mjProxyUrl = customMjProxyUrl;
  }

  if (!mjProxyUrl) {
    return NextResponse.json(
      {
        error: true,
        msg: "please set MIDJOURNEY_PROXY_URL in .env or set midjourney-proxy-url in config",
      },
      {
        status: 500,
      },
    );
  }

  const authResult = auth(req, false);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  const reqPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/midjourney/mj/submit",
    "mj/v2",
  );

  // let fetchUrl = `${mjProxyUrl}/${reqPath}`;
  let fetchUrl = `${mjProxyUrl}`;

  console.log("[MJ Proxy] ", fetchUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10 * 60 * 1000);

  // const newBody = { ...req.body, fetchUrl };
  // return NextResponse.json({
  //   data: newBody,
  // });
  const fetchOptions: RequestInit = {
    //@ts-ignore
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization") ?? "",
    },
    cache: "no-store",
    method: req.method,
    body: req.body,
    signal: controller.signal,
    //@ts-ignore
    duplex: "half",
  };

  try {
    const res = await fetch(fetchUrl, fetchOptions);
    if (res.status !== 200) {
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
      });
    }

    // console.log("[MJ Proxy] ", res);
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GET = handle;
export const POST = handle;
