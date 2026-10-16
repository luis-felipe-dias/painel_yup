const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// Lê o .env que já existe na pasta do painel, sem dependência nova.
// Antes o servidor não lia .env nenhum: funcionava porque a string de
// conexão estava escrita dentro do código. Tirando ela de lá, isto é o que
// mantém o `npm start` funcionando igual.
(function carregarEnv() {
  try {
    const fs = require('fs');
    for (const arquivo of ['.env.server', '.env']) {
      const caminho = path.join(__dirname, arquivo);
      if (!fs.existsSync(caminho)) continue;
      for (const linha of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
        const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const valor = m[2].replace(/^["']|["']$/g, '');
        if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
      }
    }
  } catch (e) {
    console.warn('⚠️ Não foi possível ler o .env:', e.message);
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;

// Caminho absoluto para a pasta dist
const DIST_PATH = path.join(__dirname, 'dist');
console.log(`📁 Servindo arquivos de: ${DIST_PATH}`);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(DIST_PATH));

// A string de conexão NÃO fica no código. Antes ela estava escrita aqui com
// usuário e senha, e qualquer pessoa com acesso ao repositório via o banco.
// Agora vem só do ambiente (.env do servidor / variável do PM2).
const MONGODB_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || process.env.VITE_MONGODB_DB || 'painel_yup';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não definida. Suba o servidor com a variável de ambiente definida.');
  process.exit(1);
}

let db;

async function connectMongo() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Conectado ao MongoDB Atlas');
    await initAdmin();
    return db;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    return null;
  }
}

async function initAdmin() {
  try {
    const collection = db.collection('usuarios');
    const adminExists = await collection.findOne({ login: 'adm' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_SENHA_INICIAL || '#Filial@2026', 10);
      
      await collection.insertOne({
        nome: 'Administrador',
        login: 'adm',
        senha: hashedPassword,
        tipo: 'admin',
        permissoes: {
          paginas: ['dashboard', 'conversas', 'configuracoes', 'metricas'],
          setores: ['atendimento', 'financeiro', 'comercial', 'ouvidoria', 'qualidade', 'tecnico', 'rh']
        },
        ativo: true,
        criadoEm: new Date().toISOString()
      });
      
      console.log('✅ Usuário admin criado (login: adm). Troque a senha no primeiro acesso.');
    } else {
      console.log('ℹ️ Usuário admin já existe');
    }
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  }
}

// ===== ROTAS DE AUTENTICAÇÃO =====

app.get('/auth/health', async (req, res) => {
  try {
    if (!db) {
      return res.json({ status: 'disconnected', message: 'Banco não conectado' });
    }
    const collection = db.collection('usuarios');
    const count = await collection.countDocuments();
    res.json({ status: 'connected', users: count });
  } catch (error) {
    res.json({ status: 'disconnected', error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { login, senha } = req.body;

    // Sem esses dois typeof, mandar {"login":{"$ne":null}} fazia o Mongo
    // devolver o primeiro usuário da coleção - normalmente o admin.
    if (typeof login !== 'string' || typeof senha !== 'string') {
      return res.status(400).json({ success: false, message: 'Usuário ou senha incorretos' });
    }

    const collection = db.collection('usuarios');
    const user = await collection.findOne({ login });

    if (!user || !user.senha) {
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos'
      });
    }

    // Usuário desativado em Configurações continuava conseguindo entrar.
    if (user.ativo === false) {
      return res.status(403).json({
        success: false,
        message: 'Usuário desativado. Procure o administrador.'
      });
    }

    const isValid = await bcrypt.compare(senha, user.senha);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos'
      });
    }

    delete user.senha;

    console.log(`✅ Login: ${user.login}`);
    
    res.json({
      success: true,
      usuario: user,
      token: 'jwt-token-temporario'
    });
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login'
    });
  }
});

