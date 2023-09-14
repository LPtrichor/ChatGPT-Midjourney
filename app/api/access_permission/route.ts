// import { NextRequest } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { request } from "../common";
// import {getHeaders} from "@/app/client/api";

const ADMIN_Default_URL = "127.0.0.1";
const ADMIN_URL = "https://www.admin.rovy.me";
// const ADMIN_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ADMIN_Default_URL;

// import type { Response } from "../common";

async function handle(req: NextRequest) {
  let ip = "";
  try {
    const res = await fetch("https://api.ipify.org");
    ip = await res.text();
  } catch (error) {}
  //随便return一个值
  // return NextResponse.json({
  //   error: false,
  //   msg: "success",
  //   data: {
  //     "ip": ip,
  //     "name": "测试",
  //     "phone": "13800138000",
  //     "email": "hihi"
  //   }
  // });
  const statusRes = await fetch(ADMIN_URL + `/api/access_permission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ip: ip,
    }),
  });
  // const status = await statusRes.json();
  return statusRes;
  return NextResponse.json({
    ip: status,
    msg: "success",
    data: {
      id: "5f9f5e3b-5b0a-4b0a-9b0a-5b0a4b0a9b0a",
      name: "测试",
      phone: "13800138000",
      email: "hihi",
    },
  });
  return await request(req);
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
