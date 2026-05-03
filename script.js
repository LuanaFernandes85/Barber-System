// ─── CONFIGURAÇÃO E ESTADO ──────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyCYxkZyOoRFVA4NrI2Qp-if4gQ6GlUougs",
    authDomain: "barber-system1.firebaseapp.com",
    projectId: "barber-system1",
    storageBucket: "barber-system1.firebasestorage.app",
    messagingSenderId: "521949233412",
    appId: "1:521949233412:web:27078b6f152079d426d051",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let intervaloMinutos = 60;
let horarioSelecionado = null;
let agendas = [];

let financeiro = [];
let finTipo = 'entrada';
let clienteIdEdicao = null;

let configGlobais = {
    servicos: [],
    barbeiros: [],
    intervalo: 60
};

// ─── INICIALIZAÇÃO (CORRIGIDA) ───────────────────────────────────
auth.onAuthStateChanged(user => {
    const isAdminPage = window.location.pathname.includes("admin.html"); 

    if (!user) {
        window.location.href = "login.html";
    } else {
        const adminEmail = "luana8512.12@gmail.com";

        if (user.email === adminEmail) {
            console.log("Acesso Admin confirmado.");
            inicializarSistema();
        } else {
           
            if (isAdminPage) {
                alert("Acesso negado. Redirecionando para sua área.");
                window.location.href = "index.html"; // Página do barbeiro
            } else {
                verificarAssinatura(user);
            }
        }
    }
});

// Função para organizar o carregamento da tela
function inicializarSistema() {
    carregarAgendas();
    carregarConfiguracoes();
    carregarFinanceiro();

    const inputData = document.getElementById('ag-data');

    if (inputData && !inputData.value) {
        inputData.value = getHojeStr();
    }

    const sideDate = document.getElementById('sidebar-date');
    if (sideDate) {
        sideDate.textContent = new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
    }
}
    
async function buscarSugestoes(valor) {
    const divSugestoes = document.getElementById('sugestoes-clientes');
    
    if (valor.length < 2) {
        divSugestoes.style.display = 'none';
        return;
    }

    try {
        const userId = firebase.auth().currentUser.uid;
        // Busca na subcoleção 'clientes' que criamos antes
        const snapshot = await db.collection("usuarios").doc(userId).collection("clientes").get();
        
        const filtrados = snapshot.docs
            .map(doc => doc.data())
            .filter(c => c.nome.toLowerCase().includes(valor.toLowerCase()));

        if (filtrados.length > 0) {
            divSugestoes.style.display = 'block';
            divSugestoes.innerHTML = filtrados.map(c => `
                <div onclick="selecionarSugestao('${c.nome}', '${c.tel}')" 
                     style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; color: #333;">
                    <strong>${c.nome}</strong><br>
                    <small style="color: #777;">${c.tel}</small>
                </div>
            `).join('');
        } else {
            divSugestoes.style.display = 'none';
        }
    } catch (error) {
        console.error("Erro ao buscar no Firebase:", error);
    }
}

function selecionarSugestao(nome, tel) {
    document.getElementById('ag-nome').value = nome;
    document.getElementById('ag-tel').value = tel;
    document.getElementById('sugestoes-clientes').style.display = 'none';
}


// Função de verificação de pagamento
function verificarAssinatura(user) {
    db.collection("usuarios").doc(user.uid).onSnapshot(doc => { // Usar onSnapshot para bloqueio em tempo real
        if (doc.exists) {
            const dados = doc.data();
            const hoje = new Date().toISOString().split('T')[0];

   
            if (dados.status === "bloqueado") {
                bloquearSistema("Sua conta foi suspensa pelo administrador.");
                return;
            }

            if (dados.validade < hoje) {
                bloquearSistema("Sua assinatura expirou. Realize o pagamento para continuar.");
                return;
            }

            inicializarSistema();
        }
    });
}



