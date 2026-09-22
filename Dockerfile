FROM denoland/deno:2.9.6

WORKDIR /app

COPY --chown=deno:deno deno.json deno.lock ./
COPY --chown=deno:deno src ./src
COPY --chown=deno:deno frontend ./frontend

USER deno

RUN deno cache src/main.ts

EXPOSE 8000

CMD ["task", "start"]
