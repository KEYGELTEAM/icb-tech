/**
 * ICB Tech Tool - Production Controller
 * Desarrollado por: Keyner Mayorga 'KNR'
 * Optimizado para Xiaomi Redmi 13C (Helio G85 / 4GB RAM)
 */

'use strict';

const AUTH_CREDENTIALS = {
  user: 'icbtech7',
  pass: 'icbtech7'
};

const AppState = {
  config: null,
  currentZoom: 1.0,
  activeDoc: null,
  storageKeyContract: 'icb_contract_number',
  storageKeyAuth: 'icb_auth_session_active'
};

const DOM = {
  authScreen: document.getElementById('authScreen'),
  appWrapper: document.getElementById('appWrapper'),
  authForm: document.getElementById('authForm'),
  authUsername: document.getElementById('authUsername'),
  authPassword: document.getElementById('authPassword'),
  btnLogout: document.getElementById('btnLogout'),
  assistBar: document.getElementById('assistBar'),
  btnAssistBack: document.getElementById('btnAssistBack'),
  docsContainer: document.getElementById('docsListContainer'),
  masterDataContainer: document.getElementById('masterDataContainer'),
  felMonth: document.getElementById('felMonth'),
  felYear: document.getElementById('felYear'),
  felContract: document.getElementById('felContract'),
  felConceptOutput: document.getElementById('felConceptOutput'),
  btnCopyConcept: document.getElementById('btnCopyConcept'),
  btnCopyAmount: document.getElementById('btnCopyAmount'),
  btnCopyNitProvial: document.getElementById('btnCopyNitProvial'),
  btnOpenSat: document.getElementById('btnOpenSat'),
  btnOpenVerificador: document.getElementById('btnOpenVerificador'),
  btnOpenCgc: document.getElementById('btnOpenCgc'),
  pdfModal: document.getElementById('pdfModal'),
  pdfFrame: document.getElementById('pdfFrame'),
  pdfViewport: document.getElementById('pdfViewport'),
  modalDocTitle: document.getElementById('modalDocTitle'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  toast: document.getElementById('toast'),
  navTabs: document.querySelectorAll('.nav-tab'),
  viewPanels: document.querySelectorAll('.view-panel')
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  initServiceWorker();
  initAuthentication();
  await loadConfiguration();
  initRouting();
  initFelModule();
  initModalVisor();
  initAssistBar();
});

// Control de Acceso y Sesión (Gatekeeper)
function initAuthentication() {
  const isAuth = localStorage.getItem(AppState.storageKeyAuth) === 'true';

  if (isAuth) {
    DOM.authOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  } else {
    DOM.authOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  DOM.authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredUser = DOM.authUsername.value.trim();
    const enteredPass = DOM.authPassword.value.trim();

    if (enteredUser === AUTH_CREDENTIALS.user && enteredPass === AUTH_CREDENTIALS.pass) {
      localStorage.setItem(AppState.storageKeyAuth, 'true');
      DOM.authOverlay.classList.add('hidden');
      document.body.style.overflow = '';
      DOM.authForm.reset();
      hapticFeedback(50);
      showToast('Bienvenido a ICB Tech Tool');
    } else {
      hapticFeedback(100);
      showToast('Usuario o clave incorrecta');
      DOM.authPassword.value = '';
      DOM.authPassword.focus();
    }
  });

  DOM.btnLogout.addEventListener('click', () => {
    localStorage.removeItem(AppState.storageKeyAuth);
    DOM.authOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    hapticFeedback(50);
    showToast('Sesión finalizada');
  });
}

// 1. Registro de Service Worker PWA Offline-First
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('ICB SW Registrado:', reg.scope))
      .catch(err => console.error('Error registrando ICB SW:', err));
  }
}

// 2. Carga de Base de Datos Maestra
async function loadConfiguration() {
  try {
    const response = await fetch('data/config.json');
    AppState.config = await response.json();
    renderBoveda();
    renderMasterData();
  } catch (error) {
    console.error('Error cargando config.json:', error);
    showToast('Error cargando base de datos');
  }
}

// 3. Sistema SPA de Hash Routing
function initRouting() {
  const handleRoute = () => {
    const hash = window.location.hash.replace('#', '') || 'boveda';
    
    DOM.viewPanels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === `view-${hash}`) {
        panel.classList.add('active');
      }
    });

    DOM.navTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.getAttribute('data-view') === hash) {
        tab.classList.add('active');
      }
    });

    window.scrollTo(0, 0);
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