// ─── UTILS ──────────────────────────────────────────────────────
const getHojeStr = () => new Date().toLocaleDateString('en-CA');
const initials = (n) => (n || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const fmt = (v) => 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',');
const horaAtual = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const getUserId = () => {
    const user = auth.currentUser;
    if (user) return user.uid;
   
    return null; 
};


// ─── NAVEGAÇÃO ───────────────────────────────────────────────────
function tab(id) {
    
    document.querySelectorAll
    ('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    
    const tabs = ['agenda', 'configurações', 'financeiro', 'clientes']; 
    const index = tabs.indexOf(id);
    
  
    if (index !== -1) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[index]) navItems[index].classList.add('active');
    }
    
    // 3. Mostra a seção correta
    const section = document.getElementById('sec-' + id);
    if (section) {
        section.classList.add('active');
    } else {
        console.error("Seção não encontrada: sec-" + id);
    }

   
    if (id === 'clientes') {
        listarClientes();
    }

    if (id === 'config' || id === 'configurações') {
        carregarConfiguracoes();
    }

    
    const btn = document.getElementById('menuBtn');
    if (btn) {
        btn.style.display = (id === 'configurações' || id === 'financeiro') ? 'block' : 'none';
    }
}
// ─── FUNÇÕES DE INTERFACE (MENU E OVERLAY) ──────────────────────

function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

function closeMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');

    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function openMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');

    if (sidebar && overlay) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    }
}

// Fecha o menu automaticamente ao clicar em um item no mobile
document.addEventListener('click', (e) => {
    const clicouNoItem = e.target.closest('.nav-item');
    const clicouNaConfig = e.target.closest('.config-item') || e.target.closest('#btn-config'); 

    if ((clicouNoItem || clicouNaConfig) && window.innerWidth <= 640) {
       
        if (typeof closeMenu === "function") {
            closeMenu();
        } else if (typeof fecharMenuLateral === "function") {
            fecharMenuLateral();
        }
    }
});

// ─── MÓDULO: AGENDA ──────────────────────────────────────────
function carregarAgendas() {
    const userId = getUserId();
    
    if (!userId) {
        console.warn("Aguardando ID do usuário para carregar agendas...");
        return;
    }

    db.collection("usuarios").doc(userId).collection("agendas")
        .onSnapshot(snapshot => {
        
            agendas = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));

            console.log("Agendas carregadas:", agendas.length); 

          
            renderAgenda();  
            gerarHorarios();   
        }, error => {
            console.error("Erro no Snapshot:", error);
        });
      }

function addAgenda() {
    const nome = document.getElementById('ag-nome').value.trim();
    const tel = document.getElementById('ag-tel').value.trim();
    const serv = document.getElementById('ag-serv').value;
    const barb = document.getElementById('ag-barb').value;
    const data = document.getElementById('ag-data').value;
    const hora = horarioSelecionado;

    if (!nome || !hora) return alert('Preencha o nome e o horário!');

    db.collection("usuarios").doc(getUserId()).collection("agendas").add({
        nome, tel, serv, barb, data, hora,
        status: 'agendado',
        criadoEm: new Date()
    });

    document.getElementById('ag-nome').value = '';
    horarioSelecionado = null;

    document.getElementById('ag-tel').value = ''; 
// Se você tiver outros campos, pode aproveitar e limpar também:
document.getElementById('ag-nome').value = '';
document.getElementById('ag-servico').value = '';
}

