console.log("LOGIN JS CARREGADO");
const firebaseConfig = {
  apiKey: "AIzaSyCYxkZyOoRFVA4NrI2Qp-if4gQ6GlUougs",
  authDomain: "barber-system1.firebaseapp.com",
  projectId: "barber-system1",
  storageBucket: "barber-system1.firebasestorage.app",
  messagingSenderId: "521949233412",
  appId: "1:521949233412:web:27078b6f152079d426d051"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();


// 🔐 LOGIN
function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  if (!email || !senha) {
    alert("Campos vazios!");
    return;
  }
     

  auth.signInWithEmailAndPassword(email, senha)
    .then((userCredential) => {
      console.log("Login realizado!");
      if (userCredential.user.email === "luana8512.12@gmail.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "index.html";
      }
    })
    .catch((error) => {
      console.error("Código do Erro:", error.code);
      console.error("Mensagem:", error.message);
      alert("Falha no login: " + error.message);
    });
}


// 🆕 CADASTRO (COM PLANO AUTOMÁTICO)
function fazerCadastro() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value.trim();

  if (!email || !senha) {
    mostrarErro("Preencha email e senha");
    return;
  }

  if (!email.includes("@")) {
    mostrarErro("Email inválido");
    return;
  }

  if (senha.length < 6) {
    mostrarErro("Senha deve ter no mínimo 6 caracteres");
    return;
  }

  auth.createUserWithEmailAndPassword(email, senha)
    .then(userCredential => {

      const user = userCredential.user;

      // 🔥 CRIA VALIDADE (7 DIAS GRÁTIS)
      const validade = new Date();
      validade.setDate(validade.getDate() + 7);

      return db.collection("usuarios").doc(user.uid).set({
        email: email,
        validade: validade.toISOString().split('T')[0]
      });

    })
    .then(() => {
      alert('Conta criada com sucesso!');
      window.location.href = "index.html";
    })
    .catch(err => {
      console.error("ERRO REAL:", err);
      mostrarErro(traduzirErro(err.code));
    });
}


// ❌ MOSTRAR ERRO
function mostrarErro(msg) {
  document.getElementById('erro').textContent = msg;
}


// 🔄 TRADUZIR ERROS
function traduzirErro(code) {
    if (!code) return 'Erro desconhecido';
    
    // Adicione ou verifique esta linha:
    if (code === 'auth/email-already-in-use') return 'Este e-mail já está em uso por outra conta.';
    if (code === 'auth/user-not-found') return 'Usuário não encontrado.';
    if (code === 'auth/wrong-password') return 'Senha incorreta.';
    if (code === 'auth/weak-password') return 'A senha deve ter pelo menos 6 caracteres.';
    if (code === 'auth/invalid-email') return 'O formato do e-mail é inválido.';
    
    return code; 
}