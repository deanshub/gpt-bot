# AI telegram bot

## Features

- [x] Chat with GPT
- [x] Schedule messages
- [x] Image generation
- [x] Image reading (including captions)
- [ ] List scheduled messages
- [ ] Store scheduled messages in database

## Local setup

create `.env` file (you can also copy from .env.example)

```
OPENAI_API_KEY=sk-...
BOT_TOKEN=...
AUTHORIZED_USERS=telegram_user_ids_seperated_by_commas
BUFFER_MESSAGES_TIMEFRAME=60
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun start
```

## Prebuilt docker image

[The docker images are hosted on GitHub packages](https://github.com/deanshub/gpt-bot/pkgs/container/gpt-bot). You can use them by pulling the image:

```bash
docker pull ghcr.io/deanshub/gpt-bot:main
```

## Docker compose example

```
version: '3'
services:
    gpt-bot:
        image: ghcr.io/deanshub/gpt-bot:main
        restart: unless-stopped
        environment:
            OPENAI_API_KEY: 'OPENAI_API_KEY_HERE'
            BOT_TOKEN: 'TOKEN_HERE'
            AUTHORIZED_USERS: 'ID1,ID2'
            BUFFER_MESSAGES_TIMEFRAME: '60'
        privileged: true
```
