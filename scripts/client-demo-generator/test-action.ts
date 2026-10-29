import { loginAction } from "../../src/server/actions/auth";

async function test() {
  const res = await loginAction({
    email: "jaydeep.chandegara94@gmail.com",
    password: "SecureOperator2026!",
    rememberMe: true,
  });
  console.log("loginAction result:", res);
  process.exit(0);
}

test().catch(console.error);
