window.AB.ready.then((s) => {
  document.getElementById('mail-link').href = `mailto:${s.email || ''}`;
});
