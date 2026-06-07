import { randomBytes, scryptSync } from "crypto";
import readline from "readline";

function buildHash(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });

    rl._writeToOutput = function _writeToOutput() {
      rl.output.write("*");
    };
  });
}

async function main() {
  let password = process.argv[2] || process.env.ADMIN_PASSWORD_PLAIN || "";

  if (!password) {
    password = (await askHidden("Admin password (hidden): ")).trim();
  }

  if (!password) {
    console.error("ERROR: empty password. Abort.");
    process.exit(1);
  }

  const hash = buildHash(password);
  console.log(hash);
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
