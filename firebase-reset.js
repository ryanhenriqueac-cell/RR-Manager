import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  confirmPasswordReset,
  getAuth,
  verifyPasswordResetCode
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const config = window.firebaseConfig || {};
const params = new URLSearchParams(window.location.search);
const actionCode = params.get('oobCode') || '';
const mode = params.get('mode') || '';
const form = document.getElementById('resetPasswordForm');
const description = document.getElementById('resetDescription');
const message = document.getElementById('resetPasswordMessage');
const emailElement = document.getElementById('resetAccountEmail');
const submitButton = form.querySelector('button[type=submit]');

function showError(text) {
  form.hidden = true;
  description.textContent = 'Não foi possível usar este link.';
  message.textContent = text;
  message.className = 'reset-password-message is-error';
}

if (!config.apiKey || mode !== 'resetPassword' || !actionCode) {
  showError('O link está incompleto. Solicite uma nova recuperação de senha.');
} else {
  const auth = getAuth(initializeApp(config, 'rr-manager-password-reset'));
  auth.languageCode = 'pt-BR';

  verifyPasswordResetCode(auth, actionCode)
    .then((email) => {
      emailElement.textContent = email;
      description.textContent = 'Crie uma nova senha para continuar usando o RR Manager.';
      form.hidden = false;
    })
    .catch(() => showError('Este link expirou ou já foi utilizado. Volte ao login e solicite outro.'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('resetNewPassword').value;
    const confirmation = document.getElementById('resetConfirmPassword').value;
    message.className = 'reset-password-message';

    if (password.length < 8) {
      message.textContent = 'Use uma senha com pelo menos 8 caracteres.';
      message.classList.add('is-error');
      return;
    }
    if (password !== confirmation) {
      message.textContent = 'As senhas digitadas não são iguais.';
      message.classList.add('is-error');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Salvando...';
    try {
      await confirmPasswordReset(auth, actionCode, password);
      form.hidden = true;
      description.textContent = 'Senha alterada com sucesso!';
      message.textContent = 'Agora você já pode entrar no RR Manager com sua nova senha.';
      message.classList.add('is-success');
      document.querySelector('.reset-login-link').classList.add('is-highlighted');
    } catch (error) {
      message.textContent = error?.code?.includes('weak-password')
        ? 'Escolha uma senha mais forte.'
        : 'Não foi possível salvar. Solicite um novo link e tente novamente.';
      message.classList.add('is-error');
      submitButton.disabled = false;
      submitButton.textContent = 'Salvar nova senha';
    }
  });
}
