// import { NextRequest } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { request } from "../common";
// import type { Response } from "../common";

async function handle(req: NextRequest) {
  //随便return一个值
  // return NextResponse.json({
  //   error: false,
  //   msg: "success",
  //   data: {
  //     "id": "5f9f5e3b-5b0a-4b0a-9b0a-5b0a4b0a9b0a",
  //     "name": "测试",
  //     "phone": "13800138000",
  //     "email": ""
  //   }
  // });
  return await request(req);
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
