FROM node:18
WORKDIR /app
COPY package* .json ./
RUN npm install
COPY . .
EXPOSE 80800
CMD ["node", "index.js"]