/* ========================================================
   script.js  —  Lógica de navegación entre pantallas
   ======================================================== */

'use strict';

/* ----------------------------------------------------------
   1. GENERADOR DE PARTÍCULAS DE FONDO
   ---------------------------------------------------------- */
(function generateParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const symbols = ['✦', '✧', '◆', '·', '⋆', '◇', '⬡', '△'];
  const count   = 22;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.classList.add('particle');
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    el.style.setProperty('--dur',   `${7 + Math.random() * 8}s`);
    el.style.setProperty('--delay', `${Math.random() * 10}s`);
    el.style.left   = `${Math.random() * 100}%`;
    el.style.bottom = '-5%';
    el.style.color  = `hsl(${240 + Math.random() * 60}deg, 75%, ${65 + Math.random() * 20}%)`;
    container.appendChild(el);
  }
})();

/* ----------------------------------------------------------
   2. NAVEGACIÓN ENTRE PANTALLAS
   ---------------------------------------------------------- */

/** Pantalla actualmente visible */
let currentScreenId = 'screen-initial';

/**
 * Transiciona a la pantalla destino con una animación suave.
 * @param {string} targetId  — id del elemento <section> destino
 */
function showScreen(targetId) {
  if (targetId === currentScreenId) return;

  const current = document.getElementById(currentScreenId);
  const target  = document.getElementById(targetId);

  if (!current || !target) {
    console.warn('showScreen: pantalla no encontrada —', targetId);
    return;
  }

  /* — Paso 1: iniciar salida de la pantalla actual — */
  current.classList.add('exit');
  current.classList.remove('active');

  /* — Paso 2: breve pausa para que el CSS de salida se aplique — */
  /* Usamos requestAnimationFrame doble para garantizar el repaint */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {

      /* — Paso 3: mostrar la pantalla destino — */
      target.classList.add('active');
      target.classList.remove('exit');

      /* — Paso 4: limpiar clase "exit" de la pantalla anterior
              una vez que la transición CSS haya terminado — */
      current.addEventListener(
        'transitionend',
        () => current.classList.remove('exit'),
        { once: true }
      );

      currentScreenId = targetId;
    });
  });
}
