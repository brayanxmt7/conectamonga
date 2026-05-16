/* ============================================================
   CONECTA MONGA — app.js
   Toda a lógica da aplicação: estado, renderização, auth,
   publicação de eventos e utilitários.
   ============================================================ */

   'use strict';

   // ============================================================
   // ESTADO GLOBAL
   // ============================================================
   let currentUser     = null;        // empresa logada { email, name }
   let selectedCategory = 'gastronomia'; // categoria selecionada no form
   let currentFilter    = 'todos';    // filtro ativo na página de eventos
   
   // ============================================================
   // DADOS — POSTS (em produção, virão da API / banco de dados)
   // ============================================================
   const posts = [
     {
       id: 1,
       title: 'Feira Gastronômica de Mongaguá',
       desc: 'Mais de 30 expositores com gastronomia regional, frutos do mar e petiscos variados. Entrada gratuita para toda a família!',
       date: '2026-03-28', time: '10:00',
       location: 'Praça Coronel Mário, Centro',
       category: 'gastronomia',
       company: 'Associação Comercial',
       contact: '(13) 99111-2233'
     },
     {
       id: 2,
       title: 'Show de Rock na Praia',
       desc: 'Bandas locais e regionais se apresentam na orla de Mongaguá. Imperdível para os amantes da música ao vivo!',
       date: '2026-03-29', time: '19:00',
       location: 'Orla de Mongaguá',
       category: 'cultura',
       company: 'Bar do Carlão',
       contact: '(13) 99444-5566'
     },
     {
       id: 3,
       title: 'Torneio de Beach Tennis',
       desc: 'Torneio aberto para todas as categorias. Inscrições abertas até o dia anterior ao evento. Premiação para os vencedores!',
       date: '2026-04-04', time: '08:00',
       location: 'Quiosques na Praia',
       category: 'esporte',
       company: 'Arena Beach Monga',
       contact: '(13) 99777-8899'
     },
     {
       id: 4,
       title: 'Liquidação de Outono – Boutique Sol',
       desc: 'Descontos de até 60% em toda a coleção. Venha aproveitar nossas ofertas exclusivas de fim de temporada!',
       date: '2026-04-11', time: '09:00',
       location: 'Rua das Flores, 220 – Centro',
       category: 'comercio',
       company: 'Boutique Sol',
       contact: '(13) 98888-0011'
     },
     {
       id: 5,
       title: 'Noite de Frutos do Mar',
       desc: 'Jantar especial com menu completo de frutos do mar frescos direto do litoral. Reserve sua mesa com antecedência!',
       date: '2026-04-18', time: '18:30',
       location: 'Restaurante Maré Alta',
       category: 'gastronomia',
       company: 'Restaurante Maré Alta',
       contact: '(13) 99222-3344'
     },
     {
       id: 6,
       title: 'Exposição de Arte Litoral',
       desc: 'Artistas locais expõem pinturas, esculturas e fotografias com tema praiano. Entrada franca. Visitação até as 20h.',
       date: '2026-04-25', time: '14:00',
       location: 'Centro Cultural Municipal',
       category: 'cultura',
       company: 'Ateliê Areia & Arte',
       contact: '(13) 99333-4455'
     },
     {
       id: 7,
       title: 'Corrida Orla de Mongaguá 5k',
       desc: 'Corrida de rua aberta para amadores e profissionais ao longo da orla. Kit do corredor incluso na inscrição.',
       date: '2026-05-03', time: '07:00',
       location: 'Orla – Ponto de Largada: Quiosque Central',
       category: 'esporte',
       company: 'Mongaguá Esportes',
       contact: '(13) 99555-6677'
     },
     {
       id: 8,
       title: 'Feira de Artesanato e Economia Criativa',
       desc: 'Artesãos e empreendedores locais com produtos exclusivos. Bijuterias, cerâmica, tecidos e muito mais.',
       date: '2026-05-10', time: '09:00',
       location: 'Calçadão da Praia',
       category: 'comercio',
       company: 'Rede de Artesãos Monga',
       contact: '(13) 99888-0022'
     },
   ];
   
   // ============================================================
   // EXPIRAÇÃO DE EVENTOS
   // ============================================================
   
   /**
    * Verifica se um post já passou da data/hora.
    * @param {object} post
    * @returns {boolean}
    */
   function isExpired(post) {
     const eventDateTime = new Date(post.date + 'T' + (post.time || '23:59') + ':00');
     return eventDateTime < new Date();
   }
   
   /**
    * Retorna apenas os posts ainda válidos (não expirados).
    * @param {object[]} list
    * @returns {object[]}
    */
   function getActivePosts(list) {
     return list.filter(p => !isExpired(p));
   }
   
   /**
    * Remove do array global os posts expirados e re-renderiza se necessário.
    */
   function purgeExpiredPosts() {
     const before = posts.length;
     for (let i = posts.length - 1; i >= 0; i--) {
       if (isExpired(posts[i])) posts.splice(i, 1);
     }
     if (posts.length !== before) {
       renderAllPosts();
       renderFeatured();
     }
   }
   
   // Purga automática a cada 60 segundos
   setInterval(purgeExpiredPosts, 60_000);
   
   // ============================================================
   // WHATSAPP
   // ============================================================
   
   /**
    * Monta a URL wa.me com mensagem pré-preenchida.
    * Adiciona o DDI +55 automaticamente se não estiver presente.
    * @param {string} contact  Número no formato (13) 99999-0000
    * @param {string} eventTitle  Nome do evento para incluir na mensagem
    * @returns {string} URL completa do WhatsApp
    */
   function buildWhatsAppUrl(contact, eventTitle) {
     const digits = contact.replace(/\D/g, '');
     const number = digits.startsWith('55') ? digits : '55' + digits;
     const msg = encodeURIComponent(
       `Olá! Vi o evento *${eventTitle}* no Conecta Monga e gostaria de mais informações. 😊`
     );
     return `https://wa.me/${number}?text=${msg}`;
   }
   
   // ============================================================
   // RENDERIZAÇÃO DOS CARDS
   // ============================================================
   
   /** Mapa de categoria → label exibido no badge */
   const catLabel = {
     gastronomia: '🍽 Gastronomia',
     cultura:     '🎭 Cultura',
     esporte:     '⚽ Esporte',
     comercio:    '🏪 Comércio',
     outros:      '✨ Outros',
   };
   
   /**
    * Gera o HTML completo de um card de evento.
    * @param {object} p  Post / evento
    * @returns {string} HTML do card
    */
   function renderPostCard(p) {
     // Formata a data para exibição
     const [year, month, day] = p.date.split('-');
     const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
     const dateStr = `${parseInt(day)} ${months[parseInt(month) - 1]}. ${year}`;
   
     // Badge de urgência
     const diffDays = Math.ceil((new Date(p.date + 'T23:59:00') - new Date()) / 86_400_000);
     let urgencyBadge = '';
     if (diffDays === 0) {
       urgencyBadge = `<span style="display:inline-block;background:#fde8d4;color:#7a2d00;font-size:0.68rem;font-weight:700;padding:2px 9px;border-radius:100px;margin-left:8px;letter-spacing:.04em;">🔥 Hoje</span>`;
     } else if (diffDays === 1) {
       urgencyBadge = `<span style="display:inline-block;background:#fde8d4;color:#7a2d00;font-size:0.68rem;font-weight:700;padding:2px 9px;border-radius:100px;margin-left:8px;letter-spacing:.04em;">🔥 Amanhã</span>`;
     } else if (diffDays <= 3) {
       urgencyBadge = `<span style="display:inline-block;background:#d4e4fd;color:#0a3090;font-size:0.68rem;font-weight:700;padding:2px 9px;border-radius:100px;margin-left:8px;letter-spacing:.04em;">📅 Em ${diffDays} dias</span>`;
     }
   
     return `
       <div class="post-card">
         <div class="post-card-banner cat-${p.category}"></div>
         <div class="post-card-body">
           <span class="post-category cat-${p.category}">${catLabel[p.category] || p.category}</span>${urgencyBadge}
           <div class="post-title">${p.title}</div>
           <div class="post-desc">${p.desc}</div>
           <div class="post-meta">
             <div class="post-meta-row">
               <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
               ${dateStr}
             </div>
             <div class="post-meta-row">
               <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
               ${p.time.replace(':', 'h')}
             </div>
             ${p.location ? `
             <div class="post-meta-row">
               <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
               ${p.location}
             </div>` : ''}
           </div>
         </div>
         <div class="post-footer">
           <div class="post-company">${p.company}<small>Mongaguá – SP</small></div>
           ${p.contact ? `
           <a class="btn-whatsapp"
              href="${buildWhatsAppUrl(p.contact, p.title)}"
              target="_blank"
              rel="noopener noreferrer">
             <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
               <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
               <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L.057 23.885a.5.5 0 0 0 .606.63l6.281-1.634A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.5-5.203-1.373l-.374-.217-3.878 1.009 1.036-3.773-.239-.389A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
             </svg>
             WhatsApp
           </a>` : ''}
         </div>
       </div>`;
   }
   
   /**
    * Renderiza todos os posts filtrados na página "Eventos".
    */
   function renderAllPosts() {
     const active   = getActivePosts(posts);
     const filtered = currentFilter === 'todos'
       ? active
       : active.filter(p => p.category === currentFilter);
   
     const el = document.getElementById('all-posts');
   
     if (filtered.length === 0) {
       el.innerHTML = `
         <div class="empty-state" style="grid-column:1/-1">
           <svg viewBox="0 0 24 24" fill="currentColor">
             <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
           </svg>
           <h3>Nenhum evento nessa categoria</h3>
           <p>Tente outro filtro ou volte mais tarde.</p>
         </div>`;
     } else {
       el.innerHTML = filtered.map(renderPostCard).join('');
     }
   }
   
   /**
    * Renderiza os 3 primeiros eventos ativos na seção de destaques (home).
    */
   function renderFeatured() {
     const active = getActivePosts(posts);
     const el     = document.getElementById('featured-posts');
   
     if (active.length === 0) {
       el.innerHTML = `
         <div class="empty-state" style="grid-column:1/-1">
           <svg viewBox="0 0 24 24" fill="currentColor">
             <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
           </svg>
           <h3>Nenhum evento em destaque</h3>
           <p>Novos eventos serão publicados em breve.</p>
         </div>`;
     } else {
       el.innerHTML = active.slice(0, 3).map(renderPostCard).join('');
     }
   }
   
   // ============================================================
   // FILTROS
   // ============================================================
   
   /**
    * Filtra os posts pela categoria e atualiza o tab ativo.
    * @param {string} cat   Slug da categoria
    * @param {Element} btn  Botão de tab clicado
    */
   function filterPosts(cat, btn) {
     currentFilter = cat;
     document.querySelectorAll('.filter-tabs .tab').forEach(t => t.classList.remove('active'));
     btn.classList.add('active');
     renderAllPosts();
   }
   
   // ============================================================
   // NAVEGAÇÃO
   // ============================================================
   
   /**
    * Exibe uma página e esconde as demais.
    * @param {string} name  Sufixo do id da página (ex: 'home', 'posts')
    */
   function showPage(name) {
     document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
     document.getElementById('page-' + name).classList.add('active');
     window.scrollTo(0, 0);
     if (name === 'posts') renderAllPosts();
     if (name === 'home')  renderFeatured();
   }
   
   /**
    * Exige autenticação antes de ir para a página de novo post.
    */
   function requireAuth() {
     if (currentUser) {
       showPage('new-post');
     } else {
       showToast('⚠️ Faça login para publicar um evento');
       showPage('login');
     }
   }
   
   // ============================================================
   // AUTENTICAÇÃO
   // ============================================================
   
   /**
    * Realiza o login com e-mail e senha (simulado — sem backend).
    * Em produção substituir pela chamada POST /api/login.
    */
   function doLogin() {
     const email = document.getElementById('login-email').value.trim();
     const pass  = document.getElementById('login-pass').value;
   
     if (!email || !pass)        { showToast('⚠️ Preencha e-mail e senha'); return; }
     if (!email.includes('@'))   { showToast('⚠️ E-mail inválido'); return; }
   
     currentUser = { email, name: email.split('@')[0] };
     showToast('✅ Login realizado com sucesso!');
     setTimeout(() => showPage('new-post'), 700);
   }
   
   /**
    * Realiza o cadastro de empresa (simulado — sem backend).
    * Em produção substituir pela chamada POST /api/cadastro.
    */
   function doRegister() {
     const name  = document.getElementById('reg-name').value.trim();
     const cnpj  = document.getElementById('reg-cnpj').value.trim();
     const seg   = document.getElementById('reg-segment').value;
     const email = document.getElementById('reg-email').value.trim();
     const pass  = document.getElementById('reg-pass').value;
     const pass2 = document.getElementById('reg-pass2').value;
   
     if (!name || !cnpj || !seg || !email || !pass) {
       showToast('⚠️ Preencha todos os campos obrigatórios'); return;
     }
     if (cnpj.replace(/\D/g, '').length < 14) {
       showToast('⚠️ CNPJ inválido — obrigatório para cadastro'); return;
     }
     if (!email.includes('@')) { showToast('⚠️ E-mail inválido'); return; }
     if (pass.length < 8)      { showToast('⚠️ Senha deve ter no mínimo 8 caracteres'); return; }
     if (pass !== pass2)       { showToast('⚠️ Senhas não conferem'); return; }
   
     currentUser = { email, name };
     showToast('🎉 Empresa cadastrada com sucesso!');
     setTimeout(() => showPage('new-post'), 700);
   }
   
   // ============================================================
   // PUBLICAR EVENTO
   // ============================================================
   
   /**
    * Seleciona a categoria no formulário de novo evento.
    * @param {Element} btn  Pill clicada
    * @param {string}  cat  Slug da categoria
    */
   function selectCat(btn, cat) {
     document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));
     btn.classList.add('selected');
     selectedCategory = cat;
   }
   
   /**
    * Valida e publica um novo evento no array global.
    * Em produção substituir pela chamada POST /api/eventos.
    */
   function publishPost() {
     const name    = document.getElementById('evt-name').value.trim();
     const date    = document.getElementById('evt-date').value;
     const time    = document.getElementById('evt-time').value;
     const loc     = document.getElementById('evt-location').value.trim();
     const desc    = document.getElementById('evt-desc').value.trim();
     const contact = document.getElementById('evt-contact').value.trim();
   
     if (!name) { showToast('⚠️ Nome do evento é obrigatório'); return; }
     if (!date) { showToast('⚠️ Data do evento é obrigatória'); return; }
     if (!time) { showToast('⚠️ Horário do evento é obrigatório'); return; }
   
     const eventDateTime = new Date(date + 'T' + time + ':00');
     if (eventDateTime < new Date()) {
       showToast('⚠️ Não é possível publicar um evento com data/hora já passada'); return;
     }
   
     posts.unshift({
       id:       Date.now(),
       title:    name,
       desc:     desc || 'Evento em Mongaguá',
       date,
       time,
       location: loc,
       category: selectedCategory,
       company:  currentUser?.name || 'Empresa',
       contact,
     });
   
     purgeExpiredPosts();
     showToast('🎉 Evento publicado com sucesso!');
   
     // Limpa o formulário
     ['evt-name', 'evt-date', 'evt-time', 'evt-location', 'evt-desc', 'evt-contact']
       .forEach(id => { document.getElementById(id).value = ''; });
   
     setTimeout(() => { currentFilter = 'todos'; showPage('posts'); }, 800);
   }
   
   // ============================================================
   // UTILITÁRIOS
   // ============================================================
   
   /**
    * Aplica máscara de CNPJ enquanto o usuário digita.
    * Formato: 00.000.000/0000-00
    * @param {HTMLInputElement} el
    */
   function maskCNPJ(el) {
     let v = el.value.replace(/\D/g, '').substring(0, 14);
     if      (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
     else if (v.length > 8)  v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/,        '$1.$2.$3/$4');
     else if (v.length > 5)  v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/,               '$1.$2.$3');
     else if (v.length > 2)  v = v.replace(/^(\d{2})(\d{0,3})/,                       '$1.$2');
     el.value = v;
   }
   
   /**
    * Exibe uma notificação toast temporária na tela.
    * @param {string} msg  Mensagem a exibir
    */
   function showToast(msg) {
     const t = document.getElementById('toast');
     document.getElementById('toast-msg').textContent = msg;
     t.classList.add('show');
     setTimeout(() => t.classList.remove('show'), 3200);
   }
   
   // ============================================================
   // INICIALIZAÇÃO
   // ============================================================
   renderFeatured();