app.get('/auth/usuarios', async (req, res) => {
  try {
    const collection = db.collection('usuarios');
    // Projeção no banco: o hash nunca sai do Mongo, em vez de sair e ser
    // apagado depois (um `forEach` esquecido vazava a coleção inteira).
    const usuarios = await collection.find({}, { projection: { senha: 0 } }).toArray();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post('/auth/usuarios', async (req, res) => {
  try {
    const { nome, login, senha, tipo, permissoes } = req.body;

    if (typeof login !== 'string' || typeof senha !== 'string' || !login.trim() || senha.length < 8) {
      return res.status(400).json({ success: false, message: 'Login e senha (8+ caracteres) são obrigatórios' });
    }

    const collection = db.collection('usuarios');
    const existingUser = await collection.findOne({ login });
    
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Usuário já existe' });
    }
    
    const hashedPassword = await bcrypt.hash(senha, 10);
    
    await collection.insertOne({
      nome,
      login,
      senha: hashedPassword,
      tipo: tipo || 'atendente',
      permissoes: permissoes || { paginas: [], setores: [] },
      ativo: true,
      criadoEm: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar usuário' });
  }
});

app.put('/auth/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Sem isso, um id torto virava exceção 500 em vez de 400.
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const collection = db.collection('usuarios');

    const userExists = await collection.findOne({ _id: new ObjectId(id) });
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    // $set parcial. Antes, qualquer campo ausente no corpo entrava como
    // undefined e ZERAVA o valor gravado - mandar só {ativo:false} apagava
    // nome, tipo e permissões do usuário.
    const campos = { updatedAt: new Date().toISOString() };
    const { nome, tipo, permissoes, ativo } = req.body;
    if (nome !== undefined) campos.nome = nome;
    if (tipo !== undefined) campos.tipo = tipo;
    if (permissoes !== undefined) campos.permissoes = permissoes;
    if (ativo !== undefined) campos.ativo = ativo;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: campos }
    );
    
    res.json({ 
      success: true, 
      message: 'Usuário atualizado com sucesso',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar usuário: ' + error.message 
    });
  }
});

app.get('/auth/atendentes', async (req, res) => {
  try {
    const collection = db.collection('atendentes');
    // Mesmo motivo do /auth/usuarios: o hash da senha de 4 dígitos não
    // precisa (e não pode) chegar ao navegador. Com 4 dígitos, ter o hash
    // em mãos é quebrar as 10.000 combinações em segundos.
    const atendentes = await collection.find({}, { projection: { senha: 0 } }).toArray();
    res.json(atendentes);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post('/auth/atendentes', async (req, res) => {
  try {
    const { nome, codigo, senha } = req.body;

    if (typeof codigo !== 'string' || !/^\d{4}$/.test(codigo) || typeof senha !== 'string' || !/^\d{4}$/.test(senha)) {
      return res.status(400).json({ success: false, message: 'Código e senha devem ter 4 dígitos' });
    }

    const collection = db.collection('atendentes');
    const existing = await collection.findOne({ codigo });
    
    if (existing) {
      return res.status(409).json({ success: false, message: 'Código já existe' });
    }
    
    const hashedPassword = await bcrypt.hash(senha, 10);
    
    await collection.insertOne({
      nome,
      codigo,
      senha: hashedPassword,
      totalAtendimentos: 0,
      totalRespostas: 0,
      ativo: true,
      criadoEm: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar atendente' });
  }
});

// Ativar/desativar e renomear atendente. Os botões de lixeira e lápis da
// tela de Configurações não tinham rota nenhuma por trás - ficavam ali sem
// fazer nada. Desativa em vez de apagar: o histórico de atendimentos aponta
// pro id do atendente e apagar o registro deixaria as métricas sem nome.
app.put('/auth/atendentes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const campos = { atualizadoEm: new Date().toISOString() };
    if (req.body.nome !== undefined) campos.nome = req.body.nome;
    if (req.body.ativo !== undefined) campos.ativo = req.body.ativo;
    if (req.body.senha !== undefined) {
      if (typeof req.body.senha !== 'string' || !/^\d{4}$/.test(req.body.senha)) {
        return res.status(400).json({ success: false, message: 'Senha deve ter 4 dígitos' });
      }
      campos.senha = await bcrypt.hash(req.body.senha, 10);
    }

    const r = await db.collection('atendentes').updateOne({ _id: new ObjectId(id) }, { $set: campos });
    if (r.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Atendente não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao atualizar atendente:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar atendente' });
  }
});

// Mapa sessaoId -> nome do atendente, de uma vez.
// O painel fazia uma requisição POR sessão aberta a cada 5 segundos
// (20 sessões = 20 requisições = 240 req/min por atendente logado).
// Aqui é uma consulta só.
app.get('/auth/atendentes/por-sessao', async (req, res) => {
  try {
    const atendentes = await db.collection('atendentes')
      .find(
        { sessaoAtual: { $exists: true, $nin: [null, ''] } },
        { projection: { nome: 1, sessaoAtual: 1 } }
      )
      .toArray();

    const mapa = {};
    atendentes.forEach((a) => { mapa[a.sessaoAtual] = a.nome; });
    res.json({ sucesso: true, mapa });
  } catch (error) {
    console.error('❌ Erro ao montar mapa de atendentes por sessão:', error);
    res.status(500).json({ sucesso: false, mapa: {} });
  }
});

app.post('/auth/atendente/verificar-senha', async (req, res) => {
  try {
    const { senha } = req.body;

    if (typeof senha !== 'string' || senha.length !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Senha deve ter 4 dígitos' 
      });
    }
    
    const collection = db.collection('atendentes');
    const todosAtendentes = await collection.find({ ativo: true }).toArray();
    
    let atendenteEncontrado = null;
    
    for (const a of todosAtendentes) {
      const isValid = await bcrypt.compare(senha, a.senha);
      if (isValid) {
        atendenteEncontrado = a;
        break;
      }
    }
    
    if (!atendenteEncontrado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Senha inválida. Verifique e tente novamente.' 
      });
    }
    
    console.log(`✅ Atendente identificado: ${atendenteEncontrado.nome}`);

    const { senha: _hash, ...atendenteSemSenha } = atendenteEncontrado;
    res.json({
      success: true,
      atendente: atendenteSemSenha
    });
  } catch (error) {
    console.error('❌ Erro ao verificar atendente por senha:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar atendente' 
    });
  }
});