// 4. Renderizado de Bóveda y Manejadores Documentales
function renderBoveda() {
  if (!AppState.config || !AppState.config.docs) return;

  DOM.docsContainer.innerHTML = '';
  
  AppState.config.docs.forEach(doc => {
    const card = document.createElement('article');
    card.className = 'card doc-card';
    card.innerHTML = `
      <div class="doc-info">
        <h3>${escapeHtml(doc.titulo)}</h3>
        <p>${escapeHtml(doc.desc)}</p>
      </div>
      <div class="doc-actions">
        <button class="btn btn-cyan btn-preview" data-id="${doc.id}">👁️ VER</button>
        <button class="btn btn-green btn-share" data-id="${doc.id}">🟢 WHATSAPP</button>
        <a class="btn btn-outline btn-download" href="docs/${doc.file}" download="ICB_${doc.slug.toUpperCase().replace(/-/g, '_')}_IRRAEL_CANO.pdf">
          ⬇️ DESCARGAR PDF
        </a>
      </div>
    `;

    card.querySelector('.btn-preview').addEventListener('click', () => openPdfModal(doc));
    card.querySelector('.btn-share').addEventListener('click', () => shareDocViaWhatsApp(doc));

    DOM.docsContainer.appendChild(card);
  });
}

// 5. Visor Modal con Zoom Matricial CSS puro (Ultra Ahorro de RAM)
function initModalVisor() {
  DOM.btnZoomIn.addEventListener('click', () => {
    if (AppState.currentZoom < 2.5) {
      AppState.currentZoom += 0.25;
      applyZoom();
    }
  });

  DOM.btnZoomOut.addEventListener('click', () => {
    if (AppState.currentZoom > 1.0) {
      AppState.currentZoom -= 0.25;
      applyZoom();
    }
  });

  DOM.btnCloseModal.addEventListener('click', closePdfModal);
}

function openPdfModal(doc) {
  AppState.activeDoc = doc;
  AppState.currentZoom = 1.0;
  applyZoom();

  DOM.modalDocTitle.textContent = doc.titulo;
  DOM.pdfFrame.src = `docs/${doc.file}`;
  DOM.pdfModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePdfModal() {
  DOM.pdfModal.classList.remove('active');
  DOM.pdfFrame.src = '';
  document.body.style.overflow = '';
}

function applyZoom() {
  DOM.pdfViewport.style.transform = `scale(${AppState.currentZoom})`;
  hapticFeedback(20);
}

// 6. Integración Web Share API con Blob Renaming en Caliente
async function shareDocViaWhatsApp(doc) {
  hapticFeedback(50);
  const normalizedFileName = `ICB_${doc.slug.toUpperCase().replace(/-/g, '_')}_IRRAEL_CANO.pdf`;
  const pdfUrl = `docs/${doc.file}`;

  try {
    showToast('Preparando documento...');
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const file = new File([blob], normalizedFileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: doc.titulo,
        text: `Expediente Irrael Cano Boteo - ${doc.titulo}`
      });
      showToast('Compartido con éxito');
    } else {
      const tempLink = document.createElement('a');
      tempLink.href = URL.createObjectURL(blob);
      tempLink.download = normalizedFileName;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(tempLink.href);
      showToast('Descarga iniciada (Share no compatible)');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error al compartir:', error);
      showToast('Error procesando archivo');
    }
  }
}

