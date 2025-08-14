(() => {
  const passwordInput = document.getElementById('password');
  const strengthFill = document.querySelector('.strength-fill');
  const strengthText = document.getElementById('strength-text');

  passwordInput.addEventListener('input', function () {
    const password = this.value;
    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;

    strengthFill.style.width = strength + '%';

    if (strength < 50) {
      strengthText.textContent = 'Débil';
      strengthText.className = 'text-red-400';
    } else if (strength < 75) {
      strengthText.textContent = 'Media';
      strengthText.className = 'text-yellow-400';
    } else {
      strengthText.textContent = 'Fuerte';
      strengthText.className = 'text-green-400';
    }
  });
})();