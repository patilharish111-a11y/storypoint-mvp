FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install
COPY . .
RUN npm run build || true
EXPOSE 4000
CMD ["npm", "run", "dev"]
