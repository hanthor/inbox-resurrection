// Phase 0 static mocks: screen switching, Done+Undo toast, pin filter, snooze pick.
const screens = ['list', 'bundle', 'snooze'];
document.querySelectorAll('.mocktabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.mocktabs button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    screens.forEach((s) => document.getElementById('screen-' + s).classList.toggle('hidden', s !== b.dataset.screen));
  };
});
document.querySelectorAll('[data-goto]').forEach((el) => {
  el.onclick = (e) => {
    if (e.target.closest('.done')) return;
    document.querySelector('[data-screen="bundle"]').click();
  };
});

const toast = document.getElementById('toast');
let toastTimer = null;
function showToast(text) {
  toast.innerHTML = '';
  toast.append(text);
  const undo = document.createElement('button');
  undo.textContent = 'UNDO';
  undo.onclick = () => { toast.hidden = true; };
  toast.append(undo);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 7000);
}
document.querySelectorAll('.done').forEach((b) => {
  b.onclick = () => showToast(`Marked "${b.dataset.name}" done.`);
});
document.querySelector('.sweep').onclick = () => showToast('Swept Travel bundle.');

const pinBtn = document.getElementById('pinToggle');
let pinnedOnly = false;
pinBtn.onclick = () => {
  pinnedOnly = !pinnedOnly;
  pinBtn.style.opacity = pinnedOnly ? '1' : '0.45';
  document.querySelectorAll('#screen-list .thread').forEach((t) => {
    t.style.display = pinnedOnly && !t.classList.contains('pinned') ? 'none' : '';
  });
};

document.querySelectorAll('.grid button').forEach((b) => {
  b.onclick = () => {
    const out = document.getElementById('snoozeOut');
    out.textContent = `Snoozed until ${b.dataset.s}.`;
    out.hidden = false;
  };
});
