const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

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

const MONGODB_URI = process.env.VITE_MONGODB_URI || 'mongodb+srv://plablo:Yupaper8882@cluster0.t0ozb1f.mongodb.net/?appName=Cluster0';
const DB_NAME = process.env.VITE_MONGODB_DB || 'painel_yup';

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
      const hashedPassword = await bcrypt.hash('#Filial@2026', 10);
      
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
      
      console.log('✅ Usuário admin criado!');
      console.log('📌 Login: adm');
      console.log('🔑 Senha: #Filial@2026');
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
    
    console.log(`🔐 Tentativa de login: ${login}`);
    
    const collection = db.collection('usuarios');
    const user = await collection.findOne({ login });
    
    if (!user) {
      console.log(`❌ Usuário não encontrado: ${login}`);
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos'
      });
    }
    
    const isValid = await bcrypt.compare(senha, user.senha);
    
    if (!isValid) {
      console.log(`❌ Senha incorreta para: ${login}`);
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos'
      });
    }
    
    delete user.senha;
    
    console.log(`✅ Login bem-sucedido: ${login}`);
    
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
    const usuarios = await collection.find({}).toArray();
    usuarios.forEach(u => delete u.senha);
    res.json(usuarios);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post('/auth/usuarios', async (req, res) => {
  try {
    const { nome, login, senha, tipo, permissoes } = req.body;
    
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
    const { nome, tipo, permissoes, ativo } = req.body;
    
    const collection = db.collection('usuarios');
    
    const userExists = await collection.findOne({ _id: new ObjectId(id) });
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          nome, 
          tipo, 
          permissoes, 
          ativo,
          updatedAt: new Date().toISOString()
        } 
      }
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
    const atendentes = await collection.find({}).toArray();
    res.json(atendentes);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post('/auth/atendentes', async (req, res) => {
  try {
    const { nome, codigo, senha } = req.body;
    
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

app.post('/auth/atendente/verificar-senha', async (req, res) => {
  try {
    const { senha } = req.body;
    
    console.log(`🔐 Verificando atendente por senha: ${senha}`);
    
    if (!senha || senha.length !== 4) {
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
    
    console.log(`✅ Atendente encontrado: ${atendenteEncontrado.nome}`);
    
    res.json({ 
      success: true, 
      atendente: atendenteEncontrado
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
    await db.collection('atendente_eventos').insertOne({
      atendenteId,
      atendenteNome: atendente?.value?.nome || null,
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

    const collection = db.collection('atendentes');
    const atendente = await collection.findOneAndUpdate(
      { _id: new ObjectId(atendenteId) },
      { $inc: { totalRespostas: 1 } },
      { returnDocument: 'after' }
    );

    await db.collection('atendente_eventos').insertOne({
      atendenteId,
      atendenteNome: atendente?.value?.nome || null,
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
    const atendente = await collection.findOne({ sessaoAtual: sessaoId });
    
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

// ===== ROTA PARA SPA - Com caminho absoluto =====
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_PATH, 'index.html');
  console.log(`📄 Servindo: ${indexPath}`);
  res.sendFile(indexPath);
});

// ===== INICIAR SERVIDOR =====
connectMongo().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Servindo arquivos de: ${DIST_PATH}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
  });
});
