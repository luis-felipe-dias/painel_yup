const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

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

// ============= ROTAS DE AUTENTICAÇÃO =============

// Health check
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

// Inicializar admin
app.post('/auth/inicializar', async (req, res) => {
  try {
    const { login, senha, nome, tipo } = req.body;
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
      tipo: tipo || 'admin',
      permissoes: {
        paginas: ['dashboard', 'conversas', 'configuracoes', 'metricas'],
        setores: ['atendimento', 'financeiro', 'comercial', 'ouvidoria', 'qualidade', 'tecnico', 'rh']
      },
      ativo: true,
      criadoEm: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar usuário' });
  }
});

// Login
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

// ===== ROTAS DE USUÁRIOS =====

// Listar usuários
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

// Criar usuário
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
    console.error('❌ Erro ao criar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar usuário' });
  }
});

// Atualizar usuário
app.put('/auth/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo, permissoes, ativo } = req.body;
    
    console.log(`📤 [PUT] Atualizando usuário ID: ${id}`);
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });
    }
    
    if (!db) {
      return res.status(500).json({ success: false, message: 'Banco de dados não conectado' });
    }
    
    const collection = db.collection('usuarios');
    
    let userExists;
    try {
      const objectId = new ObjectId(id);
      userExists = await collection.findOne({ _id: objectId });
    } catch (err) {
      return res.status(400).json({ success: false, message: 'ID de usuário inválido' });
    }
    
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    
    const updateData = {
      nome: nome || userExists.nome,
      tipo: tipo || userExists.tipo,
      permissoes: permissoes || userExists.permissoes || { paginas: [], setores: [] },
      ativo: ativo !== undefined ? ativo : userExists.ativo,
      updatedAt: new Date().toISOString()
    };
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    const updatedUser = await collection.findOne({ _id: new ObjectId(id) });
    if (updatedUser) {
      delete updatedUser.senha;
    }
    
    res.json({ 
      success: true, 
      message: 'Usuário atualizado com sucesso',
      modifiedCount: result.modifiedCount,
      usuario: updatedUser
    });
  } catch (error) {
    console.error('❌ [PUT] Erro ao atualizar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar usuário: ' + error.message 
    });
  }
});

// ===== ROTAS DE ATENDENTES =====

// Listar atendentes
app.get('/auth/atendentes', async (req, res) => {
  try {
    const collection = db.collection('atendentes');
    const atendentes = await collection.find({}).toArray();
    res.json(atendentes);
  } catch (error) {
    res.status(500).json([]);
  }
});

// Criar atendente
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

// Verificar atendente por código
app.post('/auth/atendente/verificar', async (req, res) => {
  try {
    const { codigo } = req.body;
    
    const collection = db.collection('atendentes');
    const atendente = await collection.findOne({ codigo });
    
    if (!atendente) {
      return res.status(404).json({ success: false, message: 'Atendente não encontrado' });
    }
    
    res.json(atendente);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao verificar atendente' });
  }
});

// Verificar atendente por senha (4 dígitos)
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
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Banco de dados não conectado' 
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
      console.log(`❌ Atendente não encontrado para senha: ${senha}`);
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

// Registrar abertura de sessão
app.post('/auth/atendente/sessao', async (req, res) => {
  try {
    const { sessaoId, atendenteId } = req.body;
    
    console.log(`📝 Registrando abertura de sessão ${sessaoId} para atendente ${atendenteId}`);
    
    const collection = db.collection('atendentes');
    
    const atendente = await collection.findOne({ _id: new ObjectId(atendenteId) });
    if (!atendente) {
      return res.status(404).json({ success: false, message: 'Atendente não encontrado' });
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(atendenteId) },
      { 
        $set: { 
          sessaoAtual: sessaoId, 
          ultimaSessao: sessaoId 
        },
        $inc: { totalAtendimentos: 1 }
      }
    );
    
    console.log(`✅ Sessão registrada: ${result.modifiedCount} documento(s) modificado(s)`);
    
    res.json({ 
      success: true, 
      message: 'Abertura registrada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao registrar abertura:', error);
    res.status(500).json({ success: false });
  }
});

// Registrar resposta de atendente
app.post('/auth/atendente/resposta', async (req, res) => {
  try {
    const { sessaoId, atendenteId } = req.body;
    
    console.log(`📝 Registrando resposta para sessão ${sessaoId} do atendente ${atendenteId}`);
    
    const collection = db.collection('atendentes');
    
    const atendente = await collection.findOne({ _id: new ObjectId(atendenteId) });
    if (!atendente) {
      return res.status(404).json({ success: false, message: 'Atendente não encontrado' });
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(atendenteId) },
      { $inc: { totalRespostas: 1 } }
    );
    
    console.log(`✅ Resposta registrada: ${result.modifiedCount} documento(s) modificado(s)`);
    
    res.json({ 
      success: true, 
      message: 'Resposta registrada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao registrar resposta:', error);
    res.status(500).json({ success: false });
  }
});

// ===== ROTA PARA BUSCAR ATENDENTE POR SESSÃO - CORRIGIDA =====
app.get('/auth/atendente/sessao/:sessaoId', async (req, res) => {
  try {
    const { sessaoId } = req.params;
    
    console.log(`🔍 Buscando atendente para sessão: ${sessaoId}`);
    
    if (!db) {
      return res.status(500).json({ success: false, message: 'Banco não conectado' });
    }
    
    const collection = db.collection('atendentes');
    const atendente = await collection.findOne({ sessaoAtual: sessaoId });
    
    if (!atendente) {
      console.log(`ℹ️ Nenhum atendente encontrado para sessão ${sessaoId}`);
      return res.status(404).json({ success: false, message: 'Atendente não encontrado para esta sessão' });
    }
    
    console.log(`✅ Atendente encontrado: ${atendente.nome}`);
    res.json(atendente);
  } catch (error) {
    console.error('❌ Erro ao buscar atendente:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar atendente' });
  }
});

// Logout
app.post('/auth/logout', async (req, res) => {
  res.json({ success: true });
});

// Métricas
app.get('/auth/metricas', async (req, res) => {
  try {
    const atendentesCollection = db.collection('atendentes');
    const atendentes = await atendentesCollection.find({}).toArray();
    
    const topAtendimentos = [...atendentes]
      .sort((a, b) => (b.totalAtendimentos || 0) - (a.totalAtendimentos || 0))
      .slice(0, 5);
    
    const topRespostas = [...atendentes]
      .sort((a, b) => (b.totalRespostas || 0) - (a.totalRespostas || 0))
      .slice(0, 5);
    
    res.json({
      totalAtendentes: atendentes.length,
      topAtendimentos,
      topRespostas
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

// ===== ROTA PARA SPA =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ===== INICIAR SERVIDOR =====
connectMongo().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Servindo arquivos de: ${path.join(__dirname, 'dist')}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
  });
});