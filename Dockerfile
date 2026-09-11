FROM denoland/deno:2.9.6

WORKDIR /app

COPY deno.json ./
COPY src ./src
RUN deno cache src/main.ts

COPY . .

EXPOSE 8000

CMD ["task", "start"]