// 7. Módulo Mensual FEL & DTE
function initFelModule() {
  const currentMonthIndex = new Date().getMonth();
  DOM.felMonth.selectedIndex = currentMonthIndex;
  DOM.felYear.value = new Date().getFullYear();

  const savedContract = localStorage.getItem(AppState.storageKeyContract);
  if (savedContract) {
    DOM.felContract.value = savedContract;
  } else if (AppState.config && AppState.config.profile) {
    DOM.felContract.value = AppState.config.profile.contrato_default;
  }

  const updateConcept = () => {
    const month = DOM.felMonth.value;
    const year = DOM.felYear.value;
    const contract = DOM.felContract.value.trim();

    localStorage.setItem(AppState.storageKeyContract, contract);

    const conceptText = `HONORARIOS PERCIBIDOS POR LA PRESTACIÓN DE SERVICIOS TÉCNICOS A LA DIRECCIÓN GENERAL DE PROTECCIÓN Y SEGURIDAD VIAL DEL MINISTERIO DE COMUNICACIONES, INFRAESTRUCTURA Y VIVIENDA, CORRESPONDIENTE AL MES DE ${month} DE ${year}, SEGÚN CONTRATO ADMINISTRATIVO ${contract}.`;
    DOM.felConceptOutput.value = conceptText;
  };

  DOM.felMonth.addEventListener('change', updateConcept);
  DOM.felYear.addEventListener('input', updateConcept);
  DOM.felContract.addEventListener('input', updateConcept);

  DOM.btnCopyConcept.addEventListener('click', () => {
    copyToClipboard(DOM.felConceptOutput.value, '¡Concepto copiado con éxito!');
  });

  DOM.btnCopyAmount.addEventListener('click', () => {
    copyToClipboard('6500.00', 'Monto Q 6,500.00 copiado');
  });

  DOM.btnCopyNitProvial.addEventListener('click', () => {
    copyToClipboard('6374921-8', 'NIT PROVIAL copiado');
  });

  setTimeout(updateConcept, 200);
}

// 8. Renderizado del Copiloto 029 (Datos Maestros)
function renderMasterData() {
  if (!AppState.config || !AppState.config.profile) return;
  const p = AppState.config.profile;

  const fields = [
    { label: 'Nombre Completo', value: p.nombre },
    { label: 'NIT Personal', value: p.nit },
    { label: 'DPI / CUI', value: p.dpi },
    { label: 'Licencia de Conducir', value: `${p.licencia} (${p.licencia_tipo})` },
    { label: 'Fecha de Nacimiento', value: p.nacimiento },
    { label: 'Estado Civil', value: p.estado_civil },
    { label: 'Profesión / Oficio', value: p.profesion },
    { label: 'Teléfono Móvil', value: p.telefono },
    { label: 'Correo Electrónico', value: p.correo },
    { label: 'Dirección Domicilio', value: p.direccion }
  ];

  DOM.masterDataContainer.innerHTML = '';

  fields.forEach(f => {
    const row = document.createElement('div');
    row.className = 'data-row';
    row.innerHTML = `
      <div style="max-width: 75%;">
        <div class="data-label">${escapeHtml(f.label)}</div>
        <div class="data-value">${escapeHtml(f.value)}</div>
      </div>
      <button class="btn-copy-small">COPIAR</button>
    `;

    row.querySelector('.btn-copy-small').addEventListener('click', () => {
      copyToClipboard(f.value, `${f.label} copiado`);
    });

    DOM.masterDataContainer.appendChild(row);
  });
}

// 9. Barra de Asistencia Institucional para Portales
function initAssistBar() {
  const launchExternalPortal = (url) => {
    DOM.assistBar.classList.add('active');
    document.body.style.paddingTop = '60px';
    window.open(url, '_blank');
  };

  DOM.btnOpenSat.addEventListener('click', () => {
    launchExternalPortal('https://portal.sat.gob.gt/portal/');
  });

  DOM.btnOpenVerificador.addEventListener('click', () => {
    launchExternalPortal('https://portal.sat.gob.gt/portal/verificador-facturas/');
  });

  DOM.btnOpenCgc.addEventListener('click', () => {
    launchExternalPortal('https://portal.contraloria.gob.gt/');
  });

  DOM.btnAssistBack.addEventListener('click', () => {
    DOM.assistBar.classList.remove('active');
    document.body.style.paddingTop = '0px';
    window.focus();
    showToast('Regresaste a ICB Tech Tool');
  });
}

// 10. Utilitarios (Clipboard, Háptico, Toasts)
function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        hapticFeedback(50);
        showToast(successMessage);
      })
      .catch(() => fallbackCopyText(text, successMessage));
  } else {
    fallbackCopyText(text, successMessage);
  }
}

function fallbackCopyText(text, successMessage) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    hapticFeedback(50);
    showToast(successMessage);
  } catch (err) {
    showToast('No se pudo copiar automáticamente');
  }
  document.body.removeChild(textArea);
}

function hapticFeedback(ms) {
  if ('vibrate' in navigator) {
    navigator.vibrate(ms);
  }
}

function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 2500);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
