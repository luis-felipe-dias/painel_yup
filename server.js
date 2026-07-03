import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, 'dist')));

// Rota para SPA - USAR app.get com regex ou wildcard corretamente
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 Servindo arquivos de: ${path.join(__dirname, 'dist')}`);
});
