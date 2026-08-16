import crypto from "crypto";

export function verifyTwilioSignature(options: {
  authToken: string;
  signature: string;
  url: string;
  params: Record<string, string>;
}): boolean {
  if (!options.authToken || !options.signature) {
    return false;
  }

  // Sort params alphabetically by key
  const sortedKeys = Object.keys(options.params).sort();
  let paramString = "";
  for (const key of sortedKeys) {
    paramString += key + options.params[key];
  }

  const data = options.url + paramString;
  const hash = crypto
    .createHmac("sha1", options.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  return hash === options.signature;
}