app.post('/auth/atendente/sessao', async (req, res) => {
  try {
    const { sessaoId, atendenteId } = req.body;
    if (!ObjectId.isValid(atendenteId)) {
      return res.status(400).json({ success: false, message: 'atendenteId inválido' });
    }

    const collection = db.collection('atendentes');
    const atendente = await collection.findOneAndUpdate(
      { _id: new ObjectId(atendenteId) },
      {
        $set: { sessaoAtual: sessaoId, ultimaSessao: sessaoId },
        $inc: { totalAtendimentos: 1 }
      },
      { returnDocument: 'after' }
    );

    // Log do evento com timestamp - sem isso só dava pra saber o total
    // acumulado desde sempre, nunca "quantos hoje" ou "quantos essa semana"
    // pra enxergar se um atendente está sobrecarregado agora.
    // O driver 5+ devolve o documento direto; o 4 devolvia dentro de .value.
    // Por isso os dois caminhos - era o motivo de atendenteNome vir sempre null.
    await db.collection('atendente_eventos').insertOne({
      atendenteId,
      atendenteNome: atendente?.nome ?? atendente?.value?.nome ?? null,
      tipo: 'atendimento',
      sessaoId,
      data: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.post('/auth/atendente/resposta', async (req, res) => {
  try {
    const { atendenteId } = req.body;
    if (!ObjectId.isValid(atendenteId)) {
      return res.status(400).json({ success: false, message: 'atendenteId inválido' });
    }

    const collection = db.collection('atendentes');
    const atendente = await collection.findOneAndUpdate(
      { _id: new ObjectId(atendenteId) },
      { $inc: { totalRespostas: 1 } },
      { returnDocument: 'after' }
    );

    await db.collection('atendente_eventos').insertOne({
      atendenteId,
      atendenteNome: atendente?.nome ?? atendente?.value?.nome ?? null,
      tipo: 'resposta',
      data: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/auth/atendente/sessao/:sessaoId', async (req, res) => {
  try {
    const { sessaoId } = req.params;
    
    const collection = db.collection('atendentes');
    const atendente = await collection.findOne(
      { sessaoAtual: sessaoId },
      { projection: { senha: 0 } }
    );

    if (!atendente) {
      return res.status(404).json({ success: false, message: 'Atendente não encontrado para esta sessão' });
    }
    
    res.json(atendente);
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.post('/auth/logout', async (req, res) => {
  res.json({ success: true });
});

// ===== MÉTRICAS DE ATENDIMENTO =====
// Carga por atendente: quem está atendendo muito ou pouco. totalAtendimentos/
// totalRespostas são acumulados desde sempre (não dá pra saber "hoje" só com
// eles); atendente_eventos guarda cada evento com data, então "hoje" e
// "últimos 7 dias" vêm de lá.
app.get('/auth/metricas', async (req, res) => {
  try {
    const atendentesCol = db.collection('atendentes');
    const eventosCol = db.collection('atendente_eventos');

    const atendentes = await atendentesCol.find({ ativo: { $ne: false } }).toArray();

    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const inicio7dias = new Date(inicioHoje.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [eventosHoje, eventos7dias] = await Promise.all([
      eventosCol.aggregate([
        { $match: { tipo: 'atendimento', data: { $gte: inicioHoje } } },
        { $group: { _id: '$atendenteId', total: { $sum: 1 } } }
      ]).toArray(),
      eventosCol.aggregate([
        { $match: { tipo: 'atendimento', data: { $gte: inicio7dias } } },
        { $group: { _id: '$atendenteId', total: { $sum: 1 } } }
      ]).toArray()
    ]);

    const mapaHoje = new Map(eventosHoje.map(e => [e._id, e.total]));
    const mapa7dias = new Map(eventos7dias.map(e => [e._id, e.total]));

    const porAtendente = atendentes.map(a => {
      const id = a._id.toString();
      const atendimentosHoje = mapaHoje.get(id) || 0;
      const atendimentos7dias = mapa7dias.get(id) || 0;
      const totalAtendimentos = a.totalAtendimentos || 0;
      const totalRespostas = a.totalRespostas || 0;
      return {
        id,
        nome: a.nome,
        atendendoAgora: !!a.sessaoAtual,
        atendimentosHoje,
        atendimentos7dias,
        totalAtendimentos,
        totalRespostas,
        taxaResposta: totalAtendimentos > 0 ? Math.round((totalRespostas / totalAtendimentos) * 100) : null
      };
    }).sort((a, b) => b.atendimentos7dias - a.atendimentos7dias);

    const media7dias = porAtendente.length > 0
      ? porAtendente.reduce((soma, a) => soma + a.atendimentos7dias, 0) / porAtendente.length
      : 0;

    // Sinaliza quem está bem acima (sobrecarregado) ou bem abaixo (ocioso)
    // da média do time nos últimos 7 dias - só quando há atendentes o
    // bastante pra "média" fazer sentido.
    const comSinalizacao = porAtendente.map(a => ({
      ...a,
      cargaVsMedia: media7dias > 0
        ? (a.atendimentos7dias >= media7dias * 1.5 ? 'sobrecarregado' : a.atendimentos7dias <= media7dias * 0.5 ? 'ocioso' : 'normal')
        : 'normal'
    }));

    res.json({
      sucesso: true,
      mediaAtendimentos7dias: Math.round(media7dias * 10) / 10,
      atendentes: comSinalizacao
    });
  } catch (error) {
    console.error('❌ Erro ao calcular métricas:', error);
    res.status(500).json({ sucesso: false, message: 'Erro ao calcular métricas' });
  }
});

// ===== HISTÓRICO DE REPOSIÇÃO DE ESTOQUE =====
// A classificação (crítico/precisa repor/ok) é calculada no painel a partir
// dos dados do backend de estoque, que não guarda histórico - por isso o
// painel manda um retrato do dia aqui, um por dia (upsert), e essa coleção
// vira a série usada pra saber se a reposição está melhorando ou piorando.
app.post('/estoque/snapshot', async (req, res) => {
  try {
    const { criticos, precisaRepor, estoqueOk, total } = req.body;
    if ([criticos, precisaRepor, estoqueOk, total].some(v => typeof v !== 'number')) {
      return res.status(400).json({ sucesso: false, message: 'Dados inválidos' });
    }

    const hoje = new Date();
    const dataChave = hoje.toISOString().slice(0, 10); // YYYY-MM-DD

    await db.collection('estoque_historico').updateOne(
      { data: dataChave },
      {
        $set: {
          data: dataChave,
          criticos,
          precisaRepor,
          estoqueOk,
          total,
          atualizadoEm: hoje
        }
      },
      { upsert: true }
    );

    res.json({ sucesso: true });
  } catch (error) {
    console.error('❌ Erro ao salvar snapshot de estoque:', error);
    res.status(500).json({ sucesso: false });
  }
});

app.get('/estoque/historico', async (req, res) => {
  try {
    const dias = Math.min(parseInt(req.query.dias) || 30, 90);
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    const desdeChave = desde.toISOString().slice(0, 10);

    const historico = await db.collection('estoque_historico')
      .find({ data: { $gte: desdeChave } })
      .sort({ data: 1 })
      .toArray();

    res.json({ sucesso: true, historico });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico de estoque:', error);
    res.status(500).json({ sucesso: false, historico: [] });
  }
});


// ===== RESPOSTAS RÁPIDAS =====
// Ficam no Mongo e não no navegador de propósito: com vários atendentes no
// mesmo número, a lista tem que ser a mesma para todo mundo.
app.get('/config/respostas-rapidas', async (req, res) => {
  try {
    const respostas = await db.collection('respostas_rapidas')
      .find({})
      .sort({ categoria: 1, atalho: 1 })
      .toArray();
    res.json({ sucesso: true, respostas });
  } catch (error) {
    console.error('❌ Erro ao listar respostas rápidas:', error);
    res.status(500).json({ sucesso: false, respostas: [] });
  }
});

app.post('/config/respostas-rapidas', async (req, res) => {
  try {
    const atalho = String(req.body.atalho || '').replace(/^\//, '').trim().toLowerCase();
    if (!atalho || !req.body.texto) {
      return res.status(400).json({ sucesso: false, erro: 'atalho e texto são obrigatórios' });
    }
    const col = db.collection('respostas_rapidas');
    if (await col.findOne({ atalho })) {
      return res.status(409).json({ sucesso: false, erro: `/${atalho} já existe` });
    }
    const doc = {
      atalho,
      titulo: req.body.titulo || atalho,
      texto: req.body.texto,
      categoria: req.body.categoria || 'Geral',
      ativo: req.body.ativo !== false,
      criadoPor: req.body.criadoPor || null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
    const r = await col.insertOne(doc);
    res.json({ sucesso: true, resposta: { ...doc, _id: r.insertedId } });
  } catch (error) {
    console.error('❌ Erro ao criar resposta rápida:', error);
    res.status(500).json({ sucesso: false });
  }
});

app.put('/config/respostas-rapidas/:id', async (req, res) => {
  try {
    const campos = {};
    ['titulo', 'texto', 'categoria', 'ativo'].forEach((k) => {
      if (req.body[k] !== undefined) campos[k] = req.body[k];
    });
    if (req.body.atalho !== undefined) {
      campos.atalho = String(req.body.atalho).replace(/^\//, '').trim().toLowerCase();
    }
    campos.atualizadoEm = new Date();
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ sucesso: false, erro: 'ID inválido' });
    }
    const r = await db.collection('respostas_rapidas')
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: campos });
    if (r.matchedCount === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Resposta não encontrada' });
    }
    res.json({ sucesso: true });
  } catch (error) {
    console.error('❌ Erro ao atualizar resposta rápida:', error);
    res.status(500).json({ sucesso: false });
  }
});

app.delete('/config/respostas-rapidas/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ sucesso: false, erro: 'ID inválido' });
    }
    const r = await db.collection('respostas_rapidas')
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (r.deletedCount === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Resposta não encontrada' });
    }
    res.json({ sucesso: true });
  } catch (error) {
    console.error('❌ Erro ao apagar resposta rápida:', error);
    res.status(500).json({ sucesso: false });
  }
});

// ===== 404 DE API =====
// Isso tem que vir ANTES do catch-all do SPA. Sem essa rota, chamar um
// endpoint que não existe devolvia o index.html com status 200 - o painel
// recebia HTML onde esperava JSON e a tela ficava vazia "sem erro".
// Foi exatamente o que escondeu as respostas rápidas não salvando.
app.all(['/auth/*', '/config/*', '/estoque/*'], (req, res) => {
  res.status(404).json({
    sucesso: false,
    success: false,
    erro: `Rota ${req.method} ${req.path} não existe neste servidor`,
  });
});

// ===== ROTA PARA SPA - Com caminho absoluto =====
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// ===== INICIAR SERVIDOR =====
connectMongo().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Servindo arquivos de: ${DIST_PATH}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
  });
});
