import Prompt from 'prompt-password'
import crypto from 'crypto'
import fs from 'fs'
import yargs from '@bpinternal/yargs-extra'
import editor, { EditorEvent } from './editor'
import { Logger } from './logger'
import { EFSError } from './errors'

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
      logger.info('press ctrl+D to exit')
      editor('Hello this is dog.')
        .on('data', () => {})
        .on('abort', () => {
          logger.warn('changes aborted.')
        })
        .on('submit', (text: EditorEvent) => {
          logger.info('changes saved.', text)
        })
    },
  )
  .help().argv
