import { NextRequest } from "next/server";

import { request } from "../common";
import type { Response } from "../common";

async function handle(req: NextRequest) {
  // console.log("这里是route.ts");
  return await request(req);
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";

export interface RegisterData {
  token: string;
}

export type RegisterResponse = Response<RegisterData>;
