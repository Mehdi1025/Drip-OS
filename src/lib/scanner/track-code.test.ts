import {
  isLikelyTrackCode,
  normalizeTrackCode,
  parseOrderTrackPrefixFromScan,
  parseShopifyOrderIdFromScan,
} from "@/lib/scanner/track-code";

const cases: [string, string][] = [
  ["1015-F1-S1", "1015-F1-S1"],
  ["1015-f1-s1", "1015-F1-S1"],
  ["  https://x.fr?q=1015-F1-S1 ", "1015-F1-S1"],
  ["#8792", "8792"],
];

for (const [input, expected] of cases) {
  if (normalizeTrackCode(input) !== expected) {
    throw new Error(`normalizeTrackCode(${input}) expected ${expected}`);
  }
}

if (!isLikelyTrackCode("1015-f1-s1")) {
  throw new Error("isLikelyTrackCode should accept lowercase f/s");
}

if (parseShopifyOrderIdFromScan("8792") !== null) {
  throw new Error("8792 must not parse as Shopify id");
}

if (parseOrderTrackPrefixFromScan("8792") !== "8792") {
  throw new Error("8792 should parse as track prefix lookup");
}

if (parseShopifyOrderIdFromScan("18945694761245") !== "18945694761245") {
  throw new Error("long numeric id should parse as Shopify id");
}

console.log("track-code.test.ts OK");
