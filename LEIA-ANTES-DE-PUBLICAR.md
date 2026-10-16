# Painel Yup — o que mudou e o que fazer na VPS

## 1. Por que as respostas rápidas não salvavam

O código novo do painel chamava `/config/respostas-rapidas`, mas o `server.js`
que está rodando em `2.25.147.117:3000` é o antigo e não tem essa rota.
O Express caía no `app.get('*')` (catch-all do SPA) e devolvia o **index.html
com status 200**. O navegador recebia HTML onde esperava JSON, não deu erro
nenhum, e a lista voltava vazia.

Dois consertos:

- `server.js` agora devolve **404 em JSON** para qualquer `/auth/*`,
  `/config/*` ou `/estoque/*` que não exista, antes do catch-all. Rota
  errada agora aparece como erro, não como tela vazia.
- `respostasRapidas.service.ts` detecta HTML no lugar de JSON e cai para
  `localStorage`, com aviso na tela: "Salvando só neste navegador".

**O aviso só desaparece depois que você publicar o `server.js` novo.**

## 2. Passos na VPS (ordem importa)

```bash
# 1. subir os arquivos novos (server.js + src/)
# 2. criar o .env do servidor na pasta do painel:
cat > .env.server <<'ENV'
MONGODB_URI=mongodb+srv://USUARIO:SENHA_NOVA@cluster0.t0ozb1f.mongodb.net/?appName=Cluster0
MONGODB_DB=painel_yup
ENV
chmod 600 .env.server

# 3. build e restart
npm run build
pm2 restart painel_yup   # ou o nome que estiver em `pm2 list`
pm2 logs painel_yup --lines 30
```

Se aparecer `❌ MONGODB_URI não definida`, o `.env.server` não foi lido —
confira se ficou na mesma pasta do `server.js`.

## 3. URGENTE — credenciais expostas (faça hoje)

O `.env` do painel usa prefixo `VITE_`, e **tudo que começa com `VITE_` é
embutido no JavaScript que vai para o navegador**. Qualquer pessoa que abra
o painel e aperte F12 vê, em texto puro:

| Variável | O que expõe |
|---|---|
| `VITE_MONGODB_URI` | usuário e senha do MongoDB Atlas (acesso total ao banco) |
| `VITE_JWT_SECRET` | segredo de assinatura de token |
| `VITE_ADMIN_PASSWORD` | senha do admin do painel |

A senha do Mongo também estava escrita dentro do `server.js`. Eu tirei do
código, mas **tirar do código não desfaz a exposição**: a string já circulou.

O que você precisa fazer (eu não mexo em credencial):

1. **Atlas** → Database Access → trocar a senha do usuário `plablo`.
2. Gerar um `VITE_JWT_SECRET` novo e trocar a senha do admin do painel.
3. No `.env` do painel, **apagar** `VITE_MONGODB_URI`, `VITE_JWT_SECRET`,
   `VITE_ADMIN_LOGIN` e `VITE_ADMIN_PASSWORD`. Nada disso tem uso no
   navegador — o acesso ao banco é sempre pelo `server.js`.
4. Colocar as credenciais novas **só** no `.env.server` (sem `VITE_`).
5. Atlas → Network Access: trocar `0.0.0.0/0` pelo IP da VPS, se ainda estiver aberto.

## 4. Falta fazer (não dá pra resolver sem decidir junto)

- **Nenhuma rota do `server.js` tem autenticação.** Qualquer pessoa com o IP
  cria usuário admin via `curl`. O `token` do login é a string literal
  `'jwt-token-temporario'` — não é JWT, não valida nada.
- **CORS `origin: '*'`** — qualquer site pode chamar a API do painel.
- **O painel está em HTTP, por IP.** Senha de atendente trafega em texto
  claro. Precisa de domínio + HTTPS (Caddy ou nginx + Let's Encrypt).

Esses três andam juntos: fazem sentido como uma rodada só de segurança.
