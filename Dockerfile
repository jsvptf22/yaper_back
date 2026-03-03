FROM node:25-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . . 

RUN pnpm run prebuild

RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/main"]