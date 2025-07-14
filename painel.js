
// --- Gerenciamento de Usuários ---
function pegarUsuarios() {
  return JSON.parse(localStorage.getItem('usuarios') || '{}');
}
function salvarUsuarios(usuarios) {
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
}
function cadastrar() {
  const usuario = document.getElementById('cad-usuario').value.trim();
  const senha = document.getElementById('cad-senha').value.trim();
  const alerta = document.getElementById('cad-alerta');
  if (!usuario || !senha) {
    alerta.className = 'alerta error';
    alerta.innerText = 'Preencha usuário e senha para cadastro.';
    return;
  }
  let usuarios = pegarUsuarios();
  if (usuarios[usuario]) {
    alerta.className = 'alerta error';
    alerta.innerText = 'Usuário já existe. Escolha outro.';
    return;
  }
  usuarios[usuario] = senha;
  salvarUsuarios(usuarios);
  alerta.className = 'alerta success';
  alerta.innerText = 'Usuário cadastrado com sucesso! Agora faça login.';
  document.getElementById('cad-usuario').value = '';
  document.getElementById('cad-senha').value = '';
}
function login() {
  const usuario = document.getElementById('login-usuario').value.trim();
  const senha = document.getElementById('login-senha').value.trim();
  const alerta = document.getElementById('login-alerta');
  const usuarios = pegarUsuarios();
  if (usuarios[usuario] && usuarios[usuario] === senha) {
    alerta.className = 'alerta success';
    alerta.innerText = 'Login realizado com sucesso!';
    localStorage.setItem('usuarioLogado', usuario);
    setTimeout(() => mostrarPainel(), 500);
  } else {
    alerta.className = 'alerta error';
    alerta.innerText = 'Usuário ou senha incorretos.';
  }
}
function logout() {
  localStorage.removeItem('usuarioLogado');
  location.reload();
}
window.onload = function() {
  const usuarioLogado = localStorage.getItem('usuarioLogado');
  if (usuarioLogado) {
    mostrarPainel();
  }
};

// --- Painel Financeiro ---
let chart = null;
function mostrarPainel() {
  document.getElementById('login-section').style.display = 'none';
  const painel = document.getElementById('painel-section');
  painel.style.display = 'block';
  painel.innerHTML = `
    <button id="btnLogout" onclick="logout()">Sair</button>
    <button id="btnLimpar" onclick="limparTudo()">Limpar Tudo</button>
    <h1 style="color:#FFD700">Painel Financeiro</h1>
    <label>💰 Renda mensal: R$ <input type="number" id="renda" step="0.01"></label><br><br>
    <label>💸 Pagamento mensal possível: R$ <input type="number" id="pagamento" step="0.01"></label><br><br>
    <div class="acoes">
      <button class="btn" onclick="adicionarLinha()">+ Adicionar Dívida</button>
      <button class="btn" onclick="analisar()">Analisar Situação</button>
      <button class="btn" onclick="exportarPDF()">📄 Exportar PDF</button>
    </div>
    <table id="tabela-dividas">
      <thead><tr><th>Tipo</th><th>Valor Total (R$)</th><th>Parcelas</th><th>Valor Parcela</th><th>Ação</th></tr></thead>
      <tbody></tbody>
    </table>
    <div class="barra"><div class="progresso" id="progresso"></div></div>
    <div id="resumo" style="margin-top:10px;"></div>
    <canvas id="grafico"></canvas>
  `;
  carregarDadosUsuario();
  analisar();
}
function adicionarLinha(tipo = '', valorTotal = '', parcelas = '') {
  const tbody = document.querySelector('#tabela-dividas tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="tipo" value="${tipo}"></td>
    <td><input class="valor-total" type="number" value="${valorTotal}" step="0.01"></td>
    <td><input class="parcelas" type="number" value="${parcelas}" min="1"></td>
    <td class="valor-parcela">R$ 0,00</td>
    <td><button class="btn" onclick="removerLinha(this)">Remover</button></td>`;
  tbody.appendChild(tr);
  tr.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      salvarDadosUsuario();
      analisar();
    });
  });
  salvarDadosUsuario();
  analisar();
}
function removerLinha(botao) {
  botao.closest('tr').remove();
  salvarDadosUsuario();
  analisar();
}
function analisar() {
  const renda = parseFloat(document.getElementById('renda').value) || 0;
  const pagamento = parseFloat(document.getElementById('pagamento').value) || 0;
  let totalParcelas = 0, labels = [], dados = [], parcelasTotal = 0;
  document.querySelectorAll('#tabela-dividas tbody tr').forEach(linha => {
    const tipo = linha.querySelector('.tipo').value;
    const valorTotal = parseFloat(linha.querySelector('.valor-total').value) || 0;
    const parcelas = parseInt(linha.querySelector('.parcelas').value) || 1;
    const valorParcela = valorTotal / parcelas;
    linha.querySelector('.valor-parcela').innerText = 'R$ ' + valorParcela.toFixed(2);
    if (tipo && valorTotal > 0) {
      totalParcelas += valorParcela;
      labels.push(tipo);
      dados.push(valorParcela);
      parcelasTotal += parcelas;
    }
  });
  const sobra = renda - totalParcelas;
  const percentual = renda ? (totalParcelas / renda) * 100 : 0;
  document.getElementById('progresso').style.width = Math.min(100, percentual) + '%';
  document.getElementById('resumo').innerHTML = `
    <p>Total mensal em parcelas: R$ ${totalParcelas.toFixed(2)}</p>
    <p>Total de parcelas restantes: ${parcelasTotal}</p>
    <p>Comprometimento da renda: ${percentual.toFixed(1)}%</p>
    <p>Sobra mensal: R$ ${sobra.toFixed(2)}</p>
  `;
  const ctx = document.getElementById('grafico').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'pie',
    data: { labels: labels, datasets: [{ data: dados, backgroundColor: ['#FFD700', '#FF6347', '#ADFF2F', '#1E90FF', '#FF69B4'] }] },
    options: { plugins: { legend: { labels: { color: '#fff' } } } }
  });
}
function exportarPDF() {
  html2pdf().from(document.getElementById('painel-section')).save('painel-financeiro.pdf');
}
function salvarDadosUsuario() {
  const usuario = localStorage.getItem('usuarioLogado');
  if (!usuario) return;
  const dados = {
    renda: document.getElementById('renda').value,
    pagamento: document.getElementById('pagamento').value,
    dividas: []
  };
  document.querySelectorAll('#tabela-dividas tbody tr').forEach(tr => {
    dados.dividas.push({
      tipo: tr.querySelector('.tipo').value,
      valorTotal: tr.querySelector('.valor-total').value,
      parcelas: tr.querySelector('.parcelas').value
    });
  });
  localStorage.setItem(`dados_${usuario}`, JSON.stringify(dados));
}
function carregarDadosUsuario() {
  const usuario = localStorage.getItem('usuarioLogado');
  if (!usuario) return;
  const dados = JSON.parse(localStorage.getItem(`dados_${usuario}`) || '{}');
  document.getElementById('renda').value = dados.renda || '';
  document.getElementById('pagamento').value = dados.pagamento || '';
  const tbody = document.querySelector('#tabela-dividas tbody');
  tbody.innerHTML = '';
  (dados.dividas || []).forEach(d => adicionarLinha(d.tipo, d.valorTotal, d.parcelas));
}
function limparTudo() {
  if (confirm('Tem certeza que deseja limpar todos os dados?')) {
    const usuario = localStorage.getItem('usuarioLogado');
    localStorage.removeItem(`dados_${usuario}`);
    mostrarPainel();
  }
}
