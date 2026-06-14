// ═══════════════════════════════════════════
//  js/auth.js — Authentication Module
// ═══════════════════════════════════════════

const Auth = {
  currentUser: null,

  init() {
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
      if (user) {
        this.currentUser = user;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'flex';
        document.getElementById('user-email-display').textContent = user.email;
        App.init();
      } else {
        this.currentUser = null;
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('app-section').style.display = 'none';
      }
    });

    // Login form submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btnText  = document.getElementById('login-btn-text');
      const errorDiv = document.getElementById('login-error');

      btnText.textContent = 'جاري الدخول...';
      errorDiv.style.display = 'none';

      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        const msgs = {
          'auth/user-not-found':  'البريد الإلكتروني غير مسجل',
          'auth/wrong-password':  'كلمة المرور غير صحيحة',
          'auth/invalid-email':   'البريد الإلكتروني غير صالح',
          'auth/too-many-requests': 'تم تجاوز عدد المحاولات، حاول لاحقاً',
          'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
        };
        errorDiv.textContent = msgs[err.code] || 'حدث خطأ أثناء تسجيل الدخول';
        errorDiv.style.display = 'block';
        btnText.textContent = 'دخول';
      }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await auth.signOut();
    });
  }
};
