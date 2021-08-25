const Prompt = require("prompt-password");
const crypto = require("crypto");
const fs = require("fs");
const yargs = require("yargs");

const PWD_CHAR = "*";
const ALGORITHM = "aes-192-cbc";
const SALT = "salt";

const getPwd = () => {
  return new Prompt({
    type: "password",
    message: "Enter your password please",
    name: "password",
    mask: (input) => PWD_CHAR + new Array(String(input).length).join(PWD_CHAR),
  }).run();
};

const createKeyIv = (pwd) => {
  const key = crypto.scryptSync(pwd, SALT, 24);
  const iv = new Uint8Array(16);
  return { key, iv };
};

const encrypt = (str, pwd) => {
  const { key, iv } = createKeyIv(pwd);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  return cipher.update(str, "utf8", "hex") + cipher.final("hex");
};

const decrypt = (str, pwd) => {
  const { key, iv } = createKeyIv(pwd);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return decipher.update(str, "hex", "utf8") + decipher.final("utf8");
};

yargs
  .command(["cat <fileName>"], "Read file", {}, async (argv) => {
    const pwd = await getPwd();
    const fileContent = fs.readFileSync(argv.fileName, "utf8");
    const decrypted = decrypt(fileContent, pwd);
    console.log(decrypted);
  })
  .command(["encrypt <fileName>"], "Encrypt file", {}, async (argv) => {
    const pwd = await getPwd();
    const fileContent = fs.readFileSync(argv.fileName);
    const encrypted = encrypt(fileContent, pwd);
    fs.writeFileSync(argv.fileName, encrypted);
  })
  .command(["decrypt <fileName>"], "Decrypt file", {}, async (argv) => {
    const pwd = await getPwd();
    const fileContent = fs.readFileSync(argv.fileName, "utf8");
    const decrypted = decrypt(fileContent, pwd);
    fs.writeFileSync(argv.fileName, decrypted);
  })
  .help().argv;
