// src/main.js
(function() {
    function onReady() {
        // Тема
        var savedTheme = localStorage.getItem(App.config.THEME_KEY);
        if (savedTheme) {
            App.events.applyTheme(savedTheme);
        } else {
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            App.events.applyTheme(prefersDark ? 'dark' : 'light');
        }

        // Supabase
        App.supabase = supabase.createClient(
            'https://qbjlccdqaudyvedpysil.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiamxjY2RxYXVkeXZlZHB5c2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjQ5MDEsImV4cCI6MjA5Mjk0MDkwMX0.dpdlcOQLtc6adA-l2z_ksJ3b6b6pLTQviLrKtxuF-kU'
        );

        // Запрашиваем постоянное хранилище (PWA)
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then(function(isPersisted) {
                console.log('Persistent storage:', isPersisted ? '✅ granted' : '❌ denied');
            });
        }

        App.store.initFromLocalStorage();

        // ======================= АВТОРИЗАЦИЯ =======================
        var authPanel = document.getElementById('auth-panel');
        if (authPanel) authPanel.style.display = 'block';

        // Вкладки
        var tabLogin = document.getElementById('tab-login');
        var tabSocial = document.getElementById('tab-social');
        var authLoginDiv = document.getElementById('auth-login');
        var authSocialDiv = document.getElementById('auth-social');

        function switchAuthTab(tab) {
            if (tab === 'login') {
                tabLogin.classList.add('active'); tabSocial.classList.remove('active');
                authLoginDiv.style.display = 'block'; authSocialDiv.style.display = 'none';
            } else {
                tabSocial.classList.add('active'); tabLogin.classList.remove('active');
                authSocialDiv.style.display = 'block'; authLoginDiv.style.display = 'none';
            }
        }
        if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
        if (tabSocial) tabSocial.addEventListener('click', () => switchAuthTab('social'));

        // Google
        var googleBtn = document.getElementById('supabase-auth-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', function() {
                App.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin }
                }).catch(function(err) { App.toast('Ошибка входа через Google', 'error'); });
            });
        }

        // Apple (закомментирован в HTML, код готов)
        var appleBtn = document.getElementById('apple-auth-btn');
        if (appleBtn) {
            appleBtn.addEventListener('click', function() {
                App.supabase.auth.signInWithOAuth({
                    provider: 'apple',
                    options: { redirectTo: window.location.origin }
                }).catch(function(err) { App.toast('Ошибка входа через Apple', 'error'); });
            });
        }

        // ===== Логин + пароль =====
        var loginForm = document.getElementById('login-form');
        var loginMessage = document.getElementById('login-message');
        var passwordConfirmLabel = document.getElementById('password-confirm-label');
        var passwordConfirmInput = document.getElementById('password-confirm-input');

        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var formData = new FormData(loginForm);
                var username = formData.get('username').trim();
                var password = formData.get('password');
                if (!username || !password) {
                    App.toast('Введите логин и пароль', 'error');
                    return;
                }
                var email = username + '@vesta.internal';
                App.supabase.auth.signInWithPassword({ email: email, password: password })
                    .then(function({ error }) {
                        if (error) loginMessage.textContent = 'Неверный логин или пароль.';
                    });
            });

            var signUpBtn = document.getElementById('login-sign-up-btn');
            if (signUpBtn) {
                signUpBtn.addEventListener('click', function() {
                    passwordConfirmLabel.style.display = 'block';
                    passwordConfirmInput.style.display = 'block';
                    passwordConfirmInput.required = true;

                    var formData = new FormData(loginForm);
                    var username = formData.get('username').trim();
                    var password = formData.get('password');
                    var passwordConfirm = formData.get('password_confirm');
                    if (!username || !password || !passwordConfirm) {
                        App.toast('Все поля обязательны', 'error');
                        return;
                    }
                    if (password !== passwordConfirm) {
                        App.toast('Пароли не совпадают', 'error');
                        return;
                    }
                    if (password.length < 6) {
                        App.toast('Пароль должен содержать минимум 6 символов', 'error');
                        return;
                    }

                    var email = username + '@vesta.internal';
                    App.supabase.auth.signUp({
                        email: email,
                        password: password,
                        options: { data: { username: username } }
                    }).then(function({ error }) {
                        if (error) {
                            App.toast('Ошибка регистрации: ' + error.message, 'error');
                        } else {
                            App.toast('Регистрация успешна! Выполняем вход...', 'success');
                            App.supabase.auth.signInWithPassword({ email: email, password: password })
                                .then(function({ error }) {
                                    if (!error) {
                                        passwordConfirmLabel.style.display = 'none';
                                        passwordConfirmInput.style.display = 'none';
                                        passwordConfirmInput.required = false;
                                        loginForm.reset();
                                        loginMessage.textContent = '';

                                        // Генерация резервных кодов после успешной регистрации
                                        App.supabase.auth.getUser().then(function({ data: { user } }) {
                                            if (user) generateAndShowRecoveryCodes(user.id, username);
                                        });
                                    } else {
                                        App.toast('Регистрация прошла, но вход не удался. Войдите вручную.', 'warning');
                                    }
                                });
                        }
                    });
                });
            }
        }

        // ===== Восстановление доступа =====
        var forgotLink = document.getElementById('forgot-access-link');
        var recoveryBlock = document.getElementById('recovery-options');
        var recoveryMsg = document.getElementById('recovery-message');
        if (forgotLink) {
            forgotLink.addEventListener('click', function(e) {
                e.preventDefault();
                recoveryBlock.style.display = 'block';
            });
        }

        // Telegram
        var btnTelegram = document.getElementById('recover-telegram');
        if (btnTelegram) btnTelegram.addEventListener('click', () => recoverViaTelegram(recoveryMsg));

        // Резервный код
        var btnCode = document.getElementById('recover-code');
        if (btnCode) btnCode.addEventListener('click', () => recoverViaRecoveryCode(recoveryMsg));

        // Google
        var btnRecoverGoogle = document.getElementById('recover-google');
        if (btnRecoverGoogle) {
            btnRecoverGoogle.addEventListener('click', function() {
                App.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin }
                });
            });
        }

       
