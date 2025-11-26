// src/manifest/registryClient.ts

import axios from "axios";

/**
 * 从 Registry 拉取 Signed Manifest（原始 JWS/JWT 字符串）
 * @param url - manifest 的 HTTP URL
 */
export async function fetchSignedManifest(url: string): Promise<string> {
  if (!url) {
    throw new Error("Manifest URL is empty");
  }

  const resp = await axios.get<string>(url, {
    responseType: "text",
    timeout: 5000
  });

  if (!resp.data || typeof resp.data !== "string") {
    throw new Error("Manifest response is not a string");
  }

  return resp.data;
}
