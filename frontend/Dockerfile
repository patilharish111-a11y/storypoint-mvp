FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
