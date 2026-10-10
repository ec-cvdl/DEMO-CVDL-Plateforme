# Site statique servi par nginx sur Cloud Run (voir DEPLOIEMENT.md). Rien à construire : les
# fichiers sont copiés tels quels, sans les outils de développement ni les documents internes.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
RUN cd /usr/share/nginx/html \
  && rm -rf node_modules package.json package-lock.json eslint.config.js \
     Dockerfile nginx.conf .gcloudignore .gitignore .prettierrc.json .prettierignore .nojekyll \
     CLAUDE.md AUDIT-SECURITE-CVDL.md DEPLOIEMENT.md
