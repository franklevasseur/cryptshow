import prompts from 'prompts'
import crypto from 'crypto'
import fs from 'fs'
import yargs from '@bpinternal/yargs-extra'
import { Logger } from './logger'
import { CryptShowError } from './errors'
import { Termit } from './termit'
// import wtfnode from 'wtfnode'

const PWD_CHAR = '*'
const ALGORITHM = 'aes-192-cbc'
const SALT = 'salt'

const getPwd = async () => {
  const { password } = await prompts({
    type: 'password',
    message: 'Enter your password please',
    name: 'password',
    mask: (input: string) => PWD_CHAR + new Array(String(input).length).join(PWD_CHAR),
  })
  return password
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
  if (thrown instanceof CryptShowError) {
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
  .fail((msg: string) => handleErr(new CryptShowError(msg)))
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
      logger.info('\n' + decrypted)
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
    'Create or edit file',
    (yargs) => yargs.positional('fileName', { type: 'string', demandOption: true }),
    async (argv) => {
      const pwd = await getPwd()

      let decrypted: string
      if (fs.existsSync(argv.fileName)) {
        const fileContent = fs.readFileSync(argv.fileName, 'utf8')
        decrypted = decrypt(fileContent, pwd)
      } else {
        decrypted = ''
      }

      let edited: string
      try {
        edited = await Termit.edit({ content: decrypted })
      } catch (thrown) {
        logger.error('Termit exited with error. File not saved.')
        handleErr(thrown)
        return
      }

      const { value } = await prompts({
        type: 'toggle',
        name: 'value',
        message: 'Save changes?',
        initial: true,
        active: 'yes',
        inactive: 'no',
      })

      if (value) {
        logger.info('saving changes...')
        const encrypted = encrypt(edited, pwd)
        fs.writeFileSync(argv.fileName, encrypted)
      } else {
        logger.info('changes not saved...')
      }

      process.exit() // stdin is not closed by prompts
    },
  )
  .help().argv