function renderAgenda() {
    const el = document.getElementById('lista-agenda');
    if (!el) return;
    if (!agendas.length) return el.innerHTML = '<div class="empty">Nenhum agendamento.</div>';

    const proximo = getProximoCliente();
    const grupos = {};
    agendas.forEach(a => {
        if (!grupos[a.data]) grupos[a.data] = [];
        grupos[a.data].push(a);
    });

   el.innerHTML = Object.keys(grupos)
    .filter(data => data !== "undefined" && data !== "null" && data !== "") 
    .map(data => {
        const clientes = grupos[data].filter(a => a.status !== 'atendido')
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

        return `
        <div class="card">
            <div class="agenda-data" onclick="toggleDia('${data}')">
                <span class="agenda-dia">📅 ${formatarData(data)}</span>
                <span class="agenda-qtd">${clientes.length} clientes</span>
            </div>
            <div class="agenda-lista ${data === getHojeStr() ? 'aberto' : ''}" id="dia-${data}">
                ${clientes.map(a => {
                    const status = getStatusHorario(a);
                  return `
<div class="list-item ${proximo && proximo.id === a.id ? 'proximo-cliente' : ''}">
    <div class="avatar">${initials(a.nome)}</div>
    
    <div class="item-info">
        <div class="item-name" style="color: #eab308; font-weight: bold;">
            ${a.nome}
        </div>
        <div class="item-sub" style="color: #94a3b8;">
            ${a.hora || '--:--'} • ${a.serv}
        </div>
    </div>
    
    <div class="item-actions">
        <button class="btn-green" style=" color:#25d366; ;" 
            onclick="abrirWhatsapp('${a.tel}', '${a.nome}', '${a.serv}', '${a.hora}')">
            Zap
        </button>
        
        <button class="btn-green" style="color: #10b98 ;" 
            onclick="finalizarAtendimento('${a.id}')">
            Atender
        </button>
        
        <button class="btn-red" style="  color: #ef4444;" 
            onclick="removerAgenda('${a.id}')">
            Remover
        </button>
    </div>
</div>`;
                }).join('')}
            </div>
        </div>`;
    }).join('');
    atualizarResumo();
   
}

function removerAgenda(id) {
    db.collection("usuarios").doc(getUserId()).collection("agendas").doc(id).delete();
}


// ─── FUNÇÃO: LIMPAR AGENDA DO DIA───────────────────────────
async function limparAgendaDia() {
 
  const dataSelecionada = document.getElementById('ag-data').value;

  if (!dataSelecionada) {
    alert("Selecione uma data para limpar.");
    return;
  }

  // Ajustamos a mensagem para mostrar a data que será apagada
  const dataFormatada = dataSelecionada.split('-').reverse().join('/');
  const confirmacao = confirm(`Tem certeza que deseja apagar TODOS os agendamentos do dia ${dataFormatada}?`);
  if (!confirmacao) return;

  const userId = getUserId();

  
  const agendamentosNoDia = agendas.filter(a => a.data === dataSelecionada);

  if (agendamentosNoDia.length === 0) {
    alert("Não há agendamentos para limpar nesta data.");
    return;
  }

  try {
    const batch = db.batch();

    agendamentosNoDia.forEach(a => {
      const docRef = db.collection("usuarios")
                       .doc(userId)
                       .collection("agendas")
                       .doc(a.id);
      batch.delete(docRef);
    });

    await batch.commit();
    alert(`Agenda do dia ${dataFormatada} limpa com sucesso!`);
    
    // Recarregar a lista para sumir os itens da tela
    if (typeof carregarAgendamentos === "function") {
        carregarAgendamentos();
    }

  } catch (error) {
    console.error("Erro ao limpar agenda:", error);
    alert("Erro ao tentar limpar a agenda.");
  }
}

// ───CONFIGURAÇAO────────────────────
function carregarConfiguracoes() {
    const userId = getUserId();
    if(!userId) return;

    db.collection("usuarios").doc(userId).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            
           
            configGlobais.servicos = data.servicos || [];
            configGlobais.barbeiros = data.barbeiros || [];
            configGlobais.intervalo = parseInt(data.intervalo) || 60;
            
            intervaloMinutos = configGlobais.intervalo;

            renderConfigTags('barbeiros', configGlobais.barbeiros);
            renderConfigTags('servicos', configGlobais.servicos);
            
            if (data.intervalo) {
                document.getElementById('cfg-intervalo').value = data.intervalo;
            }
            
            gerarHorarios(); 
            atualizarSelectsAgendamento(data);
        }
    });
}

// Salvar o Intervalo
function salvarIntervalo() {
    const min = document.getElementById('cfg-intervalo').value;
    db.collection("usuarios").doc(getUserId()).update({ intervalo: min });
}

