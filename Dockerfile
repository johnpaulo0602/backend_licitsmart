# Use uma imagem base do Node.js
FROM node:18

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie o arquivo package.json e package-lock.json
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o restante do código da aplicação para o container
COPY . .

# Exponha a porta do servidor
EXPOSE 5000

# Comando para iniciar o servidor
CMD ["node", "server.js"]
