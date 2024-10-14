FROM oven/bun:1.1.29-alpine
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY src src

# since bun uses tsconfig to resolve import paths
COPY tsconfig.json .

VOLUME /app/data

CMD [ "bun", "run", "start" ]