function atualizarSelectsAgendamento(data) {
    const selBarb = document.getElementById('ag-barb');
    const selServ = document.getElementById('ag-serv');

    if (selBarb && data.barbeiros) {
        selBarb.innerHTML = data.barbeiros.map(b => `<option value="${b}">${b}</option>`).join('');
    }

    if (selServ && data.servicos) {
        selServ.innerHTML = data.servicos.map(s => `<option value="${s.nome}">${s.nome} - R$ ${s.valor}</option>`).join('');
    }
}

// ─── MÓDULO: FINANCEIRO ──────────────────────────────────────────
function carregarFinanceiro() {
    db.collection("usuarios").doc(getUserId()).collection("financeiro")
        .onSnapshot(snapshot => {
            financeiro = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderFinanceiro();
            atualizarResumo();
        });
}

function addFinanceiro() {
    const desc = document.getElementById('fin-desc').value.trim();
    const val = parseFloat(document.getElementById('fin-val').value);
    if (!desc || isNaN(val)) return alert('Dados inválidos!');

    db.collection("usuarios").doc(getUserId()).collection("financeiro").add({
        desc, val, tipo: finTipo, 
        pag: document.getElementById('fin-pag').value,
        hora: horaAtual(), data: getHojeStr()
    });
    document.getElementById('fin-desc').value = '';
    document.getElementById('fin-val').value = '';
}

function renderFinanceiro() {
    const el = document.getElementById('lista-fin');
    const hoje_fin = financeiro.filter(f => f.data === getHojeStr());
    
    const entradas = hoje_fin.filter(f => f.tipo === 'entrada').reduce((s, f) => s + f.val, 0);
    const saidas = hoje_fin.filter(f => f.tipo === 'saida').reduce((s, f) => s + f.val, 0);

    document.getElementById('fin-entradas').textContent = fmt(entradas);
    document.getElementById('fin-saidas').textContent = fmt(saidas);
    document.getElementById('fin-saldo').textContent = fmt(entradas - saidas);

    el.innerHTML = hoje_fin.map(f => `
        <div class="card" style="margin-bottom:8px">
            <div class="list-item">
                <div class="item-info">
                    <div class="item-name">${f.desc}</div>
                    <div class="item-sub">${f.hora} • ${f.pag}</div>
                </div>
                <div class="item-actions">
                    <span style="color:${f.tipo === 'entrada' ? 'var(--green)' : 'var(--red)'}">${fmt(f.val)}</span>
                    <button class="btn-red" onclick="removerFin('${f.id}')">X</button>
                </div>
            </div>
        </div>
    `).reverse().join('');
}

function removerFin(id) {
    db.collection("usuarios").doc(getUserId()).collection("financeiro").doc(id).delete();
}

// ─── LOGICA DE NEGÓCIO E ASSINATURA ──────────────────────────────
function finalizarAtendimento(id) {
    const a = agendas.find(x => x.id == id);
    if (!a) return;

    
    const servicoCadastrado = configGlobais.servicos.find(s => s.nome === a.serv);
    const valorCobrado = servicoCadastrado ? servicoCadastrado.valor : 0;

    db.collection("usuarios").doc(getUserId()).collection("financeiro").add({
        desc: `${a.serv} (${a.nome})`,
        val: valorCobrado,
        tipo: 'entrada',
        hora: horaAtual(),
        data: getHojeStr(),
        pag: 'Agenda'
    });

    db.collection("usuarios").doc(getUserId()).collection("agendas").doc(id).update({ status: 'atendido' });
}

