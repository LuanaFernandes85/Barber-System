// ─── CONFIGURAÇÃO ─
const firebaseConfig = {
  apiKey: "AIzaSyCYxkZyOoRFVA4NrI2Qp-if4gQ6GlUougs",
  authDomain: "barber-system1.firebaseapp.com",
  projectId: "barber-system1",
  storageBucket: "barber-system1.firebasestorage.app", 
  messagingSenderId: "521949233412", 
  appId: "1:521949233412:web:27078b6f152079d426d051" 
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// ─── VERIFICAÇÃO DE ACESSO ─────────────────────────────────────
const adminEmail = "luana8512.12@gmail.com";

auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email !== "luana8512.12@gmail.com") {
          
            window.location.href = "index.html";
        } else {
         
            carregarClientes();
        }
    } else {
        window.location.href = "login.html";
    }
});


// ─── FUNÇÕES PRINCIPAIS ────────────────────────────────────────

function carregarClientes() {
  db.collection("usuarios").onSnapshot(snapshot => {
    const lista = document.getElementById("lista");
    if (!lista) return;
    
    lista.innerHTML = "";

    if (snapshot.empty) {
      lista.innerHTML = "<p>Nenhum barbeiro cadastrado.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const user = doc.data();
      const id = doc.id;

     
      const validadeStr = user.validade;
      const hojeStr = new Date().toISOString().split('T')[0];

      const validade = validadeStr ? new Date(validadeStr) : null;
      const hoje = new Date();

     const ativo = validadeStr && validadeStr >= hojeStr;

      lista.innerHTML += `
        <div class="card">
          <div>
            <strong>${user.email || "Sem email"}</strong><br>
            <small style="color: #94a3b8">ID: ${id}</small><br>
            Validade: ${validade ? validade.toLocaleDateString('pt-BR') : "Não definido"}<br>
            Status: <span class="${ativo ? 'status-ok' : 'status-exp'}">
              ${ativo ? '● Ativo' : '● Vencido/Bloqueado'}
            </span>
          </div>

          <div>
            <button class="btn btn-green" onclick="renovar('${id}')">
              +30 dias
            </button>
            <button class="btn btn-red" onclick="bloquear('${id}')">
              Bloquear
            </button>
            <button class="btn btn-red" onclick="excluirCliente('${id}', '${user.email || ""}')">
              Excluir
            </button>
          </div>
        </div>
      `;
    });
  }, error => {
    console.error("Erro ao carregar clientes: ", error);
    if(error.code === 'permission-denied') {
        alert("Erro: Você não tem permissão no Firestore para ler esses dados.");
    }
  });
}

function renovar(id) {
  const novaData = new Date();
  novaData.setDate(novaData.getDate() + 30);

  db.collection("usuarios").doc(id).update({
    validade: novaData.toISOString().split('T')[0] // Salva apenas a data YYYY-MM-DD
  }).then(() => alert("Plano renovado com sucesso!"));
}

function bloquear(id) {
  if(!confirm("Deseja realmente bloquear este acesso?")) return;

  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  db.collection("usuarios").doc(id).update({
    validade: ontem.toISOString().split('T')[0]
  }).then(() => alert("Usuário bloqueado!"));
}

function excluirCliente(id, email) {
  const confirmar = confirm(
    `Tem certeza que deseja excluir o cliente ${email}?\n\n` +
    "Essa ação excluirá o cadastro do cliente no Firestore e não poderá ser desfeita."
  );

  if (!confirmar) return;

  db.collection("usuarios").doc(id).delete()
    .then(() => {
      alert("Cadastro excluído com sucesso!");
    })
    .catch((error) => {
      console.error("Erro ao excluir cliente:", error);
      alert("Não foi possível excluir o cliente. Verifique as permissões do Firebase.");
    });
}
      
// Função para o Admin deslogar
function sairAdmin() {
    if (confirm("Deseja realmente sair do painel administrativo?")) {
        auth.signOut()
            .then(() => {
                console.log("Admin deslogado.");
                window.location.href = "login.html"; // Redireciona para o login
            })
            .catch((error) => {
                console.error("Erro ao sair:", error);
                alert("Erro ao deslogar.");
            });
    }
}
