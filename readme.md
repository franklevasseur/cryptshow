# CryptShow

<img src="./cryptshow.png"/>

Small CLI to encrypt files and read or modify them later.

## Usage

```sh
> npm i -g cryptshow
> crypt encrypt /my/file # encrypts the file in place
> crypt --help # shows help

Commands:
  crypt cat <fileName>      Read file
  crypt encrypt <fileName>  Encrypt file
  crypt decrypt <fileName>  Decrypt file
  crypt edit <fileName>     Edit file
```

## From Sources

```sh
> yarn && yarn build
> yarn start cat ./cryptshow # type password "cryptshow"
```

## License

MIT