function bloquearSistema() {
    document.body.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;background:#111;color:#fff;text-align:center">
            <h1>Acesso Bloqueado</h1>
            <p>Sua assinatura expirou. Entre em contato com o suporte.</p>
        </div>`;
}

// ─── FUNÇÃO: SAIR (LOGOUT) ──────────────────────────────────────

function sair() {
   
    const confirmar = confirm("Deseja realmente sair do sistema?");
    
    if (confirmar) {
        auth.signOut()
            .then(() => {
                console.log("Usuário deslogado com sucesso.");
               
                window.location.href = "login.html";
            })
            .catch((error) => {
                console.error("Erro ao tentar sair:", error);
                alert("Erro ao sair do sistema. Tente novamente.");
            });
    }
}

function toggleDia(data) { 
  document.getElementById('dia-' + data).classList.toggle('aberto'); }

function formatarData(data) { 
    if (!data || data === "undefined") return "Data não informada";
    
    const dataObj = new Date(data + 'T00:00');
    
    
    if (isNaN(dataObj.getTime())) {
        return "Data Inválida"; 
    }

    return dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }); 
}

function setTipo(t) {
    finTipo = t;
    document.getElementById('fin-btn-e').className = 'fin-btn' + (t === 'entrada' ? ' active-e' : '');
    document.getElementById('fin-btn-s').className = 'fin-btn' + (t === 'saida' ? ' active-s' : '');
}

function gerarHorarios() {
    const box = document.getElementById('horarios-box');
    const input = document.getElementById('ag-data');

    console.log("BOX:", document.getElementById('horarios-box'));

    if (!box) {
        console.log("ERRO: horarios-box não existe");
        return;
    }

    if (!input) {
        console.log("ERRO: ag-data não existe");
        return;
    }

    const dataSel = input.value;

    if (!dataSel) {
        console.log("ERRO: data vazia");
        return;
    }

    box.innerHTML = '';

    const ocupados = agendas
        .filter(a => a.data === dataSel)
        .map(a => a.hora);

        const passo = configGlobais.intervalo || intervaloMinutos || 60;

    for (let min = 8 * 60; min <= 20 * 60; min += intervaloMinutos) {
        const h = String(Math.floor(min / 60)).padStart(2, '0');
        const m = String(min % 60).padStart(2, '0');
        const hora = `${h}:${m}`;

        const btn = document.createElement('button');
        btn.className = 'hora-btn';
        btn.textContent = hora;

        if (ocupados.includes(hora)) {
            btn.classList.add('ocupado');
            btn.disabled = true;
        } else {
            btn.onclick = () => selecionarHorario(hora, btn);
        }

        box.appendChild(btn);
    }
}

function selecionarHorario(hora, el) {
    document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('selected'));
    horarioSelecionado = hora;
    el.classList.add('selected');
}

function atualizarResumo() {
    const hoje = getHojeStr();
    const entradas = financeiro.filter(f => f.data === hoje && f.tipo === 'entrada');
    document.getElementById('resumo-clientes').textContent = entradas.length;
    document.getElementById('resumo-faturamento').textContent = fmt(entradas.reduce((s, f) => s + f.val, 0));
}

function getProximoCliente() {
    const agora = new Date();
    return agendas
        .filter(a => a.status !== 'atendido')
        .map(a => ({ ...a, dt: new Date(a.data + 'T' + (a.hora || '00:00')) }))
        .filter(a => a.dt >= agora)
        .sort((a, b) => a.dt - b.dt)[0];
}

function getStatusHorario(a) {
    const agora = new Date();
    const dt = new Date(a.data + 'T' + (a.hora || '00:00'));
    const diff = Math.floor((agora - dt) / 60000);
    if (diff >= 0 && diff <= 10) return { tipo: 'agora', texto: 'AGORA' };
    if (diff > 10) return { tipo: 'atrasado', texto: `Atrasado ${diff} min` };
    return null;
}

// ─── FUNÇÕES DE CONFIGURAÇÃO (BARBEIROS E SERVIÇOS) ──────────────

async function addConfigItem(campo, inputId) {
    const valor = document.getElementById(inputId).value.trim();
    if (!valor) return;

    const userId = getUserId();
    try {
        await db.collection("usuarios").doc(userId).update({
            [campo]: firebase.firestore.FieldValue.arrayUnion(valor)
        });
        document.getElementById(inputId).value = '';
        console.log(`${campo} adicionado com sucesso!`);
    } catch (error) {
        console.error("Erro ao adicionar:", error);
    }
}

async function removerConfigItem(campo, valor) {
    if (!confirm(`Deseja remover "${valor}" da lista?`)) return;

    const userId = getUserId();
    try {
        await db.collection("usuarios").doc(userId).update({
            [campo]: firebase.firestore.FieldValue.arrayRemove(valor)
        });
        console.log(`${valor} removido.`);
    } catch (error) {
        console.error("Erro ao remover:", error);
    }
}

async function addServico() {
    const nome = document.getElementById('cfg-serv-nome').value.trim();
    const valor = document.getElementById('cfg-serv-valor').value.trim();
    if (!nome || !valor) return alert("Preencha nome e valor");

    const userId = getUserId();
    const servicoObj = { nome, valor: parseFloat(valor) };

    try {
        await db.collection("usuarios").doc(userId).update({
            servicos: firebase.firestore.FieldValue.arrayUnion(servicoObj)
        });
        document.getElementById('cfg-serv-nome').value = '';
        document.getElementById('cfg-serv-valor').value = '';
    } catch (error) {
        console.error("Erro ao adicionar serviço:", error);
    }
}

async function removerServico(servicoObj) {
    if (!confirm(`Remover serviço: ${servicoObj.nome}?`)) return;

    const userId = getUserId();
    try {
        await db.collection("usuarios").doc(userId).update({
            servicos: firebase.firestore.FieldValue.arrayRemove(servicoObj)
        });
    } catch (error) {
        console.error("Erro ao remover serviço:", error);
    }
}


function renderConfigTags(tipo, lista) {
    const container = document.getElementById(`lista-cfg-${tipo}`);
    if (!container) return;

    container.innerHTML = lista.map(item => {
        if (tipo === 'servicos') {
            // Para os SERVIÇOS (com nome e preço)
            const itemJSON = JSON.stringify(item).replace(/"/g, '&quot;');
            return `
                <div class="badge-item">
                    <div class="badge-info">
                        <span class="badge-name">${item.nome}</span>
                        <span class="badge-price">R$ ${item.valor}</span>
                    </div>
                    <button class="btn-remove" onclick="removerServico(${itemJSON})">&times;</button>
                </div>`;
        } else {
            
            return `
                <div class="badge-item">
                    <span class="badge-name" style="margin-right:10px;">${item}</span>
                    <button class="btn-remove" onclick="removerConfigItem('${tipo}', '${item}')">&times;</button>
                </div>`;
        }
    }).join('');
}

async function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const tel = document.getElementById('cli-tel').value;

    if (!nome || !tel) {
        alert("Preencha os campos!");
        return;
    }

    const userId = firebase.auth().currentUser.uid;
    
    try {
        await db.collection("usuarios").doc(userId).collection("clientes").add({
            nome: nome,
            tel: tel
        });
        alert("Salvo!");
        document.getElementById('cli-nome').value = "";
        document.getElementById('cli-tel').value = "";
        listarClientes();
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }

 
}

// Função para listar
async function listarClientes() {
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) return;

    const container = document.getElementById('lista-clientes-cadastrados');
    if (!container) return;

    try {
        const snapshot = await db.collection("usuarios").doc(userId).collection("clientes").get();
        let html = "";
        
        snapshot.forEach(doc => {
            const c = doc.data();
            const id = doc.id; 

            html += `
             
  <div class="cliente-card">
        <div class="cliente-info">
            <span class="cliente-nome">${c.nome}</span>
            <span class="cliente-whatsapp">${c.tel}</span>
        </div>
        <div class="acoes-container">
            <button class="btn-acao" onclick="abrirWhatsapp('${c.tel}')" style="background: #25d366; color: black; border: none; border-radius: 8px; padding: 8px;">
                <i class="fab fa-whatsapp"></i> Zap
            </button>
            
            <button class="btn-acao btn-editar" onclick="prepararEdicaoCliente('${id}', '${c.nome}', '${c.tel}')">✎</button>
            <button class="btn-acao btn-excluir" onclick="excluirCliente('${id}')">✕</button>
        </div>
    </div>`;
    
  });
        
        container.innerHTML = html || "<p style='color: gray;'>Nenhum cliente cadastrado.</p>";
    } catch (e) {
        console.error(e);
        container.innerHTML = "Erro ao carregar lista.";
    }
}

async function excluirCliente(id) {
    if (!confirm("Tem certeza que deseja excluir este cliente? Isso não apagará os agendamentos já feitos, apenas o cadastro dele.")) return;

    const userId = firebase.auth().currentUser.uid;
    try {
        await db.collection("usuarios").doc(userId).collection("clientes").doc(id).delete();
        alert("Cliente excluído!");
        listarClientes(); // Atualiza a lista na hora
    } catch (e) {
        alert("Erro ao excluir cliente.");
    }
}

function prepararEdicaoCliente(id, nome, tel) {
    document.getElementById('cli-nome').value = nome;
    document.getElementById('cli-tel').value = tel;
    
    clienteIdEdicao = id; 
    
 
    const btn = document.querySelector("#sec-clientes button");
    if (btn) btn.innerText = "Atualizar Cadastro";
    
    // Sobe a tela para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function salvarCliente() {
    const nome = document.getElementById('cli-nome').value;
    const tel = document.getElementById('cli-tel').value;

    if (!nome || !tel) {
        alert("Preencha nome e telefone!");
        return;
    }

    const userId = firebase.auth().currentUser.uid;
    
    try {
        if (clienteIdEdicao) {
           
            await db.collection("usuarios").doc(userId).collection("clientes").doc(clienteIdEdicao).update({
                nome: nome,
                tel: tel
            });
            alert("Cadastro atualizado!");
            clienteIdEdicao = null; // Limpa o ID
            document.querySelector("#sec-clientes button").innerText = "Salvar";
        } else {
           
            await db.collection("usuarios").doc(userId).collection("clientes").add({
                nome: nome,
                tel: tel
            });
            alert("Cliente cadastrado!");
        }

        // Limpa os campos e atualiza a lista
        document.getElementById('cli-nome').value = "";
        document.getElementById('cli-tel').value = "";
        listarClientes();
        
    } catch (e) {
        alert("Erro na operação: " + e.message);
    }
}

function aplicarMascaraTelefone(input) {
    let value = input.value.replace(/\D/g, ""); // Remove tudo que não é número

    if (value.length > 11) value = value.slice(0, 11); 

    if (value.length > 10) {
        
        value = value.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, "($1) $2 $3-$4");
    } else if (value.length > 5) {
        // Formato Fixo: (37) 3221-1329
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
    } else if (value.length > 2) {
        // Formato inicial: (37) 9...
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
    } else if (value.length > 0) {
        // Apenas o DDD: (37...
        value = value.replace(/^(\d*)$/, "($1");
    }
    
    input.value = value;
}
function abrirWhatsapp(telefone, nomeCliente, servico, hora) {
    if (!telefone) {
        alert("Este cliente não tem telefone cadastrado.");
        return;
    }

    const numeroLimpo = telefone.replace(/\D/g, '');
    
    // Personalize sua mensagem aqui:
    // O %0A serve para pular linha e o %20 é o espaço.
    const mensagem = `Olá, ${nomeCliente}! %0A%0AConfirmando seu horário na Barbearia:%0A📅 Hoje%0A⏰ às ${hora}%0A✂️ Serviço: ${servico}%0A%0APodemos confirmar?`;

    const link = `https://wa.me/55${numeroLimpo}?text=${mensagem}`;
    
    window.open(link, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('ag-data');

    if (inputData) {
        gerarHorarios(); // 🔥 roda 1 vez ao abrir

        inputData.addEventListener('change', () => {
            gerarHorarios(); // 🔥 atualiza quando trocar
        });
    }
});