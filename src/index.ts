import Prompt from 'prompt-password'
import crypto from 'crypto'
import fs from 'fs'
import yargs from '@bpinternal/yargs-extra'
import { Editor } from './editor'
import { Logger } from './logger'
import { EFSError } from './errors'

const LOREM_IPSUM = `0-LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
1-VESTIBULUM NISI AUCTOR CONSECTETUR ADIPISCING ELIT.
2-ORCI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
3-XVIII LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
4-Y LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
5-QUISQUE LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
6-NAM LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
7-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
8-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
9-KLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
10-MORBI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
11-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
12-ZLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
13-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
14-LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
15-VESTIBULUM NISI AUCTOR CONSECTETUR ADIPISCING ELIT.
16-ORCI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
17-XVIII LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
18-Y LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
19-QUISQUE LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
20-NAM LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
21-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
22-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
23-KLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
24-MORBI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
25-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
26-ZLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
27-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
28-VESTIBULUM NISI AUCTOR CONSECTETUR ADIPISCING ELIT.
29-ORCI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
30-XVIII LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
31-Y LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
32-QUISQUE LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
33-NAM LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
34-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
35-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
36-KLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
37-MORBI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
38-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
39-ZLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
40-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
41-VESTIBULUM NISI AUCTOR CONSECTETUR ADIPISCING ELIT.
42-ORCI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
43-XVIII LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
44-Y LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
45-QUISQUE LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
46-NAM LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
47-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
48-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
49-KLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
50-MORBI LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
51-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
52-ZLOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.
53-SED LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT.`

const PWD_CHAR = '*'
const ALGORITHM = 'aes-192-cbc'
const SALT = 'salt'

const getPwd = () => {
  return new Prompt({
    type: 'password',
    message: 'Enter your password please',
    name: 'password',
    mask: (input: string) => PWD_CHAR + new Array(String(input).length).join(PWD_CHAR),
  }).run()
}

const createKeyIv = (pwd: string) => {
  const key = crypto.scryptSync(pwd, SALT, 24)
  const iv = new Uint8Array(16)
  return { key, iv }
}

const encrypt = (str: string, pwd: string) => {
  const { key, iv } = createKeyIv(pwd)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  return cipher.update(str, 'utf8', 'hex') + cipher.final('hex')
}

const decrypt = (str: string, pwd: string) => {
  const { key, iv } = createKeyIv(pwd)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  return decipher.update(str, 'hex', 'utf8') + decipher.final('utf8')
}

const logger = new Logger()

const handleErr = (thrown: any) => {
  if (thrown instanceof EFSError) {
    for (const m of thrown.messages) {
      logger.error(m)
    }
  } else if (thrown instanceof Error) {
    logger.error(thrown.message)
  } else {
    logger.error(`${thrown}`)
  }

  process.exit()
}

process.on('uncaughtException', (thrown: any) => handleErr(thrown))
process.on('unhandledRejection', (thrown: any) => handleErr(thrown))

void yargs
  .fail((msg: string) => handleErr(new EFSError(msg)))
  .strict()
  .command(
    '$0',
    '',
    (yargs) => yargs,
    async () => {
      logger.warn('No command selected.')
      logger.warn('Please select a command.')
      logger.warn('Run with argument "--help" to know more.')
    },
  )
  .command(
    ['cat <fileName>'],
    'Read file',
    (yargs) => yargs.positional('fileName', { type: 'string', demandOption: true }),
    async (argv) => {
      const pwd = await getPwd()
      const fileContent = fs.readFileSync(argv.fileName, 'utf8')
      const decrypted = decrypt(fileContent, pwd)
      logger.info(decrypted)
    },
  )
  .command(
    ['encrypt <fileName>'],
    'Encrypt file',
    (yargs) => yargs.positional('fileName', { type: 'string', demandOption: true }),
    async (argv) => {
      const pwd = await getPwd()
      const fileContent = fs.readFileSync(argv.fileName, 'utf8')
      const encrypted = encrypt(fileContent, pwd)
      fs.writeFileSync(argv.fileName, encrypted)
    },
  )
  .command(
    ['decrypt <fileName>'],
    'Decrypt file',
    (yargs) => yargs.positional('fileName', { type: 'string', demandOption: true }),
    async (argv) => {
      const pwd = await getPwd()
      const fileContent = fs.readFileSync(argv.fileName, 'utf8')
      const decrypted = decrypt(fileContent, pwd)
      fs.writeFileSync(argv.fileName, decrypted)
    },
  )
  .command(
    ['edit <fileName>'],
    'Edit file',
    (yargs) => yargs.positional('fileName', { type: 'string', demandOption: true }),
    async (argv) => {
      // const pwd = await getPwd()
      // const fileContent = fs.readFileSync(argv.fileName, 'utf8')
      // const decrypted = decrypt(fileContent, pwd)

      logger.info('Edit the file content and press ctrl-c to save and exit.')
      const editor = new Editor(logger)
      const updatedContent = await editor.edit(LOREM_IPSUM)
      logger.info(updatedContent)
      // const encrypted = encrypt(updatedContent, pwd)
      // fs.writeFileSync(argv.fileName, encrypted)
    },
  )
  .help().argv