// Кнопка установки PWA
var deferredPrompt;
var installBtn = document.getElementById('pwa-install-btn');

// Если приложение уже запущено в режиме standalone – скрываем кнопку
if (window.matchMedia('(display-mode: standalone)').matches) {
    if (installBtn) installBtn.style.display = 'none';
}

window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn && !window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', function() {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function(choiceResult) {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User installed the app');
                }
                deferredPrompt = null;
                installBtn.style.display = 'none';
            });
        });
    }
});

window.addEventListener('appinstalled', function() {
    console.log('App installed');
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
});

// Если браузер не отправляет beforeinstallprompt, через 3 секунды покажем кнопку-заглушку
setTimeout(function() {
    if (installBtn && !deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', function() {
            alert('Чтобы установить приложение, откройте меню браузера и выберите "Добавить на главный экран" (или "Установить").');
        });
    }
}, 3000);

        // ===== Firebase Cloud Messaging =====
        var messaging;
        try {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
                firebase.initializeApp({
                    apiKey: "AIzaSyCKz1GKDdqxtK6NyLQAZ84QqUUCaqTQDWQ",
                    authDomain: "car-k3eper.firebaseapp.com",
                    projectId: "car-k3eper",
                    storageBucket: "car-k3eper.firebasestorage.app",
                    messagingSenderId: "826833638199",
                    appId: "1:826833638199:web:647fedbe3eae5b605240b2"
                });
            }
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                messaging = firebase.messaging();
                window.requestPushPermission = function() {
                    Notification.requestPermission().then(function(permission) {
                        if (permission === 'granted') {
                            messaging.getToken({ vapidKey: 'BEUVrsWau5E4NvAwwAKmkjfK8yoDVntppWmZ2IdqseLVxuNNy47bV7eOLVYDmZ1b2P3F27eRqJLoAjW58Fh0tyY' }).then(function(currentToken) {
                                if (currentToken) {
                                    console.log('FCM token:', currentToken);
                                    App.supabase.auth.getUser().then(function({ data: { user } }) {
                                        if (!user) return;
                                        App.supabase.from('push_subscriptions').upsert({
                                            user_id: user.id,
                                            player_id: currentToken,
                                            updated_at: new Date().toISOString()
                                        }, { onConflict: 'user_id' }).then(function() {
                                            console.log('FCM token saved');
                                            updatePushUI(true);
                                        });
                                    });
                                }
                            }).catch(console.error);
                        }
                    });
                };
                var subscribePushBtn = document.getElementById('subscribe-push-btn');
                if (subscribePushBtn) {
                    subscribePushBtn.addEventListener('click', function() {
                        if (typeof window.requestPushPermission === 'function') {
                            window.requestPushPermission();
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('Firebase init skipped:', e);
        }

        // Кнопка отписки от уведомлений
        var unsubscribePushBtn = document.getElementById('unsubscribe-push-btn');
        if (unsubscribePushBtn) {
            unsubscribePushBtn.addEventListener('click', async function() {
                try {
                    if (messaging) {
                        await messaging.deleteToken();
                    }
                } catch(e) {
                    console.warn('Token delete failed:', e);
                }
                var { data: { user } } = await App.supabase.auth.getUser();
                if (user) {
                    await App.supabase.from('push_subscriptions').delete().eq('user_id', user.id);
                }
                updatePushUI(false);
                App.toast('Подписка на push отключена', 'success');
            });
        }

        function updatePushUI(isActive) {
            var pushStatus = document.getElementById('push-status');
            var subBtn = document.getElementById('subscribe-push-btn');
            var unsubBtn = document.getElementById('unsubscribe-push-btn');

            if (pushStatus) pushStatus.textContent = isActive ? '✅ Push активны' : 'Push-уведомления не настроены';
            if (subBtn) subBtn.style.display = isActive ? 'none' : 'inline-block';
            if (unsubBtn) unsubBtn.style.display = isActive ? 'inline-block' : 'none';
        }

        // ===== Кнопка «Выйти» =====
        var logoutSidebarBtn = document.getElementById('sidebar-logout');
        if (logoutSidebarBtn) logoutSidebarBtn.addEventListener('click', () => App.supabase.auth.signOut());
        var logoutDrawerBtn = document.getElementById('drawer-logout');
        if (logoutDrawerBtn) logoutDrawerBtn.addEventListener('click', () => App.supabase.auth.signOut());

        // ======================= СЕССИЯ (с Realtime) =======================
        App.supabase.auth.onAuthStateChange(function(event, session) {
            if (session) {
                if (authPanel) authPanel.style.display = 'none';
                var dp = document.getElementById('data-panel');
                if (dp) dp.style.display = 'block';

                // Показываем логин пользователя
                App.supabase.auth.getUser().then(function({ data: { user } }) {
                    var display = document.getElementById('username-display');
                    if (display && user && user.user_metadata && user.user_metadata.username) {
                        display.textContent = '👤 ' + user.user_metadata.username;
                    }
                });

                App.store.initFromLocalStorage();

                if (event === 'PASSWORD_RECOVERY') {
                    var newPassword = prompt('Введите новый пароль (минимум 6 символов):');
                    if (newPassword && newPassword.length >= 6) {
                        App.supabase.auth.updateUser({ password: newPassword }).then(function({ error }) {
                            if (error) App.toast('Ошибка при смене пароля', 'error');
                            else {
                                App.toast('Пароль успешно изменён!', 'success');
                                window.location.hash = '';
                                window.location.search = '';
                            }
                        });
                    }
                }

                // Восстанавливаем статус Push
                App.supabase.auth.getUser().then(function({ data: { user } }) {
                    if (!user) return;
                    App.supabase.from('push_subscriptions').select('player_id').eq('user_id', user.id).maybeSingle().then(function({ data }) {
                        updatePushUI(!!data);
                    });
                });

                App.store.loadCars().then(function() {
                    App.ui.pages.renderCarSelector();
                    App.ui.pages.checkPendingInvites();
                    if (App.store.activeCarId) {
                        // Подписываемся на Realtime-обновления для выбранного авто
                        if (App.realtime && App.realtime.subscribeToCar) {
                            App.realtime.subscribeToCar(App.store.activeCarId);
                        }
                        App.storage.loadAllData().then(function() {
                            if (typeof App.renderAll === 'function') App.renderAll();
                        });
                    } else {
                        if (typeof App.renderAll === 'function') App.renderAll();
                    }
                });
            } else {
                if (authPanel) authPanel.style.display = 'block';
                var dp = document.getElementById('data-panel');
                if (dp) dp.style.display = 'none';
                var carContainer = document.getElementById('car-selector-container');
                if (carContainer) carContainer.innerHTML = '';
                var usernameDisplay = document.getElementById('username-display');
                if (usernameDisplay) usernameDisplay.textContent = '';
                // Отписываемся от всех Realtime-каналов
                if (App.realtime && App.realtime.unsubscribeAll) {
                    App.realtime.unsubscribeAll();
                }
                App.store.operations = [];
                App.store.fuelLog = [];
                App.store.tireLog = [];
                App.store.parts = [];
                App.store.serviceRecords = [];
                App.store.mileageHistory = [];
                App.store.saveToLocalStorage();
                if (typeof App.renderAll === 'function') App.renderAll();
            }
        });

        App.supabase.auth.getSession().then(function({ data: { session } }) {
            if (session) {
                if (authPanel) authPanel.style.display = 'none';
                var dp = document.getElementById('data-panel');
                if (dp) dp.style.display = 'block';

                App.store.initFromLocalStorage();

                // Показываем логин пользователя
                App.supabase.auth.getUser().then(function({ data: { user } }) {
                    var display = document.getElementById('username-display');
                    if (display && user && user.user_metadata && user.user_metadata.username) {
                        display.textContent = '👤 ' + user.user_metadata.username;
                    }
                });

                if (window.location.search.includes('reset=1')) {
                    var newPassword = prompt('Введите новый пароль (минимум 6 символов):');
                    if (newPassword && newPassword.length >= 6) {
                        App.supabase.auth.updateUser({ password: newPassword }).then(function({ error }) {
                            if (error) App.toast('Ошибка при смене пароля', 'error');
                            else {
                                App.toast('Пароль успешно изменён!', 'success');
                                window.location.search = '';
                            }
                        });
                    }
                }

                // Восстанавливаем статус Push
                App.supabase.auth.getUser().then(function({ data: { user } }) {
                    if (!user) return;
                    App.supabase.from('push_subscriptions').select('player_id').eq('user_id', user.id).maybeSingle().then(function({ data }) {
                        updatePushUI(!!data);
                    });
                });

                App.store.loadCars().then(function() {
                    App.ui.pages.renderCarSelector();
                    App.ui.pages.checkPendingInvites();
                    if (App.store.activeCarId) {
                        // Подписываемся на Realtime-обновления для выбранного авто
                        if (App.realtime && App.realtime.subscribeToCar) {
                            App.realtime.subscribeToCar(App.store.activeCarId);
                        }
                        App.storage.loadAllData().then(function() {
                            if (typeof App.renderAll === 'function') App.renderAll();
                        });
                    } else {
                        if (typeof App.renderAll === 'function') App.renderAll();
                    }
                });
            }
        });

        // ===== Остальные инициализации =====
        App.events.init();
        App.events.switchToTab('dashboard');

        window.addEventListener('load', function() {
            setTimeout(App.initIcons, 200);
        });
    }

    // ===== Функции восстановления =====
    async function recoverViaTelegram(msgEl) {
        var username = prompt('Введите ваш логин:');
        if (!username) return;
        var { data: users, error } = await App.supabase.rpc('get_user_by_username', { p_username: username });
        if (error || !users || users.length === 0) { msgEl.textContent = 'Пользователь не найден'; return; }
        var userData = users[0];
        var { data: settings } = await App.supabase.from('settings')
            .select('telegram_chat_id, telegram_token')
            .eq('user_id', userData.id)
            .single();
        if (!settings || !settings.telegram_chat_id || !settings.telegram_token) {
            msgEl.textContent = 'Telegram не привязан. Используйте другой способ.'; return;
        }
        var code = Math.floor(100000 + Math.random() * 900000).toString();
        await App.supabase.from('recovery_codes').insert({ user_id: userData.id, code_hash: code });
        await fetch(`https://api.telegram.org/bot${settings.telegram_token}/sendMessage`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: settings.telegram_chat_id, text: `Код для сброса пароля: ${code}` })
        });
        var input = prompt('Код отправлен в Telegram. Введите его:');
        if (!input) return;
        var { data: codeRow } = await App.supabase.from('recovery_codes')
            .select('*').eq('user_id', userData.id).eq('code_hash', input).eq('used', false).maybeSingle();
        if (!codeRow) { msgEl.textContent = 'Неверный код'; return; }
        await App.supabase.from('recovery_codes').update({ used: true }).eq('id', codeRow.id);

        var newPassword = prompt('Введите новый пароль (минимум 6 символов):');
        if (!newPassword || newPassword.length < 6) {
            msgEl.textContent = 'Пароль должен содержать не менее 6 символов';
            return;
        }

        var res = await fetch('https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/admin-reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id, newPassword: newPassword })
        });

        if (res.ok) {
            msgEl.textContent = 'Пароль успешно изменён! Теперь войдите с новым паролем.';
        } else {
            var errText = await res.text();
            msgEl.textContent = 'Ошибка при сбросе: ' + errText;
        }
    }

    async function recoverViaRecoveryCode(msgEl) {
        var username = prompt('Введите ваш логин:');
        if (!username) return;

        var { data: users, error } = await App.supabase.rpc('get_user_by_username', { p_username: username });
        if (error || !users || users.length === 0) {
            msgEl.textContent = 'Пользователь не найден';
            return;
        }
        var userData = users[0];

        var code = prompt('Введите резервный код:');
        if (!code) return;

        var { data: codeRow, error: codeError } = await App.supabase.from('recovery_codes')
            .select('*')
            .eq('user_id', userData.id)
            .eq('code_hash', code)
            .eq('used', false)
            .maybeSingle();

        if (codeError || !codeRow) {
            msgEl.textContent = 'Неверный код';
            return;
        }

        await App.supabase.from('recovery_codes').update({ used: true }).eq('id', codeRow.id);

        var newPassword = prompt('Введите новый пароль (минимум 6 символов):');
        if (!newPassword || newPassword.length < 6) {
            msgEl.textContent = 'Пароль должен содержать не менее 6 символов';
            return;
        }

        var res = await fetch('https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/admin-reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id, newPassword: newPassword })
        });

        if (res.ok) {
            msgEl.textContent = 'Пароль успешно изменён! Теперь войдите с новым паролем.';
        } else {
            var errText = await res.text();
            msgEl.textContent = 'Ошибка при сбросе: ' + errText;
        }
    }

    async function generateAndShowRecoveryCodes(userId, username) {
        var codes = [];
        for (var i = 0; i < 8; i++) {
            var code = Array.from({length: 8}, () => Math.floor(Math.random() * 10)).join('');
            codes.push(code);
            await App.supabase.from('recovery_codes').insert({
                user_id: userId,
                code_hash: code
            });
        }
        var msg = 'Ваши резервные коды для восстановления доступа (сохраните их!):\n\n' +
                  codes.join('\n');
        alert(msg);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})();