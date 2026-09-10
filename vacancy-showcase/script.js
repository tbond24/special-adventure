const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.path-card, .feature-grid article, .manifesto, .problem .narrow').forEach((el) => {
  el.classList.add('reveal');
  observer.observe(el);
});
