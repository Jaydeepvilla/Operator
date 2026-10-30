import { checkUserOrganization } from "../src/server/actions/onboarding";

async function test() {
  try {
    const res = await checkUserOrganization();
    console.log("checkUserOrganization result:", res);
  } catch (err: any) {
    console.error("checkUserOrganization threw:", err);
  }
}

test().then(() => process.exit(0));

