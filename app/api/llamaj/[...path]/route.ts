import { type ListCharactersResponse } from "@/app/client/platforms/llamaj";
import { LlamaJavaPath } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { request } from "../../common";

const ALLOWD_PATH = new Set(Object.values(LlamaJavaPath));

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const subpath = params.path.join("/");

  if (!ALLOWD_PATH.has(subpath)) {
    console.log("[Route] forbidden path ", subpath);
    return NextResponse.json(
      {
        error: true,
        msg: "you are not allowed to request " + subpath,
      },
      {
        status: 403,
      },
    );
  }

  try {
    const response = await request(req);

    // list models
    if (subpath === LlamaJavaPath.ListCharactersPath && response.status === 200) {
      const resJson = (await response.json()) as ListCharactersResponse;
      return NextResponse.json(resJson, {
        status: response.status,
      });
    }

    return response;
  } catch (e) {
    console.error("[API] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
export const preferredRegion = [
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "iad1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
];
